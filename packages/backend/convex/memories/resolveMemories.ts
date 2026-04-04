import type { ActionCtx, MutationCtx } from "_generated/server.js";
import { internalAction } from "_generated/server.js";
import { v } from "convex/values";
import { memoryClient } from "../_clients/memory.js";

/** Resolved source for a memory record (storage file or other content source). */
export type ResolvedMemorySource =
  | {
      kind: "storage";
      storageId: string;
      url: string | null;
      fileName?: string;
      mimeType?: string;
    }
  | {
      kind: "other";
      contentSource: { type: string; id: string };
      detail: Record<string, unknown>;
    };

/** Per-source map entry types (aligned with {@link memoryClient} `sourceMaps` names). */
export type ResolvedStorageMemorySource = Extract<
  ResolvedMemorySource,
  { kind: "storage" }
>;
export type ResolvedOtherMemorySource = Extract<
  ResolvedMemorySource,
  { kind: "other" }
>;

export type ResolvedMemoryRecord = {
  memoryRecordId: string;
  title: string | null;
  text: string | null;
  sources: ResolvedMemorySource[];
};

/** Namespace key under Convex Agent `providerMetadata` for chat app fields. */
export const CHAT_PROVIDER_METADATA_NS = "cfd";

/** Invoked from the {@code shareMemories} human tool (action context). */
export const resolveMemoriesAction = internalAction({
  args: {
    namespace: v.string(),
    memoryRecordIds: v.array(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await resolveMemories(ctx, args.namespace, args.memoryRecordIds);
  },
});

type ResolveCtx = Pick<MutationCtx | ActionCtx, "runQuery" | "storage">;

/**
 * Loads memory records and source maps for sharing (human tool + user message sidecar).
 */
export async function resolveMemories(
  ctx: ResolveCtx,
  namespace: string,
  memoryRecordIds: readonly string[],
): Promise<ResolvedMemoryRecord[]> {
  const out: ResolvedMemoryRecord[] = [];
  for (const rawId of memoryRecordIds) {
    const { memoryRecord, sources } =
      await memoryClient.resolveMemoryRecordSources(ctx, {
        namespace,
        memoryRecordId: rawId,
      });
    const title = memoryRecord?.title?.trim()
      ? memoryRecord.title.trim()
      : null;
    const text = memoryRecord?.text?.trim() ? memoryRecord.text.trim() : null;

    if (!text && sources.length === 0) {
      out.push({
        memoryRecordId: rawId,
        title,
        text: null,
        sources: [],
      });
      continue;
    }

    out.push({
      memoryRecordId: rawId,
      title,
      text,
      sources,
    });
  }
  return out;
}
