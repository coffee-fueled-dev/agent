import type {
  SearchClientConfig,
  SearchSourceConfig,
  TableNameFor,
} from "../search/client";
import type { DataModel } from "./_generated/dataModel";

const defineSource = <T extends TableNameFor<DataModel>>(
  source: SearchSourceConfig<DataModel, "context", T>,
) => source;

export const searchConfig = {
  sources: [
    defineSource({
      sourceSystem: "context",
      document: "contextEntries",
      fields: ["entryId", "key", "title", "textPreview", "legacyEntryId"],
    }),
  ],
} as const satisfies SearchClientConfig<DataModel, "context">;
