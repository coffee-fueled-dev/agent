import { describe, expect, test } from "bun:test";
import type { HistoryCallCtx, HistoryClientEvent } from "./events.js";
import { HistoryClient } from "./index.js";
import { components } from "./setup.test.js";

const streams = [{ streamType: "test", kinds: ["a"] }] as const;

function mockHistoryCtx(): HistoryCallCtx {
  return {
    runMutation: async () => ({
      streamType: "test",
      streamId: "s1",
      entryId: "e1",
      kind: "a",
      parentEntryIds: [],
      entryTime: 1,
    }),
    runQuery: async () => null,
  } as HistoryCallCtx;
}

describe("HistoryClient", () => {
  test("constructs with component handle", () => {
    const client = new HistoryClient(components.history, {
      streams: [{ streamType: "test", kinds: ["a"] }],
    });
    expect(client.config.streams).toHaveLength(1);
  });

  test("append notifies subscribers with append event and result", async () => {
    const client = new HistoryClient(components.history, { streams });
    const received: HistoryClientEvent<typeof streams>[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = {
      streamType: "test" as const,
      streamId: "s1",
      entryId: "e1",
      kind: "a" as const,
      parentEntryIds: [] as string[],
    };
    const entry = await client.append(mockHistoryCtx(), args);
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("append");
    if (received[0]?.event === "append") {
      expect(received[0].args).toEqual(args);
      expect(received[0].result).toEqual(entry);
    }
  });
});
