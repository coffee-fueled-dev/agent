import { tool } from "@very-coffee/agent-identity";
import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { components } from "../../../../_generated/api.js";
import { requireGoogleApiKey } from "../../../../env.js";
import type { ConvexAgentEnv } from "../../../lib/customFunctions.js";
import type { ToolRuntimeContext } from "../../../lib/toolkit.js";
import { withFormattedResults } from "../../../lib/toolkit.js";

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
    inputSchema: z
      .object({
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
      })
      .refine(
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
      const googleApiKey = requireGoogleApiKey();
      const content = args.content.map((text) => ({ text }));
      if (args.mode === "append") {
        const memoryRecordId = args.memoryRecordId;
        if (!memoryRecordId) {
          throw new Error("mergeMemory: memoryRecordId is required when appending");
        }
        return await withFormattedResults(
          ctx.env.runMutation(components.memory.public.store.mergeMemory, {
            namespace: ctx.env.namespace,
            mode: "append",
            memoryRecordId,
            content,
            googleApiKey,
          }),
        );
      }
      const key = args.key;
      if (!key) {
        throw new Error("mergeMemory: key is required when not appending");
      }
      return await withFormattedResults(
        ctx.env.runMutation(components.memory.public.store.mergeMemory, {
          namespace: ctx.env.namespace,
          key,
          content,
          googleApiKey,
        }),
      );
    },
  });
}
