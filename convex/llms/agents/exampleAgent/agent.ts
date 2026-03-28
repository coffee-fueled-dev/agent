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

export const exampleAgentToolkit = toolkit([example], {
  name: "staticExampleAgent",
  instructions: [staticInstructions],
});

export const exampleAgentComposed = toolkit([exampleAgentToolkit], {
  name: "exampleAgent",
});

export const exampleAgentDefinition = defineRegisteredMachineAgent({
  agentId: "example-agent",
  name: "Example Agent",
  staticProps: exampleAgentComposed.staticProps,
});

export const exampleAgent = async (ctx: ToolBuilderContext) => {
  const { tools, instructions, effectiveStaticProps } =
    await exampleAgentComposed.evaluate(createToolkitContext(ctx));

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
