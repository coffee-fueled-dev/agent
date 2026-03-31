import { describe, expect, test } from "bun:test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  buildKnnGraph,
  edgeSchema,
  GraphClient,
  leiden,
  nodeSchema,
  normalizeLabel,
} from "./index.js";
import { components } from "./setup.test.js";

/** Minimal app schema so `nodeSchema` can name a real table literal. */
const dummyAppSchema = defineSchema({
  dummy: defineTable({ name: v.string() }),
});

describe("GraphClient", () => {
  test("constructs with component handle", () => {
    const graph = new GraphClient(components.graph, {
      nodes: [nodeSchema(dummyAppSchema, "contextEntry", "dummy")],
      edges: [edgeSchema("SIMILAR_TO", undefined, { directed: false })],
    });
    expect(graph).toBeInstanceOf(GraphClient);
    expect(graph.config.nodes).toHaveLength(1);
    expect(graph.config.edges).toHaveLength(1);
  });

  test("placeholder: helpers are callable (replace with integration tests later)", () => {
    expect(typeof normalizeLabel).toBe("function");
    expect(typeof buildKnnGraph).toBe("function");
    expect(typeof leiden).toBe("function");
    expect(normalizeLabel("  FooBar  ")).toMatch(/foo/);
    expect(leiden(new Map())).toEqual(new Map());
  });
});
