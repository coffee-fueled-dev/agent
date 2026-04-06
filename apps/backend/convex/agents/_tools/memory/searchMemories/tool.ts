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

const armBiasSchema = z
  .object({
    lexical: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        `Make this higher when the literal words, identifiers, or rare tokens matter. 
        Large indexed bodies can score many keyword hits—increase vectorQuery instead 
        if results feel dominated by verbose or off-topic lexical matches.`,
      ),
    vector: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        `Make this higher when the general meaning of the query is more important than the literal words. 
        Boosting this will also help to find short, specific memories when results from the lexical arm may contain frequent
        matches that are not relevant to the semantic meaning of the query.`,
      ),
    file: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Make this higher when relation to the embedded file is more important than the query text.",
      ),
  })
  .optional()
  .describe(
    "Balance the hybrid search arms before reciprocal-rank fusion (RRF). Provide non-negative relative weights; they are normalized to sum to 1 across arms that are eligible for this call (lexical if text search applies; vectorQuery if the query is embedded; vectorFile if a file embedding is used). Omitted keys default to 1 before normalization. Set a weight to 0 to disable that arm entirely (skips its retrieval). Increase lexical when precise term overlap matters; increase vectorQuery when meaning and context matter more than literal word frequency; tune vectorFile when comparing an attached file’s embedding against query-based results.",
  );

export function searchMemoriesTool() {
  return tool({
    name: "searchMemories" as const,
    description:
      "Hybrid search over session memory: full-text (lexical) plus vector similarity, fused with RRF. Use optional armBias to weight keyword vs semantic (and optional file) arms when results are skewed—e.g. favor vectorQuery if large corpora win on raw term hits but a short factual memory is more relevant.",
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
      armBias: armBiasSchema,
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
              armBias: args.armBias,
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
