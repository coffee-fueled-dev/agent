import { describe, expect, test } from "bun:test";
import type { FactsCallCtx, FactsClientEvent } from "./events.js";
import { FactsClient } from "./index.js";
import { components } from "./setup.test.js";

function mockFactsCtx(): FactsCallCtx {
  return {
    runMutation: async () => null,
    runQuery: async () => null,
  } as FactsCallCtx;
}

describe("FactsClient", () => {
  test("constructs with component handle", () => {
    const client = new FactsClient(components.facts, {
      entities: [],
      edgeKinds: [],
      partitions: [],
    });
    expect(client.config.entities).toEqual([]);
  });

  test("sync.upsert notifies with syncUpsert", async () => {
    const client = new FactsClient(components.facts, {
      entities: [],
      edgeKinds: [],
      partitions: [],
    });
    const received: FactsClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = {
      namespace: "ns",
      items: [] as {
        entity: string;
        entityType: string;
        order: number[];
        labels: string[];
      }[],
      edges: [] as {
        kind: string;
        from: string;
        to: string;
      }[],
    };
    await client.sync.upsert(mockFactsCtx(), args);
    expect(received).toEqual([{ event: "syncUpsert", args, result: null }]);
  });

  test("sync.remove notifies with syncRemove", async () => {
    const client = new FactsClient(components.facts, {
      entities: [],
      edgeKinds: [],
      partitions: [],
    });
    const received: FactsClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = { namespace: "ns", entities: ["a"] };
    await client.sync.remove(mockFactsCtx(), args);
    expect(received).toEqual([{ event: "syncRemove", args, result: null }]);
  });

  test("batch().commit notifies with batchCommit only", async () => {
    const client = new FactsClient(components.facts, {
      entities: [],
      edgeKinds: [],
      partitions: [],
    });
    const received: FactsClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    await client.batch("ns").commit(mockFactsCtx());
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("batchCommit");
    if (received[0]?.event === "batchCommit") {
      expect(received[0].args.namespace).toBe("ns");
      expect(received[0].result).toBeNull();
    }
  });
});
