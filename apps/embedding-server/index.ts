import { Database } from "bun:sqlite";
import {
  createPartFromBase64,
  createPartFromText,
  GoogleGenAI,
} from "@google/genai";
import { $ } from "bun";

const embeddingModel = "gemini-embedding-2-preview";
const port = Number(process.env.EMBEDDING_SERVER_PORT ?? "3031");
const convexBaseUrl =
  process.env.CONVEX_SITE_URL?.trim() || process.env.CONVEX_URL?.trim();
const sharedSecret =
  process.env.BINARY_EMBEDDING_SECRET?.trim() ||
  "dev-only-binary-embedding-secret";

if (!convexBaseUrl) {
  throw new Error("CONVEX_SITE_URL or CONVEX_URL is required");
}
const callbackBaseUrl = convexBaseUrl;

const cacheDbPath = process.env.EMBEDDING_CACHE_DB ?? "embedding-cache.sqlite";
const cacheDb = new Database(cacheDbPath, { create: true });
cacheDb.run("PRAGMA journal_mode = WAL;");
cacheDb.run(
  "CREATE TABLE IF NOT EXISTS cache (hash TEXT PRIMARY KEY, embedding TEXT NOT NULL, created_at INTEGER NOT NULL)",
);
const cacheGet = cacheDb.query<{ embedding: string }, { $hash: string }>(
  "SELECT embedding FROM cache WHERE hash = $hash",
);
const cacheSet = cacheDb.query(
  "INSERT OR REPLACE INTO cache (hash, embedding, created_at) VALUES ($hash, $embedding, $created_at)",
);

function resolveGoogleApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY
  );
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

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
  const apiKey = resolveGoogleApiKey();
  return new GoogleGenAI(apiKey ? { apiKey } : {});
}

function failUrl() {
  return `${normalizeBaseUrl(callbackBaseUrl)}/context/binary-embedding/fail`;
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

async function reportFailure(job: EmbedJob, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Binary embedding worker failed";
  try {
    await postJson(job.failUrl ?? failUrl(), {
      processId: job.processId,
      error: message,
    });
  } catch (reportError) {
    console.error("Failed to report embedding failure", reportError);
  }
}

type EmbedJob = {
  processId: string;
  fileUrl: string;
  namespace?: string;
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
  const tempDir = process.env.TMPDIR?.replace(/\/+$/, "") || "/tmp";
  return `${tempDir}/binary-embedding-${job.processId}-${Date.now()}`;
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
    // Check SQLite cache if a content hash was provided
    if (job.contentHash) {
      const cached = cacheGet.get({ $hash: job.contentHash });
      if (cached) {
        const embedding: number[] = JSON.parse(cached.embedding);
        const retrievalText = buildRetrievalText(job);
        const chunks = [{ text: retrievalText, embedding }];
        if (job.completeUrl) {
          await postJson(job.completeUrl, {
            processId: job.processId,
            retrievalText,
            chunks,
            contentHash: job.contentHash,
          });
        }
        if (job.cacheCompleteUrl) {
          await postJson(job.cacheCompleteUrl, {
            contentHash: job.contentHash,
            embedding,
            mimeType: job.mimeType,
          });
        }
        return;
      }
    }

    tempFilePath = await downloadFileWithCurl(job);
    const retrievalText = buildRetrievalText(job);
    const fileBytes = await Bun.file(tempFilePath).arrayBuffer();
    const fileBase64 = Buffer.from(fileBytes).toString("base64");
    const client = createGenAIClient();
    const embeddingResponse = await client.models.embedContent({
      model: embeddingModel,
      contents: [
        createPartFromBase64(fileBase64, job.mimeType),
        createPartFromText(retrievalText),
      ],
    });
    const chunks = (embeddingResponse.embeddings ?? []).flatMap((embedding) =>
      embedding?.values?.length
        ? [
            {
              text: retrievalText,
              embedding: embedding.values,
            },
          ]
        : [],
    );
    if (chunks.length === 0) {
      throw new Error("Google did not return any embeddings");
    }

    // Store in SQLite cache
    if (job.contentHash && chunks[0]) {
      cacheSet.run({
        $hash: job.contentHash,
        $embedding: JSON.stringify(chunks[0].embedding),
        $created_at: Date.now(),
      });
    }

    if (job.completeUrl) {
      await postJson(job.completeUrl, {
        processId: job.processId,
        retrievalText,
        chunks,
        contentHash: job.contentHash,
      });
    }

    if (job.cacheCompleteUrl && job.contentHash && chunks[0]) {
      await postJson(job.cacheCompleteUrl, {
        contentHash: job.contentHash,
        embedding: chunks[0].embedding,
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
    processId,
    fileUrl,
    namespace,
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
    typeof processId !== "string" ||
    typeof fileUrl !== "string" ||
    typeof mimeType !== "string"
  ) {
    throw new Error("Missing required embedding job fields");
  }
  return {
    processId,
    fileUrl,
    namespace: typeof namespace === "string" ? namespace : undefined,
    title: typeof title === "string" ? title : undefined,
    text: typeof text === "string" ? text : undefined,
    mimeType,
    fileName:
      typeof fileName === "string" || fileName === null ? fileName : undefined,
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
