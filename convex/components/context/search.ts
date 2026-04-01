import { SearchClient } from "@very-coffee/convex-search-features";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { searchConfig } from "./search.config";

export const search = new SearchClient<DataModel, "context">(
  components.search,
  searchConfig,
);
