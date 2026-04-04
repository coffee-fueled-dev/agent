import type { UserContent, UserModelMessage } from "ai";
import { components } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import type { ActionCtx, MutationCtx } from "../../_generated/server.js";
import { mintFileUrlForNamespace } from "../../files/storageAccess.js";
import {
  type CfdFileProviderMetadata,
  CHAT_CFD_FILE_METADATA_KEY,
  CHAT_PROVIDER_METADATA_NS,
} from "../chatConstants.js";

/** Convex `Agent` expects `ActionCtx & Record<string, unknown>`. */
export function agentActionCtx(
  ctx: ActionCtx,
): ActionCtx & Record<string, unknown> {
  return ctx as ActionCtx & Record<string, unknown>;
}

function getFileParts(
  url: string,
  mediaType: string,
  filename: string | undefined,
  fileMeta: CfdFileProviderMetadata,
) {
  const fileProviderMetadata = {
    [CHAT_PROVIDER_METADATA_NS]: {
      [CHAT_CFD_FILE_METADATA_KEY]: fileMeta,
    },
  };
  const filePart = {
    type: "file" as const,
    data: new URL(url),
    mediaType,
    filename,
    providerMetadata: fileProviderMetadata,
  };
  const imagePart = mediaType.startsWith("image/")
    ? {
        type: "image" as const,
        image: new URL(url),
        mediaType,
        providerMetadata: fileProviderMetadata,
      }
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
  namespace: string,
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

  const url = await mintFileUrlForNamespace(ctx, {
    namespace,
    storageId: attachment.storageId as Id<"_storage">,
  });
  const fileMeta: CfdFileProviderMetadata = {
    storageId: attachment.storageId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType || "application/octet-stream",
    contentHash: attachment.contentHash,
  };
  const { filePart, imagePart } = getFileParts(
    url,
    fileMeta.mimeType,
    attachment.fileName,
    fileMeta,
  );
  content.push(imagePart ?? filePart);
}

export async function buildUserMessageWithFiles(
  ctx: MessageBuildCtx,
  args: {
    namespace: string;
    prompt: string;
    attachments:
      | Array<{
          storageId: string;
          fileName: string;
          mimeType: string;
          contentHash: string;
        }>
      | undefined;
  },
): Promise<{ message: UserModelMessage; fileIds: string[] }> {
  const { namespace, prompt, attachments } = args;
  const fileIds: string[] = [];
  const content: UserMessageParts = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  for (const attachment of attachments ?? []) {
    await appendFileAttachmentParts(
      ctx,
      namespace,
      attachment,
      fileIds,
      content,
    );
  }
  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }
  return { message: { role: "user", content }, fileIds };
}
