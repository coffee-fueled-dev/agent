import { v } from "convex/values";
import { memoryClient } from "../_clients/memory.js";
import type { Id as MemoryComponentId } from "../_components/memory/_generated/dataModel.js";
import { createEmbeddingModel } from "../_components/memory/_lib.js";
import { components } from "../_generated/api.js";
import { action } from "../_generated/server.js";
import { getGoogleApiKey } from "../env.js";

async function embedTextForFileArm(
  text: string,
  googleApiKey: string,
): Promise<number[] | undefined> {
  const model = createEmbeddingModel(googleApiKey);
  const { embeddings } = await model.doEmbed({ values: [text] });
  const raw = embeddings[0];
  return raw ? [...raw] : undefined;
}

export const searchMemoriesForComposer = action({
  args: {
    namespace: v.string(),
    query: v.string(),
    lexicalQuery: v.optional(v.string()),
    fileEmbedding: v.optional(v.array(v.float64())),
    /** Server-side embedding for the file vector arm when `fileEmbedding` is omitted. */
    fileTextForEmbedding: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      sourceRef: v.string(),
      rrfScore: v.number(),
      contributions: v.array(
        v.object({
          armId: v.string(),
          rank: v.number(),
          score: v.number(),
        }),
      ),
      lexical: v.any(),
      vector: v.any(),
      mimeType: v.union(v.string(), v.null()),
      fileName: v.union(v.string(), v.null()),
      title: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const googleApiKey = getGoogleApiKey();
    if (!googleApiKey) {
      throw new Error(
        "searchMemoriesForComposer: set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) on this Convex deployment.",
      );
    }

    let fileEmbedding = args.fileEmbedding;
    if (
      (!fileEmbedding || fileEmbedding.length === 0) &&
      args.fileTextForEmbedding?.trim()
    ) {
      fileEmbedding = await embedTextForFileArm(
        args.fileTextForEmbedding.trim(),
        googleApiKey,
      );
    }

    const hits = await memoryClient.searchMemory(ctx, {
      namespace: args.namespace,
      query: args.query,
      lexicalQuery: args.lexicalQuery,
      embedding: fileEmbedding,
      limit: args.limit ?? 10,
      perArmLimit: args.limit ?? 10,
      googleApiKey,
    });
    const out: Array<{
      sourceRef: string;
      rrfScore: number;
      contributions: (typeof hits)[number]["contributions"];
      lexical: (typeof hits)[number]["lexical"];
      vector: (typeof hits)[number]["vector"];
      mimeType: string | null;
      fileName: string | null;
      title: string | null;
    }> = [];
    for (const h of hits) {
      const maps = await ctx.runQuery(
        components.memory.public.sourceMaps.listSourceMapsForMemory,
        {
          namespace: args.namespace,
          memoryRecordId: h.sourceRef as MemoryComponentId<"memoryRecords">,
        },
      );
      const storageRow = maps.find((m) => m.contentSource.type === "storage");
      const record = await ctx.runQuery(
        components.memory.public.records.getMemoryRecord,
        {
          namespace: args.namespace,
          memoryRecordId: h.sourceRef as MemoryComponentId<"memoryRecords">,
        },
      );
      out.push({
        ...h,
        mimeType: storageRow?.mimeType ?? null,
        fileName: storageRow?.fileName ?? null,
        title: record?.title ?? null,
      });
    }
    return out;
  },
});
