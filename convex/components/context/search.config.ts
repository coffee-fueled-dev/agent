import type { SearchClientConfig } from "@very-coffee/convex-search-features";
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
