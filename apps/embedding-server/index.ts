import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import {
  createPartFromBase64,
  createPartFromText,
  GoogleGenAI,
} from "@google/genai";
import { $ } from "bun";
import {
  cacheDbPath,
  getConvexBaseUrl,
  getGoogleApiKey,
  getTempDir,
  port,
  sharedSecret,
} from "./env";

const embeddingModel = "gemini-embedding-2-preview";
const backendApi = anyApi as unknown as {
  files: {
    completeFileProcess: Parameters<ConvexHttpClient["action"]>[0];
    failFileProcess: Parameters<ConvexHttpClient["mutation"]>[0];
  };
};

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

function buildRetrievalText(args: {
  text?: string;
  title?: string;
  fileName?: string | null;
  mimeType: string;
}) {
  const text = args.text?.trim();
  if (text) {
    return text;
  }
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

let convexClient: ConvexHttpClient | null = null;

function getConvexClient() {
  convexClient ??= new ConvexHttpClient(getConvexBaseUrl());
  return convexClient;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-binary-embedding-secret": sharedSecret,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} rejected the request with ${response.status}`);
  }
}

function normalizeChunksForLegacyCompletion(
  retrievalText: string,
  chunks: ProcessedChunk[],
) {
  return chunks.map((chunk) => ({
    text: chunk.text ?? retrievalText,
    embedding: chunk.embedding,
  }));
}

async function reportCompletion(job: EmbedJob, result: ProcessedFileResult) {
  if (job.completeUrl) {
    await postJson(job.completeUrl, {
      processId: job.processId,
      retrievalText: result.retrievalText,
      lexicalText: result.lexicalText,
      chunks: normalizeChunksForLegacyCompletion(
        result.retrievalText,
        result.chunks,
      ),
      contentHash: job.contentHash,
    });
    return;
  }

  await getConvexClient().action(backendApi.files.completeFileProcess, {
    secret: sharedSecret,
    jobId: job.processId,
    retrievalText: result.retrievalText,
    lexicalText: result.lexicalText,
    chunks: result.chunks,
  });
}

async function reportFailure(job: EmbedJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Binary embedding worker failed";
  try {
    if (job.failUrl) {
      await postJson(job.failUrl, {
        processId: job.processId,
        error: message,
      });
      return;
    }
    await getConvexClient().mutation(backendApi.files.failFileProcess, {
      secret: sharedSecret,
      jobId: job.processId,
      error: message,
    });
  } catch (reportError) {
    console.error("Failed to report embedding failure", reportError);
  }
}

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
  namespace?: string;
  key?: string;
  title?: string;
  text?: string;
  mimeType: string;
  fileName?: string | null;
  completeUrl?: string;
  failUrl?: string;
  contentHash?: string;
  cacheCompleteUrl?: string;
};

function tempDownloadPath(job: EmbedJob) {
  const tempDir = getTempDir();
  return `${tempDir}/binary-embedding-${job.processId}-${Date.now()}`;
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

async function downloadFileWithCurl(job: EmbedJob) {
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
        const result = JSON.parse(cached.result) as ProcessedFileResult;
        await reportCompletion(job, result);
        if (job.cacheCompleteUrl) {
          const firstChunk = result.chunks[0];
          if (!firstChunk) {
            throw new Error("Cached file result did not contain any chunks");
          }
          await postJson(job.cacheCompleteUrl, {
            contentHash: job.contentHash,
            embedding: firstChunk.embedding,
            mimeType: job.mimeType,
          });
        }
        return;
      }
    }

    tempFilePath = await downloadFileWithCurl(job);
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

    if (job.cacheCompleteUrl && job.contentHash && result.chunks[0]) {
      await postJson(job.cacheCompleteUrl, {
        contentHash: job.contentHash,
        embedding: result.chunks[0].embedding,
        mimeType: job.mimeType,
      });
    }
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
  const {
    jobId,
    processId,
    fileUrl,
    namespace,
    key,
    title,
    text,
    mimeType,
    fileName,
    completeUrl: jobCompleteUrl,
    failUrl: jobFailUrl,
    contentHash,
    cacheCompleteUrl,
  } = payload as Record<string, unknown>;
  if (
    (typeof jobId !== "string" && typeof processId !== "string") ||
    typeof fileUrl !== "string" ||
    typeof mimeType !== "string"
  ) {
    throw new Error("Missing required embedding job fields");
  }
  return {
    processId: (typeof jobId === "string" ? jobId : processId) as string,
    fileUrl,
    namespace: typeof namespace === "string" ? namespace : undefined,
    key: typeof key === "string" ? key : undefined,
    title: typeof title === "string" ? title : undefined,
    text: typeof text === "string" ? text : undefined,
    mimeType,
    fileName:
      typeof fileName === "string"
        ? fileName
        : fileName === null
          ? null
          : undefined,
    completeUrl:
      typeof jobCompleteUrl === "string" ? jobCompleteUrl : undefined,
    failUrl: typeof jobFailUrl === "string" ? jobFailUrl : undefined,
    contentHash: typeof contentHash === "string" ? contentHash : undefined,
    cacheCompleteUrl:
      typeof cacheCompleteUrl === "string" ? cacheCompleteUrl : undefined,
  };
}

const server = Bun.serve({
  port,
  routes: {
    "/health": () => Response.json({ ok: true }),
    "/embed": {
      POST: async (request) => {
        if (request.headers.get("x-binary-embedding-secret") !== sharedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const job = readJob(await request.json());
          queueMicrotask(() => {
            void processEmbeddingJob(job);
          });
          return Response.json(
            {
              accepted: true,
              processId: job.processId,
            },
            { status: 202 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Invalid embedding job",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});

console.log(`Embedding server listening at ${server.url}`);
