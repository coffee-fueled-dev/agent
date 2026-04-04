import { describe, expect, test } from "bun:test";
import type {
  LexicalSearchClientEvent,
  LexicalSearchMutationCallCtx,
  LexicalSearchSearchCtx,
} from "./events.js";
import { SearchClient } from "./index.js";
import { components } from "./setup.test.js";

const sources = [
  { sourceSystem: "test", document: "contextEntries" as never },
] as const;

function mockMutationCtx(result: unknown): LexicalSearchMutationCallCtx {
  return {
    runMutation: async () => result,
    runQuery: async () => null,
  } as unknown as LexicalSearchMutationCallCtx;
}

function mockSearchCtx(hits: unknown[]): LexicalSearchSearchCtx {
  return {
    runQuery: async () => hits,
  } as unknown as LexicalSearchSearchCtx;
}

describe("SearchClient", () => {
  test("constructs with component handle", () => {
    const client = new SearchClient(components.search, {
      sources: [
        {
          sourceSystem: "test",
          document: "contextEntries" as never,
          fields: ["entryId"],
        },
      ],
    });
    expect(client.config.sources).toHaveLength(1);
  });

  test("upsertItem notifies with result string", async () => {
    const client = new SearchClient(components.search, { sources });
    const received: LexicalSearchClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = {
      namespace: "n",
      sourceSystem: "test",
      sourceRef: "ref",
    };
    await client.upsertItem(mockMutationCtx("upsert-id"), args);
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("upsertItem");
    if (received[0]?.event === "upsertItem") {
      expect(received[0].args).toEqual(args);
      expect(received[0].result).toBe("upsert-id");
    }
  });

  test("deleteItem notifies with null result", async () => {
    const client = new SearchClient(components.search, { sources });
    const received: LexicalSearchClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = {
      namespace: "n",
      sourceSystem: "test",
      sourceRef: "ref",
    };
    await client.deleteItem(mockMutationCtx(null), args);
    expect(received).toEqual([{ event: "deleteItem", args, result: null }]);
  });

  test("appendTextSlice notifies with result string", async () => {
    const client = new SearchClient(components.search, { sources });
    const received: LexicalSearchClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const args = {
      namespace: "n",
      sourceSystem: "test",
      sourceRef: "ref",
      propKey: "body",
      text: "hi",
    };
    await client.appendTextSlice(mockMutationCtx("slice-id"), args);
    expect(received[0]?.event).toBe("appendTextSlice");
    if (received[0]?.event === "appendTextSlice") {
      expect(received[0].result).toBe("slice-id");
    }
  });

  test("search notifies with hits array", async () => {
    const client = new SearchClient(components.search, { sources });
    const received: LexicalSearchClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const hits = [
      {
        _creationTime: 1,
        _id: "h1",
        namespace: "n",
        propertyHits: [] as Array<{ propKey: string; text: string }>,
        sourceRef: "r",
        sourceSystem: "test",
        updatedAt: 1,
      },
    ];
    const args = { namespace: "n", query: "q" };
    const out = await client.search(mockSearchCtx(hits), args);
    expect(out).toEqual(hits);
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("search");
    if (received[0]?.event === "search") {
      expect(received[0].args).toEqual(args);
      expect(received[0].result).toEqual(hits);
    }
  });
});
