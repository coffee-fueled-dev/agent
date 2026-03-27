import { components } from "../../_generated/api";
import type { QueryCtx } from "../../_generated/server";
import { communityApi } from "./deps";

const entriesApi = components.context.public.entries;

export async function getEntryGraphContextHandler(
  ctx: QueryCtx,
  args: { namespace: string; entryId: string },
) {
  const neighbors: Array<{ neighbor: string; score: number }> =
    await ctx.runQuery(communityApi.getNeighborEdges, {
      entryId: args.entryId,
    });

  const assignment = await ctx.runQuery(communityApi.getCommunityForEntry, {
    namespace: args.namespace,
    entryId: args.entryId,
  });

  let communityMembers: string[] = [];
  if (assignment) {
    communityMembers = await ctx.runQuery(communityApi.getCommunityMembers, {
      namespace: args.namespace,
      communityId: assignment.communityId,
    });
  }

  const neighborIds = neighbors.map((n) => n.neighbor);
  const [metas, accessStats] = await Promise.all([
    neighborIds.length
      ? (ctx.runQuery(communityApi.getEntryMetas, {
          namespace: args.namespace,
          entryIds: neighborIds,
        }) as Promise<
          Array<{ entryId: string; title?: string; textPreview: string }>
        >)
      : Promise.resolve([]),
    neighborIds.length
      ? (ctx.runQuery(entriesApi.getAccessStatsBatch, {
          entryIds: neighborIds,
        }) as Promise<
          Record<
            string,
            {
              decayedScore: number;
              totalAccesses: number;
              lastAccessTime: number;
            }
          >
        >)
      : Promise.resolve({} as Record<string, never>),
  ]);
  const metaMap = new Map(metas.map((m) => [m.entryId, m]));

  const fileMap = new Map<string, string>();
  for (const id of neighborIds) {
    const file = await ctx.db
      .query("contextFiles")
      .withIndex("by_entryId", (q: any) => q.eq("entryId", id))
      .first();
    if (file) fileMap.set(id, file.mimeType);
  }

  return {
    neighbors: neighbors.map((n) => ({
      id: n.neighbor,
      score: n.score,
      title: metaMap.get(n.neighbor)?.title,
      textPreview: metaMap.get(n.neighbor)?.textPreview,
      mimeType: fileMap.get(n.neighbor),
      decayedScore: accessStats[n.neighbor]?.decayedScore,
    })),
    communityMembers,
  };
}
