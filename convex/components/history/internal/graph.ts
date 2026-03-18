import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type HistoryCtx = MutationCtx | QueryCtx;
type HistoryEntryDoc = Doc<"history_entries">;
type HistoryHeadDoc = Doc<"history_heads">;

async function loadEntry(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  return await ctx.db
    .query("history_entries")
    .withIndex("by_stream_entry", (q) =>
      q
        .eq("streamType", args.streamType)
        .eq("streamId", args.streamId)
        .eq("entryId", args.entryId),
    )
    .first();
}

export async function loadEntryByRef(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  return await loadEntry(ctx, args);
}

export async function assertEntryDoesNotExist(
  ctx: MutationCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  const existing = await loadEntry(ctx, args);
  if (existing) {
    throw new Error(
      `History entry "${args.entryId}" already exists in stream "${args.streamType}:${args.streamId}"`,
    );
  }
}

export async function assertParentsExistInStream(
  ctx: MutationCtx,
  args: {
    streamType: string;
    streamId: string;
    parentEntryIds: string[];
  },
) {
  const parents = await Promise.all(
    args.parentEntryIds.map(async (parentEntryId) => {
      const parent = await loadEntry(ctx, {
        streamType: args.streamType,
        streamId: args.streamId,
        entryId: parentEntryId,
      });
      if (!parent) {
        throw new Error(
          `Parent entry "${parentEntryId}" does not exist in stream "${args.streamType}:${args.streamId}"`,
        );
      }
      return parent;
    }),
  );

  return parents;
}

export async function loadParents(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  const edges = await ctx.db
    .query("history_parent_edges")
    .withIndex("by_stream_child_order", (q) =>
      q
        .eq("streamType", args.streamType)
        .eq("streamId", args.streamId)
        .eq("childEntryId", args.entryId),
    )
    .collect();

  const parents = await Promise.all(
    edges.map(async (edge) =>
      loadEntry(ctx, {
        streamType: args.streamType,
        streamId: args.streamId,
        entryId: edge.parentEntryId,
      }),
    ),
  );

  return parents.filter((parent): parent is HistoryEntryDoc => parent !== null);
}

export async function loadChildren(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  const edges = await ctx.db
    .query("history_parent_edges")
    .withIndex("by_stream_parent_child", (q) =>
      q
        .eq("streamType", args.streamType)
        .eq("streamId", args.streamId)
        .eq("parentEntryId", args.entryId),
    )
    .collect();

  const children = await Promise.all(
    edges.map(async (edge) =>
      loadEntry(ctx, {
        streamType: args.streamType,
        streamId: args.streamId,
        entryId: edge.childEntryId,
      }),
    ),
  );

  return children
    .filter((child): child is HistoryEntryDoc => child !== null)
    .sort(compareEntries);
}

export async function listHeadsForStream(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
  },
) {
  return await ctx.db
    .query("history_heads")
    .withIndex("by_stream_entry", (q) =>
      q.eq("streamType", args.streamType).eq("streamId", args.streamId),
    )
    .collect();
}

export function computeNextHeads(
  currentHeads: HistoryHeadDoc[],
  parentEntryIds: string[],
  nextEntry: { entryId: string; kind: string },
) {
  const parentSet = new Set(parentEntryIds);
  const nextHeadIds = new Set<string>();

  for (const head of currentHeads) {
    if (!parentSet.has(head.entryId)) {
      nextHeadIds.add(head.entryId);
    }
  }

  nextHeadIds.add(nextEntry.entryId);

  return {
    remove: currentHeads.filter((head) => !nextHeadIds.has(head.entryId)),
    shouldInsert: !currentHeads.some(
      (head) => head.entryId === nextEntry.entryId,
    ),
    next: {
      entryId: nextEntry.entryId,
      headKind: nextEntry.kind,
    },
  };
}

export async function getPrimaryPathToRoot(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  const path: HistoryEntryDoc[] = [];
  let current = await loadEntry(ctx, args);

  while (current) {
    path.push(current);
    const parents = await loadParents(ctx, current);
    current = parents[0] ?? null;
  }

  return path;
}

export async function isAncestorEntry(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    ancestorEntryId: string;
    descendantEntryId: string;
  },
) {
  if (args.ancestorEntryId === args.descendantEntryId) {
    return true;
  }

  const seen = new Set<string>();
  const pending = [args.descendantEntryId];

  while (pending.length > 0) {
    const currentEntryId = pending.pop();
    if (!currentEntryId || seen.has(currentEntryId)) continue;
    seen.add(currentEntryId);

    const parents = await loadParents(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
      entryId: currentEntryId,
    });

    for (const parent of parents) {
      if (parent.entryId === args.ancestorEntryId) {
        return true;
      }
      pending.push(parent.entryId);
    }
  }

  return false;
}

async function buildAncestorDepthMap(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    entryId: string;
  },
) {
  const depths = new Map<string, number>();
  const pending = [{ entryId: args.entryId, depth: 0 }];

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current) continue;

    const existingDepth = depths.get(current.entryId);
    if (existingDepth != null && existingDepth <= current.depth) {
      continue;
    }

    depths.set(current.entryId, current.depth);

    const parents = await loadParents(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
      entryId: current.entryId,
    });

    for (const parent of parents) {
      pending.push({
        entryId: parent.entryId,
        depth: current.depth + 1,
      });
    }
  }

  return depths;
}

export async function latestCommonAncestor(
  ctx: HistoryCtx,
  args: {
    streamType: string;
    streamId: string;
    leftEntryId: string;
    rightEntryId: string;
  },
) {
  const [leftDepths, rightDepths] = await Promise.all([
    buildAncestorDepthMap(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
      entryId: args.leftEntryId,
    }),
    buildAncestorDepthMap(ctx, {
      streamType: args.streamType,
      streamId: args.streamId,
      entryId: args.rightEntryId,
    }),
  ]);

  const sharedIds = [...leftDepths.keys()].filter((entryId) =>
    rightDepths.has(entryId),
  );

  if (sharedIds.length === 0) {
    return null;
  }

  const candidates = await Promise.all(
    sharedIds.map(async (entryId) => {
      const entry = await loadEntry(ctx, {
        streamType: args.streamType,
        streamId: args.streamId,
        entryId,
      });
      if (!entry) return null;
      return {
        entry,
        score:
          (leftDepths.get(entryId) ?? Number.MAX_SAFE_INTEGER) +
          (rightDepths.get(entryId) ?? Number.MAX_SAFE_INTEGER),
      };
    }),
  );

  const best = candidates
    .filter(
      (candidate): candidate is { entry: HistoryEntryDoc; score: number } =>
        candidate !== null,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return right.entry.entryTime - left.entry.entryTime;
    })[0];

  return best?.entry ?? null;
}

function compareEntries(left: HistoryEntryDoc, right: HistoryEntryDoc) {
  if (left.entryTime !== right.entryTime) {
    return left.entryTime - right.entryTime;
  }
  return left.entryId.localeCompare(right.entryId);
}
