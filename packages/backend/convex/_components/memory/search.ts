import { SearchClient as LexicalSearchClient } from "@very-coffee/convex-lexical-search";
import { SearchClient as VectorSearchClient } from "@very-coffee/convex-vector-search";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const MEMORY_SOURCE_SYSTEM = "memory" as const;

export const lexicalSearch = new LexicalSearchClient<DataModel, "memory">(
  components.lexicalSearch,
  {
    sources: [
      {
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        document: "memoryRecords",
      },
    ],
  },
);

export const vectorSearch = new VectorSearchClient<DataModel, "memory">(
  components.vectorSearch,
  {
    sources: [
      {
        sourceSystem: MEMORY_SOURCE_SYSTEM,
        document: "memoryRecords",
      },
    ],
  },
);
