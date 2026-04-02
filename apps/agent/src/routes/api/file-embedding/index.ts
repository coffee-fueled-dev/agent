import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  createPartFromBase64,
  createPartFromText,
  GoogleGenAI,
} from "@google/genai";
import { api } from "@very-coffee/backend/api";
import { $ } from "bun";
import { ConvexHttpClient } from "convex/browser";
import {
  getConvexUrl,
  getEmbeddingCacheDbPath,
  getFileEmbeddingSecret,
  getGoogleApiKey,
  getTempDir,
} from "./env.js";

const embeddingModel = "gemini-embedding-2-preview";
const sharedSecret = getFileEmbeddingSecret();
const convex = new ConvexHttpClient(getConvexUrl());
const cacheDbPath = getEmbeddingCacheDbPath();

mkdirSync(dirname(cacheDbPath), { recursive: true });
const cacheDb = new Database(cacheDbPath, { create: true });
cacheDb.run("PRAGMA journal_mode = WAL;");
cacheDb.run(
  "CREATE TABLE IF NOT EXISTS file_cache (hash TEXT PRIMARY KEY, result TEXT NOT NULL, created_at INTEGER NOT NULL)",
);
const cacheGet = cacheDb.query<{ result: string }, { $hash: string }>(
  "SELECT result FROM file_cache WHERE hash = $hash",
);
const cacheSet = cacheDb.query(
  "INSERT OR REPLACE INTO file_cache (hash, result, created_at) VALUES ($hash, $result, $created_at)",
);

type ProcessedChunk = {
  text?: string;
  embedding: number[];
};

type ProcessedFileResult = {
  retrievalText: string;
  lexicalText?: string;
  chunks: ProcessedChunk[];
};

type EmbedJob = {
  processId: string;
  fileUrl: string;
  title?: string;
  text?: string;
  mimeType: string;
  fileName?: string | null;
  contentHash?: string;
};

function buildRetrievalText(args: {
  text?: string;
  title?: string;
  fileName?: string | null;
  mimeType: string;
}) {
  const text = args.text?.trim();
  if (text) return text;
  return (
    [args.title, args.fileName, args.mimeType]
      .filter(Boolean)
      .join(" ")
      .trim() || "binary file"
  );
}

function createGenAIClient() {
  const apiKey = getGoogleApiKey();
  return new GoogleGenAI(apiKey ? { apiKey } : {});
}

async function reportCompletion(job: EmbedJob, result: ProcessedFileResult) {
  await convex.action(api.files.completeFileProcess, {
    secret: sharedSecret,
    jobId: job.processId,
    retrievalText: result.retrievalText,
    lexicalText: result.lexicalText,
    chunks: result.chunks,
  });
}

async function reportFailure(job: EmbedJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : "File embedding worker failed";
  try {
    await convex.mutation(api.files.failFileProcess, {
      secret: sharedSecret,
      jobId: job.processId,
      error: message,
    });
  } catch (reportError) {
    console.error("Failed to report embedding failure", reportError);
  }
}

function tempDownloadPath(job: EmbedJob) {
  return `${getTempDir()}/file-embedding-${job.processId}-${Date.now()}`;
}

function isTextLikeMime(mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/yaml" ||
    mimeType === "text/markdown" ||
    mimeType === "application/javascript"
  );
}

function splitTextContent(text: string) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const chunks = paragraphs.length > 0 ? paragraphs : [text.trim()];
  return chunks.flatMap((chunk) => {
    if (chunk.length <= 4000) return [chunk];
    const out: string[] = [];
    for (let start = 0; start < chunk.length; start += 4000) {
      out.push(chunk.slice(start, start + 4000));
    }
    return out;
  });
}

async function embedTextChunk(client: GoogleGenAI, text: string) {
  const response = await client.models.embedContent({
    model: embeddingModel,
    contents: [createPartFromText(text)],
  });
  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Google did not return any text embeddings");
  }
  return values;
}

async function downloadFile(job: EmbedJob) {
  const path = tempDownloadPath(job);
  const result =
    await $`curl -fsSL --retry 3 --retry-connrefused ${job.fileUrl} > ${Bun.file(path)}`
      .nothrow()
      .quiet();
  if (result.exitCode !== 0) {
    const errorText =
      new TextDecoder().decode(result.stderr).trim() ||
      `curl exited with code ${result.exitCode}`;
    throw new Error(`File download failed: ${errorText}`);
  }
  return path;
}

async function processEmbeddingJob(job: EmbedJob) {
  let tempFilePath: string | undefined;
  try {
    if (job.contentHash) {
      const cached = cacheGet.get({ $hash: job.contentHash });
      if (cached) {
        await reportCompletion(
          job,
          JSON.parse(cached.result) as ProcessedFileResult,
        );
        return;
      }
    }

    tempFilePath = await downloadFile(job);
    const client = createGenAIClient();
    const result = isTextLikeMime(job.mimeType)
      ? await (async (): Promise<ProcessedFileResult> => {
          const text = (await Bun.file(tempFilePath).text()).trim();
          const retrievalText = text || buildRetrievalText(job);
          const chunkTexts = splitTextContent(retrievalText);
          if (chunkTexts.length === 0) {
            throw new Error("No text chunks were produced");
          }
          const chunks = await Promise.all(
            chunkTexts.map(async (chunkText) => ({
              text: chunkText,
              embedding: await embedTextChunk(client, chunkText),
            })),
          );
          return { retrievalText, lexicalText: retrievalText, chunks };
        })()
      : await (async (): Promise<ProcessedFileResult> => {
          const retrievalText = buildRetrievalText(job);
          const fileBytes = await Bun.file(tempFilePath).arrayBuffer();
          const fileBase64 = Buffer.from(fileBytes).toString("base64");
          const embeddingResponse = await client.models.embedContent({
            model: embeddingModel,
            contents: [
              createPartFromBase64(fileBase64, job.mimeType),
              createPartFromText(retrievalText),
            ],
          });
          const chunks = (embeddingResponse.embeddings ?? []).flatMap(
            (embedding) =>
              embedding?.values?.length
                ? [{ embedding: embedding.values }]
                : [],
          );
          if (chunks.length === 0) {
            throw new Error("Google did not return any embeddings");
          }
          return { retrievalText, chunks };
        })();

    if (job.contentHash) {
      cacheSet.run({
        $hash: job.contentHash,
        $result: JSON.stringify(result),
        $created_at: Date.now(),
      });
    }

    await reportCompletion(job, result);
  } catch (error) {
    console.error("Embedding job failed", error);
    await reportFailure(job, error);
  } finally {
    if (tempFilePath) {
      await $`rm -f ${tempFilePath}`.nothrow().quiet();
    }
  }
}

function readJob(payload: unknown): EmbedJob {
  if (!payload || typeof payload !== "object") {
    throw new Error("Expected a JSON object");
  }
  const { jobId, fileUrl, title, text, mimeType, fileName, contentHash } =
    payload as Record<string, unknown>;
  if (
    typeof jobId !== "string" ||
    typeof fileUrl !== "string" ||
    typeof mimeType !== "string"
  ) {
    throw new Error("Missing required embedding job fields");
  }
  return {
    processId: jobId,
    fileUrl,
    title: typeof title === "string" ? title : undefined,
    text: typeof text === "string" ? text : undefined,
    mimeType,
    fileName:
      typeof fileName === "string"
        ? fileName
        : fileName === null
          ? null
          : undefined,
    contentHash: typeof contentHash === "string" ? contentHash : undefined,
  };
}

export const fileEmbeddingRoute = {
  POST: async (request: Request) => {
    if (request.headers.get("x-binary-embedding-secret") !== sharedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      const job = readJob(await request.json());
      queueMicrotask(() => {
        void processEmbeddingJob(job);
      });
      return Response.json(
        { accepted: true, processId: job.processId },
        { status: 202 },
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid embedding job",
        },
        { status: 400 },
      );
    }
  },
};
