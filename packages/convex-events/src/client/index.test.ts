import { describe, expect, test } from "bun:test";
import { EventsClient } from "./index.js";
import { components } from "./setup.test.js";

describe("EventsClient", () => {
  test("constructs with component handle", () => {
    const client = new EventsClient(components.events, {
      streams: [],
    });
    expect(client.config.streams).toEqual([]);
  });
});
