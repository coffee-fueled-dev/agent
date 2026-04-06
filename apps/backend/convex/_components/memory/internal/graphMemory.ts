import type {
  EdgeLabel,
  EdgeProperties,
} from "@very-coffee/convex-graph";
import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import {
  GRAPH_ONTOLOGY_CONTENT_SOURCE_TYPE,
  graph,
  type MemoryGraphEdgeDefs,
  type MemoryOntologyNodeLabel,
} from "../graph.js";
import { type ContentSource, upsertSourceMapLink } from "./store.js";

type ML = EdgeLabel<MemoryGraphEdgeDefs>;

/**
 * Structured link from the merged memory to another: `edge` + `targetMemoryRecordId` plus the
 * flat property fields for that edge (same names as `graph.config` / `edges.create` `properties`).
 */
export type MemoryLinkItem = {
  [L in ML]: {
    edge: L;
    targetMemoryRecordId: Id<"memoryRecords">;
  } & (EdgeProperties<MemoryGraphEdgeDefs, L> extends undefined
    ? Record<string, never>
    : EdgeProperties<MemoryGraphEdgeDefs, L>);
}[ML];

async function hasAnyGraphNodeForMemory(
  ctx: MutationCtx,
  key: Id<"memoryRecords">,
): Promise<boolean> {
  const page = await graph.nodes.listByKey(ctx, {
    key,
    paginationOpts: { numItems: 1, cursor: null },
  });
  return page.page.length > 0;
}

/**
 * Ensures a graph node exists for this memory for the given ontology label.
 * If `ontologyNodeLabel` is set, ensures that label exists (creates if missing).
 * If omitted, succeeds only when at least one graph node already exists for this memory.
 */
export async function ensureMemoryGraphNode(
  ctx: MutationCtx,
  memoryRecordId: Id<"memoryRecords">,
  ontologyNodeLabel?: MemoryOntologyNodeLabel,
): Promise<void> {
  const key = memoryRecordId;
  if (ontologyNodeLabel !== undefined) {
    const existing = await graph.nodes.get(ctx, {
      key,
      label: ontologyNodeLabel,
    });
    if (existing) return;
    await graph.nodes.create(ctx, {
      label: ontologyNodeLabel,
      key,
    });
    return;
  }
  if (await hasAnyGraphNodeForMemory(ctx, key)) {
    return;
  }
  throw new Error(
    "mergeMemory: ontologyNodeLabel is required until a graph node exists for this memory",
  );
}

/** Provenance graph row keyed by merge `contentSource` (legacy search / linking). */
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

/** Source map row for one ontology label (`contentSource.id` is the ontology label string). */
export async function upsertGraphOntologySourceMap(
  ctx: MutationCtx,
  args: {
    namespace: string;
    memoryRecordId: Id<"memoryRecords">;
    ontologyLabel: MemoryOntologyNodeLabel;
  },
): Promise<void> {
  await upsertSourceMapLink(ctx, {
    namespace: args.namespace,
    memoryRecordId: args.memoryRecordId,
    contentSource: {
      type: GRAPH_ONTOLOGY_CONTENT_SOURCE_TYPE,
      id: args.ontologyLabel,
    },
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
    if (!(await hasAnyGraphNodeForMemory(ctx, targetKey))) {
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
          properties: { relationship: link.relationship },
        });
        break;
      case "REFINES":
        await graph.edges.create(ctx, {
          label: "REFINES",
          from: fromKey,
          to: targetKey,
          properties: { refinement: link.refinement },
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
  if (args.ontologyNodeLabel !== undefined) {
    await upsertGraphOntologySourceMap(ctx, {
      namespace: args.namespace,
      memoryRecordId: args.memoryRecordId,
      ontologyLabel: args.ontologyNodeLabel,
    });
  }
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
