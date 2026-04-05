import { tool } from "@very-coffee/agent-identity";
import { components, internal } from "_generated/api.js";
import type { InferUITool, Tool } from "ai";
import { requireGoogleApiKey } from "env/models.js";
import type { ResolvedMemoryRecord } from "memories/resolveMemories.js";
import { z } from "zod/v4";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    searchMemories: InferUITool<Tool>;
  }
}

export function searchMemoriesTool() {
  return tool({
    name: "searchMemories" as const,
    description:
      "Hybrid search over session memory (lexical + vector, RRF-ranked).",
    inputSchema: inputArgs({
      query: z.string().describe("Natural-language query to search for."),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max fused results to return (default 20)."),
      perArmLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max candidates per lexical/vector arm before RRF."),
      k: z.number().optional().describe("RRF rank constant (default 60)."),
    }),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      const googleApiKey = requireGoogleApiKey();
      return await withFormattedResults(
        (async (): Promise<
          Array<{
            rrfScore: number;
            contributions: Array<{
              armId: string;
              rank: number;
              score: number;
            }>;
            memoryRecordId: string;
            title: string | null;
            text: string | null;
            sources: ResolvedMemoryRecord["sources"];
          }>
        > => {
          const hits = await ctx.env.runAction(
            components.memory.public.search.searchMemory,
            {
              namespace: ctx.env.namespace,
              query: args.query,
              limit: args.limit,
              perArmLimit: args.perArmLimit,
              k: args.k,
              googleApiKey,
            },
          );
          if (hits.length === 0) return [];

          const uniqueIds: string[] = [];
          const seenId = new Set<string>();
          for (const h of hits) {
            if (!seenId.has(h.sourceRef)) {
              seenId.add(h.sourceRef);
              uniqueIds.push(h.sourceRef);
            }
          }

          const resolved = await ctx.env.runAction(
            internal.memories.resolveMemories.resolveMemoriesAction,
            {
              namespace: ctx.env.namespace,
              memoryRecordIds: uniqueIds,
            },
          );

          const byId = new Map(
            resolved.map((r) => [r.memoryRecordId, r] as const),
          );

          const seenOut = new Set<string>();
          const out: Array<{
            rrfScore: number;
            contributions: (typeof hits)[number]["contributions"];
            memoryRecordId: string;
            title: string | null;
            text: string | null;
            sources: ResolvedMemoryRecord["sources"];
          }> = [];

          for (const h of hits) {
            if (seenOut.has(h.sourceRef)) continue;
            seenOut.add(h.sourceRef);
            const mem = byId.get(h.sourceRef);
            if (!mem) continue;
            out.push({
              rrfScore: h.rrfScore,
              contributions: h.contributions,
              memoryRecordId: mem.memoryRecordId,
              title: mem.title,
              text: mem.text,
              sources: mem.sources,
            });
          }

          return out;
        })(),
      );
    },
  });
}
