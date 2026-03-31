import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";

describe("example", () => {
  test("append event", async () => {
    const t = initConvexTest();
    const result = await t.mutation(api.functions.appendEvent, {
      streamType: "todo",
      streamId: "test-stream",
      eventId: "evt-1",
      eventType: "created",
      payload: { title: "hello" },
    });
    expect(result.eventType).toBe("created");
    expect(result.streamId).toBe("test-stream");
  });
});
