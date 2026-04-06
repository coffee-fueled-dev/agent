import type { EdgeLabel } from "@very-coffee/convex-graph";
import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import type { MemoryGraphEdgeDefs, MemoryOntologyNodeLabel } from "../graph.js";
import { graph } from "../graph.js";
import { type ContentSource, upsertSourceMapLink } from "./store.js";

type ML = EdgeLabel<MemoryGraphEdgeDefs>;

type LinkExtra<L extends ML> = Extract<
  MemoryGraphEdgeDefs[number],
  { label: L }
>["properties"] extends undefined
  ? Record<string, never>
  : { score: number };

/** Structured link from the merged memory to another; aligned with {@link graph} edge defs. */
export type MemoryLinkItem = {
  [L in ML]: {
    edge: L;
    targetMemoryRecordId: Id<"memoryRecords">;
  } & LinkExtra<L>;
}[ML];

/**
 * Ensures a graph node exists for this memory (one of Fact | Preference | Procedure | Reference).
 * If no node exists yet, `ontologyNodeLabel` is required to create it.
 */
export async function ensureMemoryGraphNode(
  ctx: MutationCtx,
  memoryRecordId: Id<"memoryRecords">,
  ontologyNodeLabel?: MemoryOntologyNodeLabel,
): Promise<void> {
  const key = memoryRecordId;
  const existing = await graph.nodes.get(ctx, { key });
  if (existing) {
    return;
  }
  if (ontologyNodeLabel === undefined) {
    throw new Error(
      "mergeMemory: ontologyNodeLabel is required until a graph node exists for this memory",
    );
  }
  await graph.nodes.create(ctx, {
    label: ontologyNodeLabel,
    key,
  });
}

export async function upsertGraphSourceMap(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    contentSource: ContentSource;
  },
): Promise<void> {
  await upsertSourceMapLink(ctx, {
    namespace: args.namespace,
    memoryRecordId: args.memoryRecordId,
    contentSource: args.contentSource,
    searchBackend: "graph",
    searchItemId: String(args.memoryRecordId),
  });
}

export async function applyMemoryLinks(
  ctx: MutationCtx,
  args: {
    namespace: string;
    fromMemoryRecordId: Id<"memoryRecords">;
    links: MemoryLinkItem[];
  },
): Promise<void> {
  const fromKey = args.fromMemoryRecordId;
  for (const link of args.links) {
    if (link.targetMemoryRecordId === args.fromMemoryRecordId) {
      continue;
    }
    const targetDoc = await ctx.db.get(link.targetMemoryRecordId);
    if (!targetDoc || targetDoc.namespace !== args.namespace) {
      throw new Error(
        "applyMemoryLinks: target memory not found or namespace mismatch",
      );
    }
    const targetKey = link.targetMemoryRecordId;
    const targetNode = await graph.nodes.get(ctx, { key: targetKey });
    if (!targetNode) {
      throw new Error(
        "applyMemoryLinks: target memory has no graph node; merge it with ontologyNodeLabel first",
      );
    }

    switch (link.edge) {
      case "SIMILAR_TO":
        await graph.edges.create(ctx, {
          label: "SIMILAR_TO",
          from: fromKey,
          to: targetKey,
          properties: { score: link.score },
        });
        break;
      case "RELATES_TO":
        await graph.edges.create(ctx, {
          label: "RELATES_TO",
          from: fromKey,
          to: targetKey,
        });
        break;
      case "REFINES":
        await graph.edges.create(ctx, {
          label: "REFINES",
          from: fromKey,
          to: targetKey,
        });
        break;
      default: {
        const _exhaustive: never = link;
        void _exhaustive;
      }
    }
  }
}

export async function syncMemoryGraphForMerge(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    contentSource: ContentSource;
    ontologyNodeLabel?: MemoryOntologyNodeLabel;
    memoryLinks?: MemoryLinkItem[];
  },
): Promise<void> {
  await ensureMemoryGraphNode(ctx, args.memoryRecordId, args.ontologyNodeLabel);
  await upsertGraphSourceMap(ctx, {
    namespace: args.namespace,
    memoryRecordId: args.memoryRecordId,
    contentSource: args.contentSource,
  });
  if (args.memoryLinks && args.memoryLinks.length > 0) {
    await applyMemoryLinks(ctx, {
      namespace: args.namespace,
      fromMemoryRecordId: args.memoryRecordId,
      links: args.memoryLinks,
    });
  }
}
