import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";

describe("event bus FIFO eviction (predicate rules)", () => {
  test("per-namespace todo: no eviction under cap", async () => {
    const t = initConvexTest();
    const ns = "tenant-a";
    for (const id of ["e1", "e2", "e3"]) {
      await t.mutation(api.functions.appendEvent, {
        name: "todo",
        streamId: "stream-1",
        eventId: id,
        eventType: "created",
        namespace: ns,
        payload: { title: id },
      });
    }
    const rows = await t.query(api.functions.listBusEntries, {
      namespace: ns,
      limit: 20,
    });
    expect(rows.length).toBe(3);
  });

  test("counter global bucket: no eviction under cap", async () => {
    const t = initConvexTest();
    for (const id of ["c1", "c2", "c3"]) {
      await t.mutation(api.functions.appendEvent, {
        name: "counter",
        streamId: "counter-s",
        eventId: id,
        eventType: "incremented",
        payload: {},
      });
    }
    const rows = await t.query(api.functions.listBusEntries, {
      limit: 20,
    });
    expect(rows.length).toBe(3);
  });

  test("first matching rule: todo matches rule 0 before catch-all rule 2", async () => {
    const t = initConvexTest();
    for (const id of ["t1", "t2", "t3"]) {
      await t.mutation(api.functions.appendEvent, {
        name: "todo",
        streamId: "s",
        eventId: id,
        eventType: "created",
        namespace: "n1",
        payload: { title: id },
      });
    }
    const rows = await t.query(api.functions.listBusEntries, {
      namespace: "n1",
      limit: 10,
    });
    expect(rows.length).toBe(3);
    expect(new Set(rows.map((r) => r.eventId)).has("t1")).toBe(true);
  });
});
