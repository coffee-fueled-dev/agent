import { SearchClient } from "@very-coffee/convex-search-features";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const search = new SearchClient<DataModel, "memory">(components.search, {
  sources: [
    {
      sourceSystem: "memory",
      document: "memoryRecords",
      fields: ["memoryId", "key", "title", "textPreview"],
    },
  ],
});
