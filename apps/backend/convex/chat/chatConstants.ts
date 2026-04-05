/**
 * Namespace key under Convex Agent `providerMetadata` for chat app fields
 * (e.g. `turnId`, `threadId` on user/assistant messages).
 */
export const CHAT_PROVIDER_METADATA_NS = "cfd";

/** Key under {@link CHAT_PROVIDER_METADATA_NS} for file attachment canonical refs. */
export const CHAT_CFD_FILE_METADATA_KEY = "file" as const;

export type CfdFileProviderMetadata = {
  storageId: string;
  fileName?: string;
  mimeType: string;
  contentHash?: string;
};
