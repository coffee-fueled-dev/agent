import { getThreadMetadata } from "@convex-dev/agent";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { AgentMemorySearchResult } from "../components/agentMemory/public/search";
import {
  buildPublicMemoryFileUrl,
  isProviderAccessibleUrl,
} from "./memoryFiles";

type MemoryResolverCtx = Parameters<typeof getThreadMetadata>[0] &
  Pick<ActionCtx, "runAction">;

export type ThreadOwnerMemoryScope = {
  ownerAccountId: Id<"accounts">;
  namespace: string;
};

export type ChatMemorySummary = {
  kind: "text" | "textFile" | "binaryFile";
  key: string;
  title?: string;
  summary: string;
  score: number;
  importance: number;
  fileUrl?: string;
  fileName?: string | null;
  mimeType?: string;
  storageId?: Id<"_storage">;
  metadata: AgentMemorySearchResult["metadata"];
};

export type ThreadOwnerMemorySearch = ThreadOwnerMemoryScope & {
  memories: ChatMemorySummary[];
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shorten(value: string, max = 240) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

function formatScore(value: number) {
  return value.toFixed(2);
}

function fileResultUrl(
  result: Extract<AgentMemorySearchResult, { type: "textFile" | "binaryFile" }>,
) {
  return (
    buildPublicMemoryFileUrl({
      storageId: result.storageId,
      fileName: result.fileName,
    }) ?? (isProviderAccessibleUrl(result.url) ? result.url : null)
  );
}

function summarizeMemoryResult(
  result: AgentMemorySearchResult,
): ChatMemorySummary {
  if (result.type === "text") {
    return {
      kind: "text",
      key: result.key,
      title: result.title,
      summary: shorten(compactText(result.text)),
      score: result.score,
      importance: result.importance,
      metadata: result.metadata,
    };
  }

  if (result.type === "textFile") {
    return {
      kind: "textFile",
      key: result.key,
      title: result.title,
      summary: shorten(compactText(result.text)),
      score: result.score,
      importance: result.importance,
      fileUrl: fileResultUrl(result) ?? undefined,
      fileName: result.fileName,
      mimeType: result.mimeType,
      storageId: result.storageId,
      metadata: result.metadata,
    };
  }

  const descriptor = compactText(
    result.title ?? result.fileName ?? `Binary file (${result.mimeType})`,
  );
  return {
    kind: "binaryFile",
    key: result.key,
    title: result.title,
    summary: shorten(descriptor),
    score: result.score,
    importance: result.importance,
    fileUrl: fileResultUrl(result) ?? undefined,
    fileName: result.fileName,
    mimeType: result.mimeType,
    storageId: result.storageId,
    metadata: result.metadata,
  };
}

function sortByRelevance(
  left: AgentMemorySearchResult,
  right: AgentMemorySearchResult,
) {
  return right.score - left.score || right.importance - left.importance;
}

function matchesScoreThreshold(
  result: AgentMemorySearchResult,
  threshold: number | undefined,
) {
  if (threshold !== undefined) {
    return result.score >= threshold;
  }
  return result.score > 0;
}

function memoryLine(memory: ChatMemorySummary, index: number) {
  const parts = [
    `${index + 1}. [${memory.kind}] ${memory.summary}`,
    `score=${formatScore(memory.score)}`,
    `importance=${formatScore(memory.importance)}`,
    `key=${memory.key}`,
  ];
  if (memory.fileUrl) {
    parts.push(`fileUrl=${memory.fileUrl}`);
  }
  return parts.join(" | ");
}

export function accountMemoryNamespace(accountId: Id<"accounts"> | string) {
  return `account:${accountId}`;
}

export async function resolveThreadOwnerMemoryScope(
  ctx: Parameters<typeof getThreadMetadata>[0],
  threadId: string,
): Promise<ThreadOwnerMemoryScope> {
  const thread = await getThreadMetadata(ctx, components.agent, { threadId });
  if (!thread.userId) {
    throw new Error("Thread does not have an owner account");
  }
  return {
    ownerAccountId: thread.userId as Id<"accounts">,
    namespace: accountMemoryNamespace(thread.userId),
  };
}

export async function searchThreadOwnerMemories(
  ctx: MemoryResolverCtx,
  args: {
    threadId: string;
    query: string;
    limit?: number;
    searchType?: "vector" | "text" | "hybrid";
    vectorScoreThreshold?: number;
  },
): Promise<ThreadOwnerMemorySearch> {
  const scope = await resolveThreadOwnerMemoryScope(ctx, args.threadId);
  const rawResults: AgentMemorySearchResult[] = await ctx.runAction(
    api.agentMemory.search,
    {
      namespace: scope.namespace,
      query: args.query,
      limit: args.limit,
      searchType: args.searchType,
      vectorScoreThreshold: args.vectorScoreThreshold,
    },
  );

  const memories: ChatMemorySummary[] = rawResults
    .filter((result) =>
      matchesScoreThreshold(result, args.vectorScoreThreshold),
    )
    .sort(sortByRelevance)
    .map(summarizeMemoryResult);

  return {
    ...scope,
    memories,
  };
}

export function buildInjectedMemoryContext(memories: ChatMemorySummary[]) {
  if (memories.length === 0) {
    return null;
  }
  return [
    "Retrieved memory context. Treat these as helpful but fallible prior beliefs and references.",
    ...memories.map(memoryLine),
  ].join("\n");
}

export async function storeThreadOwnerMemory(
  ctx: MemoryResolverCtx,
  args: {
    threadId: string;
    text: string;
    title?: string;
    subject: "user" | "assistant" | "shared";
  },
) {
  const text = compactText(args.text);
  if (!text) {
    throw new Error("Memory text is required");
  }

  const scope = await resolveThreadOwnerMemoryScope(ctx, args.threadId);
  const title = args.title?.trim() || shorten(text, 80);
  const key = `memory:${args.subject}:${crypto.randomUUID()}`;

  await ctx.runAction(api.agentMemory.addText, {
    namespace: scope.namespace,
    key,
    title,
    text,
    entryTime: Date.now(),
    entity: String(scope.ownerAccountId),
    entityType: "account",
    scope: scope.namespace,
    sourceKind: "chatMemory",
    streamType: "account",
    streamId: String(scope.ownerAccountId),
    metadata: {
      subject: args.subject,
      storedBy: "assistant",
      threadId: args.threadId,
    },
  });

  return {
    ...scope,
    key,
    title,
  };
}
