import { tool } from "@very-coffee/agent-identity";
import { memoryClient } from "_clients/memory.js";
import type { Id } from "_components/memory/_generated/dataModel.js";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { requireGoogleApiKey } from "../../../../env/models.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { inputArgs, withFormattedResults } from "../../../lib/toolkit.js";

declare module "../../registeredToolMap.js" {
  interface RegisteredToolMap {
    mergeMemory: InferUITool<Tool>;
  }
}

const contentField = z
  .array(z.string())
  .describe(
    "Text chunks to merge; each is indexed and queued for embedding. All chunks attach to the same logical memory and search item (one lexical + one vector row per memory).",
  );

export function mergeMemoryTool() {
  return tool({
    name: "mergeMemory" as const,
    description:
      "Create or update a memory record and index text chunks in lexical and vector search. By default upserts by key (new memory). Use mode append with an existing memoryRecordId to add more searchable text to that memory without creating a new record.",
    inputSchema: inputArgs({
      mode: z
        .enum(["append"])
        .optional()
        .describe(
          'Set to "append" to add chunks to an existing memory; omit for a new memory identified by key.',
        ),
      key: z
        .string()
        .optional()
        .describe(
          "Stable key for this memory within the namespace (required when not appending).",
        ),
      memoryRecordId: z
        .string()
        .optional()
        .describe(
          "Existing memory document id (required when mode is append).",
        ),
      content: contentField,
      title: z
        .string()
        .optional()
        .describe(
          "Short human-readable title for this memory (shown in chat UI). Provide for new plaintext memories.",
        ),
      ontologyNodeLabel: z
        .enum(["Fact", "Preference", "Procedure", "Reference"])
        .optional()
        .describe(
          "Graph ontology node label for this memory (required until a graph node exists; optional on append if the node already exists).",
        ),
      memoryLinks: z
        .array(
          z.discriminatedUnion("edge", [
            z.object({
              edge: z.literal("RELATES_TO"),
              targetMemoryRecordId: z.string(),
            }),
            z.object({
              edge: z.literal("REFINES"),
              targetMemoryRecordId: z.string(),
            }),
            z.object({
              edge: z.literal("SIMILAR_TO"),
              targetMemoryRecordId: z.string(),
              score: z.number(),
            }),
          ]),
        )
        .optional()
        .describe(
          "Optional edges to other memories in the same namespace (RELATES_TO, REFINES, or SIMILAR_TO with score).",
        ),
    }).refine(
      (a) =>
        a.mode === "append"
          ? a.memoryRecordId !== undefined && a.memoryRecordId.length > 0
          : a.key !== undefined && a.key.length > 0,
      {
        message:
          "mergeMemory: provide memoryRecordId when mode is append, otherwise provide key.",
      },
    ),
    handler: async (ctx: ToolRuntimeContext<ConvexAgentEnv>, args) => {
      void args.goal;
      const googleApiKey = requireGoogleApiKey();
      const content = args.content.map((text) => ({ text }));
      if (args.mode === "append") {
        const memoryRecordId = args.memoryRecordId;
        if (!memoryRecordId) {
          throw new Error(
            "mergeMemory: memoryRecordId is required when appending",
          );
        }
        return await withFormattedResults(
          memoryClient.mergeMemory(ctx.env, {
            namespace: ctx.env.namespace,
            mode: "append",
            memoryRecordId,
            content,
            googleApiKey,
            ...(args.title !== undefined ? { title: args.title } : {}),
            ...(args.ontologyNodeLabel !== undefined
              ? { ontologyNodeLabel: args.ontologyNodeLabel }
              : {}),
            ...(args.memoryLinks !== undefined
              ? {
                  memoryLinks: args.memoryLinks.map((l) =>
                    l.edge === "SIMILAR_TO"
                      ? {
                          edge: l.edge,
                          targetMemoryRecordId:
                            l.targetMemoryRecordId as Id<"memoryRecords">,
                          score: l.score,
                        }
                      : {
                          edge: l.edge,
                          targetMemoryRecordId:
                            l.targetMemoryRecordId as Id<"memoryRecords">,
                        },
                  ),
                }
              : {}),
          }),
        );
      }
      const key = args.key;
      if (!key) {
        throw new Error("mergeMemory: key is required when not appending");
      }
      return await withFormattedResults(
        memoryClient.mergeMemory(ctx.env, {
          namespace: ctx.env.namespace,
          key,
          content,
          googleApiKey,
          ...(args.title !== undefined ? { title: args.title } : {}),
          ...(args.ontologyNodeLabel !== undefined
            ? { ontologyNodeLabel: args.ontologyNodeLabel }
            : {}),
          ...(args.memoryLinks !== undefined
            ? {
                memoryLinks: args.memoryLinks.map((l) =>
                  l.edge === "SIMILAR_TO"
                    ? {
                        edge: l.edge,
                        targetMemoryRecordId:
                          l.targetMemoryRecordId as Id<"memoryRecords">,
                        score: l.score,
                      }
                    : {
                        edge: l.edge,
                        targetMemoryRecordId:
                          l.targetMemoryRecordId as Id<"memoryRecords">,
                      },
                ),
              }
            : {}),
        }),
      );
    },
  });
}
