import type { SearchClientConfig } from "../search/client";
import type { DataModel } from "./_generated/dataModel";

export const searchConfig = {
  sources: [
    {
      sourceSystem: "context",
      document: "contextEntries",
      fields: ["entryId", "key", "title", "textPreview", "legacyEntryId"],
    },
  ],
} as const satisfies SearchClientConfig<DataModel, "context">;
