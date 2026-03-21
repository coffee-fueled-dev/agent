import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { api, components } from "../_generated/api";
import { AgentMemoryClient } from "../components/agentMemory/client";
import type { AgentMemorySearchResult } from "../components/agentMemory/public/search";
import type {
  RuntimeCurrentView,
  RuntimeEpisodeCommitArgs,
} from "../components/agentMemory/internal/runtime";

type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation" | "runQuery"
>;
type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

const threadIdentityRuntime = "threadIdentity";

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

function isUnknownRuntimeError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  return message.includes("Unknown agentMemory runtime:");
}

export async function recordThreadIdentityEpisode(
  ctx: ActionCtx,
  args: ThreadIdentityEpisodeArgs,
): Promise<{ workId: string }> {
  return await enqueueThreadIdentityEpisode(ctx, args);
}

export async function searchThreadIdentityCurrent(
  ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction" | "runQuery">,
  args: ThreadIdentitySearchArgs,
): Promise<AgentMemorySearchResult[]> {
  const { threadId, ...searchArgs } = args;
  try {
    const state = await createAgentMemoryClient().getRuntimeStreamState(ctx, {
      runtime: threadIdentityRuntime,
      streamId: threadId,
    });
    return await createAgentMemoryClient().search(ctx, {
      ...searchArgs,
      namespace: state.currentNamespace,
      includeHistorical: false,
      sourceKinds: ["fact"],
      streamType: threadIdentityRuntime,
      streamId: threadId,
    });
  } catch (error) {
    if (isUnknownRuntimeError(error)) {
      return [];
    }
    throw error;
  }
}

export async function searchThreadIdentityAsOf(
  ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction" | "runQuery">,
  args: ThreadIdentityAsOfSearchArgs,
): Promise<AgentMemorySearchResult[]> {
  const { threadId, ...searchArgs } = args;
  try {
    const state = await createAgentMemoryClient().getRuntimeStreamState(ctx, {
      runtime: threadIdentityRuntime,
      streamId: threadId,
    });
    return await createAgentMemoryClient().search(ctx, {
      ...searchArgs,
      namespace: state.historicalNamespace,
      includeHistorical: true,
      sourceKinds: ["episode"],
      streamType: threadIdentityRuntime,
      streamId: threadId,
    });
  } catch (error) {
    if (isUnknownRuntimeError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getThreadIdentityCurrent(
  ctx: QueryCtx,
  args: { threadId: string },
): Promise<ThreadIdentityCurrentView> {
  try {
    const current = await createAgentMemoryClient().getRuntimeCurrent(ctx, {
      runtime: threadIdentityRuntime,
      streamId: args.threadId,
    });
    const latestAttrs = coerceTurnAttrs(current.latestFact?.attrs);
    return {
      threadId: args.threadId,
      totalTurns: current.latestVersion,
      latestMessageId: latestAttrs?.messageId ?? null,
      latestCodeId: latestAttrs?.codeId ?? null,
      latestStaticHash: latestAttrs?.staticHash ?? null,
      latestRuntimeHash: latestAttrs?.runtimeHash ?? null,
      latestEntryTime: latestAttrs?.entryTime ?? null,
      latestEntryId: current.latestEntryId,
    };
  } catch (error) {
    if (!isUnknownRuntimeError(error)) {
      throw error;
    }
    return {
      threadId: args.threadId,
      totalTurns: 0,
      latestMessageId: null,
      latestCodeId: null,
      latestStaticHash: null,
      latestRuntimeHash: null,
      latestEntryTime: null,
      latestEntryId: null,
    };
  }
}

export async function listThreadIdentityEvolution(
  ctx: QueryCtx,
  args: { threadId: string; limit?: number },
): Promise<ThreadIdentityEvolutionView> {
  try {
    const evolution = await createAgentMemoryClient().listRuntimeEvolution(
      ctx,
      {
        runtime: threadIdentityRuntime,
        streamId: args.threadId,
        paginationOpts: {
          cursor: null,
          numItems: args.limit ?? 25,
        },
      },
    );
    return {
      threadId: args.threadId,
      turns: evolution.facts.map((turn) => ({
        entity: turn.entity,
        state: turn.state,
        order: turn.order,
        labels: turn.labels,
        attrs: coerceTurnAttrs(turn.attrs),
      })),
      history: evolution.history
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
  } catch (error) {
    if (!isUnknownRuntimeError(error)) {
      throw error;
    }
    return {
      threadId: args.threadId,
      turns: [],
      history: [],
    };
  }
}

async function ensureThreadIdentityRuntime(
  ctx: Pick<MutationCtx, "runMutation">,
) {
  await createAgentMemoryClient().registerRuntime(ctx, {
    runtime: threadIdentityRuntime,
    description: "Thread identity episodic runtime.",
    historyStreamType: threadIdentityRuntime,
    facts: {
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
    },
    namespaces: {
      facts: "facts",
      current: "current",
      historical: "history",
    },
    searchProfiles: {
      current: { sourceKinds: ["fact"] },
      historical: { sourceKinds: ["episode"] },
    },
  });
}

function buildThreadIdentityCommit(
  current: RuntimeCurrentView,
  args: ThreadIdentityEpisodeArgs,
): RuntimeEpisodeCommitArgs {
  const entryTime = args.entryTime ?? Date.now();
  const entity = turnEntity(args.messageId);
  const totalTurns = current.latestVersion + 1;
  const identityChanged =
    args.previousCodeId == null ||
    args.previousCodeId !== args.codeId ||
    args.previousStaticHash !== args.staticHash ||
    args.previousRuntimeHash !== args.runtimeHash;

  return {
    runtime: threadIdentityRuntime,
    streamId: args.threadId,
    commitKey: `threadIdentity:${args.threadId}:${args.messageId}`,
    entryTime,
    latestEntity: entity,
    history: {
      entryId: `turn:${args.messageId}`,
      kind: "turn_bound",
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
    },
    facts: {
      items: [
        {
          entity,
          entityType: "turn",
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
        },
      ],
      edges: current.latestFact
        ? [
            {
              kind: "next_turn",
              from: current.latestFact.entity,
              to: entity,
            },
          ]
        : undefined,
      partitions: [
        {
          partition: "latest_turn",
          head: current.latestEntity ?? undefined,
          tail: entity,
          count: totalTurns,
          membersVersion: totalTurns,
        },
      ],
      projector: "agentMemory:threadIdentity",
      mode: "event",
    },
    current: {
      key: `thread:${args.threadId}:current`,
      title: `Current thread identity ${args.threadId}`,
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
      sourceKind: "fact",
      entity: args.threadId,
      entityType: "thread",
      scope: args.threadId,
      validFrom: entryTime,
    },
    historical: {
      key: `thread:${args.threadId}:turn:${args.messageId}`,
      title: `Thread identity turn ${args.messageId}`,
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
      sourceKind: "episode",
      entity,
      entityType: "turn",
      scope: args.threadId,
      validFrom: entryTime,
    },
  };
}

export async function enqueueThreadIdentityEpisode(
  ctx: MutationCtx | ActionCtx,
  args: ThreadIdentityEpisodeArgs,
): Promise<{ workId: string }> {
  await ensureThreadIdentityRuntime(ctx);
  const current = await createAgentMemoryClient().getRuntimeCurrent(ctx, {
    runtime: threadIdentityRuntime,
    streamId: args.threadId,
  });
  const commit = buildThreadIdentityCommit(current, args);
  return await ctx.runMutation(api.agentMemory.enqueueRuntimeEpisode, commit);
}
