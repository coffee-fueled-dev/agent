import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
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

export const exampleAgent = async (ctx: ToolBuilderContext) => {
  const composed = toolkit([exampleAgentToolkit], {
    name: "exampleAgent",
  });

  const { tools, instructions } = await composed.evaluate(
    createToolkitContext(ctx),
  );

  return new Agent(components.agent, {
    name: "Example Agent",
    languageModel: languageModels.chat,
    textEmbeddingModel: languageModels.textEmbedding,
    maxSteps: 15,
    tools,
    instructions,
  });
};
