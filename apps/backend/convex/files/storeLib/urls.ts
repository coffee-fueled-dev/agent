import type { Id } from "../../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../../_generated/server.js";
import { mintFileUrlForNamespace } from "../storageAccess.js";

export async function handleGenerateFileUploadUrl(ctx: MutationCtx) {
  return await ctx.storage.generateUploadUrl();
}

export async function handleGetAttachmentPublicUrl(
  ctx: QueryCtx,
  args: { namespace: string; storageId: string },
) {
  return await mintFileUrlForNamespace(ctx, {
    namespace: args.namespace,
    storageId: args.storageId as Id<"_storage">,
  });
}
