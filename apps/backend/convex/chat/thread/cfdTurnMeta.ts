import { CHAT_PROVIDER_METADATA_NS } from "../chatConstants.js";

/** Provider metadata blob for a chat turn (`providerMetadata.cfd`). */
export function cfdTurnProviderMetadata(turnId: string, threadId: string) {
  return {
    [CHAT_PROVIDER_METADATA_NS]: {
      turnId,
      threadId,
    },
  };
}
