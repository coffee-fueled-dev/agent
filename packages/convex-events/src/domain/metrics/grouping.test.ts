import { describe, expect, test } from "bun:test";
import {
  buildGroupKey,
  fifoBucketKeyForRule,
  GLOBAL_FIFO_BUCKET_KEY,
  matchesRule,
} from "./grouping.js";

describe("grouping", () => {
  test("buildGroupKey empty groupBy is global", () => {
    expect(
      buildGroupKey(
        [],
        {
          namespace: "n",
          streamType: "s",
          streamId: "sid",
          eventType: "e",
        },
      ),
    ).toBe(GLOBAL_FIFO_BUCKET_KEY);
  });

  test("fifoBucketKeyForRule prefixes rule index", () => {
    const entry = {
      namespace: "a",
      streamType: "todo",
      streamId: "s1",
      eventType: "created",
    };
    const k = fifoBucketKeyForRule(1, ["namespace"], entry);
    expect(k).toBe(`1\0a`);
  });

  test("matchesRule filters name and namespace", () => {
    const e = { namespace: "x", streamType: "todo", eventType: "created" };
    expect(matchesRule({}, e)).toBe(true);
    expect(matchesRule({ name: "todo" }, e)).toBe(true);
    expect(matchesRule({ name: "counter" }, e)).toBe(false);
    expect(matchesRule({ namespace: "x" }, e)).toBe(true);
    expect(matchesRule({ namespace: "y" }, e)).toBe(false);
  });
});
