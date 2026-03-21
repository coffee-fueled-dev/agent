import type {
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
} from "convex/server";
import { components } from "../_generated/api";
import { AgentMemoryClient } from "../components/agentMemory/client";
import type { AgentMemorySearchResult } from "../components/agentMemory/public/search";
import { FactsClient } from "../components/facts/client";
import { history } from "../history";

type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation" | "runQuery"
>;
type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

const threadIdentityProjector = "agentMemory:threadIdentity";

const threadIdentityFacts = new FactsClient(components.facts, {
  entities: [
    {
      entityType: "turn",
      states: ["stable", "changed"],
      attrs: {
        messageId: "string",
        codeId: "string",
        staticHash: "string",
        runtimeHash: "string",
        entryTime: "number",
      },
    },
  ],
  edgeKinds: ["next_turn"],
  partitions: ["latest_turn"],
} as const);

function createAgentMemoryClient() {
  return new AgentMemoryClient(components.agentMemory, {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export type ThreadIdentityEpisodeArgs = {
  threadId: string;
  messageId: string;
  codeId: string;
  staticHash: string;
  runtimeHash: string;
  previousCodeId?: string;
  previousStaticHash?: string;
  previousRuntimeHash?: string;
  entryTime?: number;
};

type ThreadIdentityTurnAttrs = {
  messageId: string;
  codeId: string;
  staticHash: string;
  runtimeHash: string;
  entryTime: number;
};

export type ThreadIdentityCurrentView = {
  threadId: string;
  totalTurns: number;
  latestMessageId: string | null;
  latestCodeId: string | null;
  latestStaticHash: string | null;
  latestRuntimeHash: string | null;
  latestEntryTime: number | null;
  latestEntryId: string | null;
};

export type ThreadIdentityEvolutionView = {
  threadId: string;
  turns: Array<{
    entity: string;
    state: string | undefined;
    order: number[];
    labels: string[];
    attrs?: ThreadIdentityTurnAttrs;
  }>;
  history: Array<{
    entryId: string;
    kind: string;
    entryTime: number;
    parentEntryIds: string[];
    payload?: unknown;
  }>;
};

export type ThreadIdentitySearchArgs = {
  threadId: string;
  query: string | number[];
  filters?: unknown[];
  limit?: number;
  chunkContext?: {
    before: number;
    after: number;
  };
  vectorScoreThreshold?: number;
  searchType?: "vector" | "text" | "hybrid";
  textWeight?: number;
  vectorWeight?: number;
  asOfTime?: number;
  includeHistorical?: boolean;
  sourceKinds?: string[];
  entity?: string;
  entityType?: string;
  streamType?: string;
  streamId?: string;
};

export type ThreadIdentityAsOfSearchArgs = ThreadIdentitySearchArgs & {
  asOfTime: number;
};

function threadIdentityFactsNamespace(threadId: string) {
  return `threadIdentity:${threadId}:facts`;
}

function threadIdentityCurrentNamespace(threadId: string) {
  return `threadIdentity:${threadId}:current`;
}

function threadIdentityHistoryNamespace(threadId: string) {
  return `threadIdentity:${threadId}:history`;
}

function turnEntity(messageId: string) {
  return `turn:${messageId}`;
}

function summarizeCurrentThreadIdentity(args: {
  threadId: string;
  messageId: string;
  codeId: string;
  staticHash: string;
  runtimeHash: string;
  totalTurns: number;
  entryTime: number;
  identityChanged: boolean;
}) {
  return [
    `Thread ${args.threadId} currently resolves to code ${args.codeId}.`,
    `Latest message ${args.messageId} was recorded at ${new Date(args.entryTime).toISOString()}.`,
    `Static hash ${args.staticHash}. Runtime hash ${args.runtimeHash}.`,
    `Observed ${args.totalTurns} turn identity episode${args.totalTurns === 1 ? "" : "s"} so far.`,
    `Identity changed on this turn: ${args.identityChanged ? "yes" : "no"}.`,
  ].join(" ");
}

function summarizeHistoricalThreadIdentity(args: {
  threadId: string;
  messageId: string;
  codeId: string;
  staticHash: string;
  runtimeHash: string;
  previousCodeId?: string;
  previousStaticHash?: string;
  previousRuntimeHash?: string;
  entryTime: number;
  sourceVersion: number;
  identityChanged: boolean;
}) {
  return [
    `Thread ${args.threadId} turn ${args.messageId} bound code ${args.codeId}.`,
    `Recorded at ${new Date(args.entryTime).toISOString()} as source version ${args.sourceVersion}.`,
    `Static hash ${args.staticHash}. Runtime hash ${args.runtimeHash}.`,
    `Previous code ${args.previousCodeId ?? "none"}.`,
    `Previous static hash ${args.previousStaticHash ?? "none"}.`,
    `Previous runtime hash ${args.previousRuntimeHash ?? "none"}.`,
    `Identity changed: ${args.identityChanged ? "yes" : "no"}.`,
  ].join(" ");
}

function coerceTurnAttrs(value: unknown): ThreadIdentityTurnAttrs | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const attrs = value as Record<string, unknown>;
  if (
    typeof attrs.messageId !== "string" ||
    typeof attrs.codeId !== "string" ||
    typeof attrs.staticHash !== "string" ||
    typeof attrs.runtimeHash !== "string" ||
    typeof attrs.entryTime !== "number"
  ) {
    return undefined;
  }
  return {
    messageId: attrs.messageId,
    codeId: attrs.codeId,
    staticHash: attrs.staticHash,
    runtimeHash: attrs.runtimeHash,
    entryTime: attrs.entryTime,
  };
}

export async function recordThreadIdentityEpisode(
  ctx: ActionCtx,
  args: ThreadIdentityEpisodeArgs,
) {
  const entryTime = args.entryTime ?? Date.now();
  const historyEntryId = `turn:${args.messageId}`;
  const factsNamespace = threadIdentityFactsNamespace(args.threadId);
  const currentNamespace = threadIdentityCurrentNamespace(args.threadId);
  const historyNamespace = threadIdentityHistoryNamespace(args.threadId);
  const entity = turnEntity(args.messageId);
  const identityChanged =
    args.previousCodeId == null ||
    args.previousCodeId !== args.codeId ||
    args.previousStaticHash !== args.staticHash ||
    args.previousRuntimeHash !== args.runtimeHash;
  const parentEntryIds = (
    await history.heads.listHeads(ctx, {
      streamType: "threadIdentity",
      streamId: args.threadId,
    })
  ).map((head) => head.entryId);

  await history.append.append(ctx, {
    streamType: "threadIdentity",
    streamId: args.threadId,
    entryId: historyEntryId,
    kind: "turn_bound",
    parentEntryIds,
    entryTime,
    payload: {
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      previousCodeId: args.previousCodeId,
      previousStaticHash: args.previousStaticHash,
      previousRuntimeHash: args.previousRuntimeHash,
      identityChanged,
    },
  });

  const existingTurns = await threadIdentityFacts.eval.orderedFacts(ctx, {
    namespace: factsNamespace,
    entityType: "turn",
  });
  const previousTurn = existingTurns.at(-1);
  const totalTurns =
    previousTurn?.entity === entity ? existingTurns.length : existingTurns.length + 1;
  const batch = threadIdentityFacts.batch(factsNamespace);

  batch.item("turn", entity, {
    state: identityChanged ? "changed" : "stable",
    order: [entryTime],
    labels: [args.codeId],
    attrs: {
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      entryTime,
    },
  });
  if (previousTurn && previousTurn.entity !== entity) {
    batch.edge("next_turn", previousTurn.entity, entity);
  }
  batch.partition("latest_turn", {
    head: existingTurns[0]?.entity,
    tail: entity,
    count: totalTurns,
    membersVersion: totalTurns,
  });
  await batch.commit(ctx, {
    version: totalTurns,
    projector: threadIdentityProjector,
    mode: "event",
  });

  const memory = createAgentMemoryClient();
  await memory.addText(ctx, {
    namespace: currentNamespace,
    key: `thread:${args.threadId}:current`,
    title: `Current thread identity ${args.threadId}`,
    indexKind: "current",
    sourceKind: "fact",
    streamType: "threadIdentity",
    streamId: args.threadId,
    sourceEntryId: historyEntryId,
    entity: args.threadId,
    entityType: "thread",
    sourceVersion: totalTurns,
    entryTime,
    validFrom: entryTime,
    scope: args.threadId,
    text: summarizeCurrentThreadIdentity({
      threadId: args.threadId,
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      totalTurns,
      entryTime,
      identityChanged,
    }),
  });
  await memory.addText(ctx, {
    namespace: historyNamespace,
    key: `thread:${args.threadId}:turn:${args.messageId}`,
    title: `Thread identity turn ${args.messageId}`,
    indexKind: "historical",
    sourceKind: "episode",
    streamType: "threadIdentity",
    streamId: args.threadId,
    sourceEntryId: historyEntryId,
    entity,
    entityType: "turn",
    sourceVersion: totalTurns,
    entryTime,
    validFrom: entryTime,
    scope: args.threadId,
    text: summarizeHistoricalThreadIdentity({
      threadId: args.threadId,
      messageId: args.messageId,
      codeId: args.codeId,
      staticHash: args.staticHash,
      runtimeHash: args.runtimeHash,
      previousCodeId: args.previousCodeId,
      previousStaticHash: args.previousStaticHash,
      previousRuntimeHash: args.previousRuntimeHash,
      entryTime,
      sourceVersion: totalTurns,
      identityChanged,
    }),
  });

  return {
    entryId: historyEntryId,
    identityChanged,
    totalTurns,
  };
}

export async function searchThreadIdentityCurrent(
  ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
  args: ThreadIdentitySearchArgs,
): Promise<AgentMemorySearchResult[]> {
  const { threadId, ...searchArgs } = args;
  return await createAgentMemoryClient().search(ctx, {
    ...searchArgs,
    namespace: threadIdentityCurrentNamespace(threadId),
    includeHistorical: false,
    streamType: "threadIdentity",
    streamId: threadId,
  });
}

export async function searchThreadIdentityAsOf(
  ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
  args: ThreadIdentityAsOfSearchArgs,
): Promise<AgentMemorySearchResult[]> {
  const { threadId, ...searchArgs } = args;
  return await createAgentMemoryClient().search(ctx, {
    ...searchArgs,
    namespace: threadIdentityHistoryNamespace(threadId),
    includeHistorical: true,
    sourceKinds: ["episode"],
    streamType: "threadIdentity",
    streamId: threadId,
  });
}

export async function getThreadIdentityCurrent(
  ctx: QueryCtx,
  args: { threadId: string },
): Promise<ThreadIdentityCurrentView> {
  const turns = await threadIdentityFacts.eval.orderedFacts(ctx, {
    namespace: threadIdentityFactsNamespace(args.threadId),
    entityType: "turn",
  });
  const latest = turns.at(-1);
  const latestAttrs = coerceTurnAttrs(latest?.attrs);
  const heads = await history.heads.listHeads(ctx, {
    streamType: "threadIdentity",
    streamId: args.threadId,
  });
  return {
    threadId: args.threadId,
    totalTurns: turns.length,
    latestMessageId: latestAttrs?.messageId ?? null,
    latestCodeId: latestAttrs?.codeId ?? null,
    latestStaticHash: latestAttrs?.staticHash ?? null,
    latestRuntimeHash: latestAttrs?.runtimeHash ?? null,
    latestEntryTime: latestAttrs?.entryTime ?? null,
    latestEntryId: heads.at(0)?.entryId ?? null,
  };
}

export async function listThreadIdentityEvolution(
  ctx: QueryCtx,
  args: { threadId: string; limit?: number },
): Promise<ThreadIdentityEvolutionView> {
  const turns = await threadIdentityFacts.eval.orderedFacts(ctx, {
    namespace: threadIdentityFactsNamespace(args.threadId),
    entityType: "turn",
  });
  const historyPage = await history.read.listEntries(ctx, {
    streamType: "threadIdentity",
    streamId: args.threadId,
    paginationOpts: {
      cursor: null,
      numItems: args.limit ?? 25,
    },
  });
  return {
    threadId: args.threadId,
    turns: turns.map((turn) => ({
      entity: turn.entity,
      state: turn.state,
      order: turn.order,
      labels: turn.labels,
      attrs: coerceTurnAttrs(turn.attrs),
    })),
    history: historyPage.page
      .slice()
      .reverse()
      .map((entry) => ({
        entryId: entry.entryId,
        kind: entry.kind,
        entryTime: entry.entryTime,
        parentEntryIds: entry.parentEntryIds,
        payload: entry.payload,
      })),
  };
}
