import { describe, expect, test } from "bun:test";
import { createAgentRegistry } from "./agent-registry.js";
import { defineAgentIdentity } from "./identity.js";
import { policy } from "./policy.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import { tool } from "./tool.js";
import {
  hashToolComposableStatic,
  hashToolStaticIdentity,
} from "./tool-identity.js";
import { createToolRegistry } from "./tool-registry.js";
import { toolkit } from "./toolkit.js";

const schema: StandardSchemaV1<{ n: number }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    types: { input: {} as { n: number }, output: {} as { n: number } },
    validate: (v) =>
      typeof v === "object" &&
      v !== null &&
      "n" in v &&
      typeof (v as { n: unknown }).n === "number"
        ? { value: v as { n: number } }
        : { issues: [{ message: "bad" }] },
  },
};

describe("hashToolStaticIdentity", () => {
  test("stable for same static props", async () => {
    const p = policy("p", async () => true);
    const a = {
      kind: "tool" as const,
      name: "t",
      description: "d",
      inputSchema: schema,
      policies: [p],
      instructions: ["i"],
    };
    const b = {
      kind: "tool" as const,
      name: "t",
      description: "d",
      inputSchema: schema,
      policies: [p],
      instructions: ["i"],
    };
    const h1 = await hashToolStaticIdentity(a);
    const h2 = await hashToolStaticIdentity(b);
    expect(h1).toBe(h2);
  });
});

describe("createToolRegistry", () => {
  test("get and getByHash after register", async () => {
    const reg = createToolRegistry();
    const staticProps = {
      kind: "tool" as const,
      name: "add",
      description: undefined,
      inputSchema: schema,
      policies: [] as ReturnType<typeof policy>[],
      instructions: undefined,
    };
    const hash = await reg.register("add", staticProps);
    expect(reg.get("add")?.hash).toBe(hash);
    expect(reg.getByHash(hash)?.key).toBe("add");
    expect(reg.has("add")).toBe(true);
    expect(reg.listKeys()).toContain("add");
  });

  test("last register wins for same key", async () => {
    const reg = createToolRegistry();
    await reg.register("t", { kind: "tool", name: "t", policies: [] });
    await reg.register("t", {
      kind: "tool",
      name: "t",
      description: "v2",
      policies: [],
    });
    expect(
      (reg.get("t")?.staticProps as { description?: string }).description,
    ).toBe("v2");
  });

  test("getByHash last write wins for same hash", async () => {
    const reg = createToolRegistry();
    const staticProps = {
      kind: "tool" as const,
      name: "x",
      policies: [],
      inputSchema: schema,
    };
    const hash = await reg.register("a", staticProps);
    await reg.register("b", staticProps);
    expect(reg.getByHash(hash)?.key).toBe("b");
  });
});

describe("createAgentRegistry", () => {
  test("round-trip and staticHash", async () => {
    const reg = createAgentRegistry();
    const graph = tool({
      name: "n",
      inputSchema: schema,
      handler: async () => 0,
    });
    const agent = defineAgentIdentity({
      agentId: "a1",
      name: "Agent",
      staticProps: graph.staticProps,
    });
    const { staticHash } = await reg.register(agent);
    const got = reg.get("a1");
    expect(got?.staticHash).toBe(staticHash);
    expect(got?.agent.agentId).toBe("a1");
  });

  test("last register wins for same agentId", async () => {
    const reg = createAgentRegistry();
    const g1 = tool({ name: "a", inputSchema: schema, handler: async () => 0 });
    const g2 = tool({ name: "b", inputSchema: schema, handler: async () => 0 });
    await reg.register(
      defineAgentIdentity({
        agentId: "same",
        name: "One",
        staticProps: g1.staticProps,
      }),
    );
    await reg.register(
      defineAgentIdentity({
        agentId: "same",
        name: "Two",
        staticProps: g2.staticProps,
      }),
    );
    expect(reg.get("same")?.agent.name).toBe("Two");
  });
});

describe("hashToolComposableStatic", () => {
  test("hashes tool composable; throws for toolkit", async () => {
    const t = tool({
      name: "x",
      inputSchema: schema,
      handler: async () => 0,
    });
    const tk = toolkit([t], { name: "root" });
    expect(hashToolComposableStatic(t)).resolves.toBeDefined();
    expect(hashToolComposableStatic(tk)).rejects.toThrow(
      'expected composable with kind "tool"',
    );
  });
});
