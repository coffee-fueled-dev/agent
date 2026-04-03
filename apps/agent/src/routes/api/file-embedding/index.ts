import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  createPartFromBase64,
  createPartFromText,
  GoogleGenAI,
} from "@google/genai";
import { api } from "@very-coffee/backend/api";
import { ConvexHttpClient } from "convex/browser";
import {
  getConvexUrl,
  getEmbeddingCacheDbPath,
  getFileEmbeddingSecret,
  getGoogleApiKey,
} from "./env.js";

const embeddingModel = "gemini-embedding-2-preview";
const MAX_CACHED_FILE_CHUNKS = 120;
/** Convex actions per file; slice inside {@link mergeMemory} stays deterministic. */
const CONVEX_INGEST_BATCH_SIZE = 48;
/** Strings per `embedContent` call (Gemini returns one embedding per entry, same order). */
const GOOGLE_EMBED_BATCH_SIZE = 100;
/**
 * Max characters per text slice after paragraph splitting. `gemini-embedding-2-preview`
 * allows ~8k tokens; stay under that for code/dense text. Larger slices → fewer Convex
 * lexical/vector appends per file (see `executeMergeMemoryBatch`).
 */
const MAX_TEXT_CHUNK_CHARS = 2_000;
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
  const { chunks, retrievalText } = result;
  if (chunks.length === 0) {
    throw new Error("No embedding chunks to report");
  }
  const textLike = isTextLikeMime(job.mimeType);
  if (textLike) {
    for (
      let batchStart = 0;
      batchStart < chunks.length;
      batchStart += CONVEX_INGEST_BATCH_SIZE
    ) {
      const slice = chunks.slice(
        batchStart,
        batchStart + CONVEX_INGEST_BATCH_SIZE,
      );
      const lastGlobal = batchStart + slice.length - 1;
      const isLastBatch = lastGlobal === chunks.length - 1;
      await convex.action(api.files.ingestFileEmbeddingChunks, {
        secret: sharedSecret,
        jobId: job.processId,
        chunks: slice,
        lastChunkOrder: lastGlobal,
        isLast: isLastBatch,
      });
    }
  } else {
    const first = chunks[0];
    if (!first) {
      throw new Error("No chunk for binary ingest");
    }
    await convex.action(api.files.ingestFileEmbeddingChunk, {
      secret: sharedSecret,
      jobId: job.processId,
      chunkOrder: 0,
      chunk: first,
      isLast: true,
      retrievalText,
    });
  }
  if (job.contentHash && chunks.length <= MAX_CACHED_FILE_CHUNKS) {
    await convex.mutation(api.files.cacheFileEmbeddingResult, {
      secret: sharedSecret,
      jobId: job.processId,
    });
  }
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

async function fetchStoragePayload(
  job: EmbedJob,
): Promise<
  { kind: "text"; text: string } | { kind: "binary"; arrayBuffer: ArrayBuffer }
> {
  const res = await fetch(job.fileUrl);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `File download failed: HTTP ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}`,
    );
  }
  if (isTextLikeMime(job.mimeType)) {
    return { kind: "text", text: (await res.text()).trim() };
  }
  return { kind: "binary", arrayBuffer: await res.arrayBuffer() };
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
    if (chunk.length <= MAX_TEXT_CHUNK_CHARS) return [chunk];
    const out: string[] = [];
    for (let start = 0; start < chunk.length; start += MAX_TEXT_CHUNK_CHARS) {
      out.push(chunk.slice(start, start + MAX_TEXT_CHUNK_CHARS));
    }
    return out;
  });
}

/** One request per batch of strings; fewer round trips and better rate-limit behavior. */
async function embedTextChunksBatched(
  client: GoogleGenAI,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += GOOGLE_EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + GOOGLE_EMBED_BATCH_SIZE);
    const response = await client.models.embedContent({
      model: embeddingModel,
      contents: batch,
    });
    const embeddings = response.embeddings;
    if (!embeddings || embeddings.length !== batch.length) {
      throw new Error(
        `Google embedContent: expected ${batch.length} embeddings, got ${embeddings?.length ?? 0}`,
      );
    }
    for (const emb of embeddings) {
      const values = emb.values;
      if (!values?.length) {
        throw new Error("Google returned an empty embedding in batch");
      }
      out.push(values);
    }
  }
  return out;
}

async function processEmbeddingJob(job: EmbedJob) {
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

    const payload = await fetchStoragePayload(job);
    const client = createGenAIClient();
    const result =
      payload.kind === "text"
        ? await (async (): Promise<ProcessedFileResult> => {
            const text = payload.text;
            const retrievalText = text || buildRetrievalText(job);
            const chunkTexts = splitTextContent(retrievalText);
            if (chunkTexts.length === 0) {
              throw new Error("No text chunks were produced");
            }
            const embeddingVectors = await embedTextChunksBatched(
              client,
              chunkTexts,
            );
            const chunks = chunkTexts.map((chunkText, i) => {
              const embedding = embeddingVectors[i];
              if (!embedding) {
                throw new Error(`Missing embedding at index ${i}`);
              }
              return { text: chunkText, embedding };
            });
            return { retrievalText, lexicalText: retrievalText, chunks };
          })()
        : await (async (): Promise<ProcessedFileResult> => {
            const retrievalText = buildRetrievalText(job);
            const fileBase64 = Buffer.from(payload.arrayBuffer).toString(
              "base64",
            );
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
