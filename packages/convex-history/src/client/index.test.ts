import { describe, expect, test } from "bun:test";
import { HistoryClient } from "./index.js";
import { components } from "./setup.test.js";

describe("HistoryClient", () => {
  test("constructs with component handle", () => {
    const client = new HistoryClient(components.history, {
      streams: [{ streamType: "test", kinds: ["a"] }],
    });
    expect(client.config.streams).toHaveLength(1);
  });
});
