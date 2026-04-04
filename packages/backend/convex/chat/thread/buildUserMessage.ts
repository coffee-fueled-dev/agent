import type { UserContent, UserModelMessage } from "ai";
import { components } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import type { ActionCtx, MutationCtx } from "../../_generated/server.js";

/** Convex `Agent` expects `ActionCtx & Record<string, unknown>`. */
export function agentActionCtx(
  ctx: ActionCtx,
): ActionCtx & Record<string, unknown> {
  return ctx as ActionCtx & Record<string, unknown>;
}

function getFileParts(url: string, mediaType: string, filename?: string) {
  const filePart = {
    type: "file" as const,
    data: new URL(url),
    mediaType,
    filename,
  };
  const imagePart = mediaType.startsWith("image/")
    ? ({
        type: "image" as const,
        image: new URL(url),
        mediaType,
      } satisfies UserContent[number])
    : undefined;
  return { filePart, imagePart };
}

export type MessageBuildCtx = Pick<
  MutationCtx,
  "runMutation" | "storage" | "db" | "runQuery"
>;

type UserMessageParts = Exclude<UserModelMessage["content"], string>;

async function appendFileAttachmentParts(
  ctx: MessageBuildCtx,
  attachment: {
    storageId: string;
    fileName: string;
    mimeType: string;
    contentHash: string;
  },
  fileIds: string[],
  content: UserMessageParts,
) {
  const hash =
    attachment.contentHash.trim().length > 0
      ? attachment.contentHash
      : "memory-attachment";
  const { fileId } = await ctx.runMutation(components.agent.files.addFile, {
    storageId: attachment.storageId,
    hash,
    filename: attachment.fileName,
    mimeType: attachment.mimeType,
  });
  fileIds.push(fileId);

  const rawUrl = await ctx.storage.getUrl(
    attachment.storageId as Id<"_storage">,
  );
  if (!rawUrl) {
    throw new Error(`Missing file in storage: ${attachment.fileName}`);
  }
  const { filePart, imagePart } = getFileParts(
    rawUrl,
    attachment.mimeType || "application/octet-stream",
    attachment.fileName,
  );
  content.push(imagePart ?? filePart);
}

export async function buildUserMessageWithFiles(
  ctx: MessageBuildCtx,
  prompt: string,
  attachments:
    | Array<{
        storageId: string;
        fileName: string;
        mimeType: string;
        contentHash: string;
      }>
    | undefined,
): Promise<{ message: UserModelMessage; fileIds: string[] }> {
  const fileIds: string[] = [];
  const content: UserMessageParts = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  for (const attachment of attachments ?? []) {
    await appendFileAttachmentParts(ctx, attachment, fileIds, content);
  }
  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }
  return { message: { role: "user", content }, fileIds };
}
