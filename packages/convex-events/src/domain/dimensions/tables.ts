import { defineTable } from "convex/server";
import { dimensionFields } from "./fields";

export const dimensions = defineTable(dimensionFields).index(
  "by_namespace_kind_value",
  ["namespace", "kind", "value"],
);

export const dimensionsTables = {
  dimensions,
} as const;
