import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  graph_labels: defineTable({
    value: v.string(),
    displayValue: v.string(),
  })
    .index("by_value", ["value"])
    .searchIndex("search_displayValue", { searchField: "displayValue" }),

  graph_nodes: defineTable({
    label: v.string(),
    key: v.string(),
  })
    .index("by_label_key", ["label", "key"])
    .index("by_key", ["key"]),

  graph_edges: defineTable({
    label: v.string(),
    from: v.string(),
    to: v.string(),
    directed: v.boolean(),
    properties: v.optional(v.any()),
  })
    .index("by_label_from_to", ["label", "from", "to"])
    .index("by_label_to_from", ["label", "to", "from"]),
});
