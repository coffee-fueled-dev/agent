import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  graph_labels: defineTable({
    value: v.string(),
    displayValue: v.string(),
    type: v.union(v.literal("node"), v.literal("edge")),
  })
    .index("by_type_value", ["type", "value"])
    .searchIndex("search_type_displayValue", {
      searchField: "displayValue",
      filterFields: ["type"],
    }),

  graph_nodes: defineTable({
    label: v.id("graph_labels"),
    key: v.string(),
  })
    .index("by_label_key", ["label", "key"])
    .index("by_key", ["key"]),

  graph_edges: defineTable({
    label: v.id("graph_labels"),
    from: v.string(),
    to: v.string(),
    directed: v.boolean(),
    properties: v.optional(v.any()),
  })
    .index("by_label_from_to", ["label", "from", "to"])
    .index("by_label_to_from", ["label", "to", "from"]),
});
