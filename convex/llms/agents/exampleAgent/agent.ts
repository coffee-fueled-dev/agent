import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import {
  defineRegisteredMachineAgent,
  recordRegisteredMachineAgentTurn,
} from "../../../chat/identity";
import { languageModels } from "../../models";
import {
  createToolkitContext,
  type ToolBuilderContext,
} from "../../tools/_libs/customFunctions";
import { toolkit } from "../../tools/_libs/toolkit";
import staticInstructions from "./_instructions";
import { example } from "./_toolkits/example";

const exampleAgentTools = toolkit([example], {
  name: "example-agent-tools",
  instructions: [staticInstructions],
});

const exampleAgentDefinition = defineRegisteredMachineAgent({
  agentId: "example-agent",
  name: "Example Agent",
  staticProps: exampleAgentTools.staticProps,
});

export const createAgent = async (
  ctx: Omit<ToolBuilderContext, "agentId" | "agentName">,
) => {
  const toolkitCtx = createToolkitContext({
    ...ctx,
    agentId: exampleAgentDefinition.agentId,
    agentName: exampleAgentDefinition.name,
  });
  const { tools, instructions, effectiveStaticProps } =
    await exampleAgentTools.evaluate(toolkitCtx);

  await recordRegisteredMachineAgentTurn(ctx, {
    definition: exampleAgentDefinition,
    runtimeStaticProps: effectiveStaticProps,
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    sessionId: ctx.sessionId,
  });

  return new Agent(components.agent, {
    name: exampleAgentDefinition.name,
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
    instructions,
  });
};
