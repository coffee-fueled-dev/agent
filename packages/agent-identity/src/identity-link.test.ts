import { describe, expect, test } from "bun:test";
import { defineAgentIdentity } from "./identity.js";
import { createIdentityLink } from "./identity-link.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import { tool } from "./tool.js";
import { evaluateComposable, toolkit } from "./toolkit.js";

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

describe("createIdentityLink", () => {
  test("links static and runtime hashes for same evaluation", async () => {
    const t = tool({
      name: "t",
      inputSchema: schema,
      handler: async () => 0,
    });
    const graph = toolkit([t], { name: "root" });
    const agent = defineAgentIdentity({
      agentId: "a",
      name: "Agent",
      staticProps: graph.staticProps,
    });
    const evaluated = await evaluateComposable(graph, { env: {} });
    const link = await createIdentityLink(agent, evaluated);

    expect(link.agentId).toBe("a");
    expect(link.agentName).toBe("Agent");
    expect(link.staticHash).toMatch(/^[a-f0-9]{64}$/);
    expect(link.runtimeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(link.staticSnapshot).toBeUndefined();
    expect(link.runtimeSnapshot).toBeUndefined();
  });

  test("includeSnapshots adds normalized snapshots", async () => {
    const t = tool({
      name: "t",
      inputSchema: schema,
      handler: async () => 0,
    });
    const graph = toolkit([t], { name: "root" });
    const agent = defineAgentIdentity({
      agentId: "a",
      name: "Agent",
      staticProps: graph.staticProps,
    });
    const evaluated = await evaluateComposable(graph, { env: {} });
    const link = await createIdentityLink(agent, evaluated, {
      includeSnapshots: true,
    });

    expect(link.staticSnapshot).toBeDefined();
    expect(link.runtimeSnapshot).toBeDefined();
  });
});
