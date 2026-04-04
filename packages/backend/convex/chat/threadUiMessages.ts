import { toUIMessages } from "@convex-dev/agent";
import type { MessageDoc } from "@convex-dev/agent/validators";
import type { UIMessage } from "../agents/_tools/uiMessage.js";

/** Merged into each UI message from `providerMetadata.cfd` and thread id. */
export type ThreadMessageMetadata = {
  threadId: string;
  turnId?: string;
};

const CFD_NS = "cfd";

function cfdMeta(doc: MessageDoc): { turnId?: string } | undefined {
  const cfd = doc.providerMetadata?.[CFD_NS] as
    | { turnId?: string }
    | undefined;
  if (!cfd || typeof cfd !== "object") return undefined;
  return { ...(cfd.turnId !== undefined ? { turnId: cfd.turnId } : {}) };
}

/**
 * Convex Agent {@link toUIMessages} plus thread-level fields on each row for clients.
 */
export function toThreadUIMessages(
  threadId: string,
  docs: MessageDoc[],
): UIMessage<ThreadMessageMetadata>[] {
  const base = toUIMessages(docs) as UIMessage<ThreadMessageMetadata>[];
  const byId = new Map<string, MessageDoc>();
  for (const d of docs) {
    byId.set(d._id, d);
  }
  return base.map((m) => {
    const doc = byId.get(m.id);
    const cfd = doc ? cfdMeta(doc) : undefined;
    return {
      ...m,
      metadata: {
        ...(m.metadata !== undefined &&
        typeof m.metadata === "object" &&
        m.metadata !== null
          ? (m.metadata as Record<string, unknown>)
          : {}),
        threadId,
        ...cfd,
      },
    };
  });
}
