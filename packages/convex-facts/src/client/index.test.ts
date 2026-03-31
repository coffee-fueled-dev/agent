import { describe, expect, test } from "bun:test";
import { FactsClient } from "./index.js";
import { components } from "./setup.test.js";

describe("FactsClient", () => {
  test("constructs with component handle", () => {
    const client = new FactsClient(components.facts, {
      entities: [],
      edgeKinds: [],
      partitions: [],
    });
    expect(client.config.entities).toEqual([]);
  });
});
