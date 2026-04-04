import { describe, expect, test } from "bun:test";
import type {
  FingerprintCallCtx,
  FingerprintClientEvent,
} from "./index.js";
import { FingerprintClient } from "./index.js";
import { components } from "./setup.test.js";

const agentMutationResult = {
  registrationId: "reg_agent",
  staticVersionId: "sv_1",
  created: { registration: true, staticVersion: true },
};

const toolMutationResult = {
  registrationId: "reg_tool",
  toolVersionId: "tv_1",
  created: { toolRegistration: true, toolVersion: true },
};

const recordTurnResult = {
  bindingId: "bind_1",
  created: {
    binding: true,
    registration: true,
    runtimeVersion: true,
    staticVersion: true,
  },
  registrationId: "reg_agent",
  runtimeVersionId: "rv_1",
  staticVersionId: "sv_1",
  toolResults: [] as Array<{
    created: { toolRegistration: boolean; toolVersion: boolean };
    registrationId: string;
    toolHash: string;
    toolKey: string;
    toolVersionId: string;
  }>,
};

function mockMutationCtx(sequence: Array<Record<string, unknown>>): {
  ctx: FingerprintCallCtx;
  calls: number;
} {
  let i = 0;
  const ctx = {
    runMutation: async () => {
      const next = sequence[i];
      if (next === undefined) throw new Error(`unexpected runMutation call ${i}`);
      i++;
      return next;
    },
    runQuery: async () => null,
  } as FingerprintCallCtx;
  return { ctx, get calls() {
    return i;
  } };
}

describe("FingerprintClient", () => {
  test("constructs with component handle", () => {
    const handle = components.agentFingerprints;
    const client = new FingerprintClient(handle);
    expect(client).toBeInstanceOf(FingerprintClient);
    expect(client.component).toEqual(handle);
  });

  test("registerAgent notifies subscribers with result", async () => {
    const client = new FingerprintClient(components.agentFingerprints);
    const received: FingerprintClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const { ctx } = mockMutationCtx([agentMutationResult]);
    const args = {
      agentId: "a1",
      name: "Agent",
      staticHash: "sh",
    };
    const out = await client.registerAgent(ctx, args);
    expect(out).toEqual(agentMutationResult);
    expect(received).toEqual([
      { event: "registerAgent", args, result: agentMutationResult },
    ]);
  });

  test("registerTool notifies subscribers with result", async () => {
    const client = new FingerprintClient(components.agentFingerprints);
    const received: FingerprintClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const { ctx } = mockMutationCtx([toolMutationResult]);
    const args = { toolKey: "t1", toolHash: "th" };
    const out = await client.registerTool(ctx, args);
    expect(out).toEqual(toolMutationResult);
    expect(received).toEqual([
      { event: "registerTool", args, result: toolMutationResult },
    ]);
  });

  test("registerAgentAndTools emits single registerAgentAndTools event", async () => {
    const client = new FingerprintClient(components.agentFingerprints);
    const received: FingerprintClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const { ctx } = mockMutationCtx([
      agentMutationResult,
      toolMutationResult,
      toolMutationResult,
    ]);
    const args = {
      agentId: "a1",
      name: "Agent",
      staticHash: "sh",
      tools: new Map<string, string>([
        ["x", "h1"],
        ["y", "h2"],
      ]),
    };
    await client.registerAgentAndTools(ctx, args);
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("registerAgentAndTools");
    if (received[0]?.event === "registerAgentAndTools") {
      expect(received[0].args).toEqual(args);
      expect(received[0].result.agent).toEqual(agentMutationResult);
      expect(received[0].result.tools).toEqual([
        { toolKey: "x", toolHash: "h1", result: toolMutationResult },
        { toolKey: "y", toolHash: "h2", result: toolMutationResult },
      ]);
    }
  });

  test("recordEvaluation notifies with recordEvaluation", async () => {
    const client = new FingerprintClient(components.agentFingerprints);
    const received: FingerprintClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const { ctx } = mockMutationCtx([recordTurnResult]);
    const args = {
      agentId: "a1",
      agentName: "A",
      staticHash: "sh",
      runtimeHash: "rh",
      threadId: "th1",
      messageId: "m1",
      tools: [],
    };
    const out = await client.recordEvaluation(ctx, args);
    expect(out).toEqual(recordTurnResult);
    expect(received).toEqual([
      { event: "recordEvaluation", args, result: recordTurnResult },
    ]);
  });

  test("recordEvaluationForRegisteredAgent notifies only that event", async () => {
    const client = new FingerprintClient(components.agentFingerprints);
    const received: FingerprintClientEvent[] = [];
    client.subscribe("t", (_ctx, p) => {
      received.push(p);
    });
    const { ctx } = mockMutationCtx([recordTurnResult]);
    const args = {
      agent: {
        agentId: "a1",
        name: "A",
        staticHash: "sh",
      },
      runtimeHash: "rh",
      threadId: "th1",
      messageId: "m1",
      tools: [],
    };
    const out = await client.recordEvaluationForRegisteredAgent(ctx, args);
    expect(out).toEqual(recordTurnResult);
    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe("recordEvaluationForRegisteredAgent");
    if (received[0]?.event === "recordEvaluationForRegisteredAgent") {
      expect(received[0].args).toEqual(args);
      expect(received[0].result).toEqual(recordTurnResult);
    }
  });
});
