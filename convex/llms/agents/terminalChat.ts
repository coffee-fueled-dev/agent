import { Agent } from "@convex-dev/agent";
import type { Tool } from "ai";
import { components } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  defineRegisteredMachineAgent,
  type RegisteredMachineAgent,
  recordRegisteredMachineAgentTurn,
} from "../identity";
import { languageModels } from "../models";
import type { ToolkitContext } from "../tools/_libs/customFunctions";
import { type Composable, toolkit } from "../tools/_libs/toolkit";
import { searchMemoryTool } from "../tools/searchMemory/tool";
import { storeMemoryTool } from "../tools/storeMemory/tool";

const baseInstructions = [
  "You are a helpful terminal chat assistant.",
  "Keep answers concise unless the user asks for more detail.",
  "Prefer plain text and avoid markdown unless it improves clarity.",
  "Treat retrieved memories as useful but fallible context.",
  "Use memory tools when recall matters, and store durable memories sparingly.",
].join(" ");

const staticToolkitContext: ToolkitContext = {
  runPolicyQuery: async () => false,
  runDependencyQuery: async () => {
    throw new Error("Terminal chat does not use dynamic toolkit dependencies");
  },
};

const terminalChatMemoryToolkit: Composable = toolkit(
  [searchMemoryTool, storeMemoryTool],
  {
    name: "terminalChatMemory",
  },
);

const terminalChatComposed: Composable = toolkit([terminalChatMemoryToolkit], {
  name: "terminalChat",
  instructions: [baseInstructions],
});

export const terminalChatAgentDefinition: RegisteredMachineAgent =
  defineRegisteredMachineAgent({
    agentId: "terminal-chat",
    name: "Terminal Chat",
    staticProps: terminalChatComposed.staticProps,
  });

type TerminalChatToolCtx = ActionCtx & {
  threadId: string;
  messageId: string;
};

export async function createTerminalChatAgent(
  ctx?: TerminalChatToolCtx,
): Promise<
  Agent<{ threadId: string; messageId: string }, Record<string, Tool>>
> {
  const { tools, instructions, effectiveStaticProps } =
    await terminalChatComposed.evaluate(staticToolkitContext);

  if (ctx) {
    await recordRegisteredMachineAgentTurn(ctx, {
      definition: terminalChatAgentDefinition,
      runtimeStaticProps: effectiveStaticProps,
      threadId: ctx.threadId,
      messageId: ctx.messageId,
    });
  }

  return new Agent(components.agent, {
    name: terminalChatAgentDefinition.name,
    instructions,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
  });
}
