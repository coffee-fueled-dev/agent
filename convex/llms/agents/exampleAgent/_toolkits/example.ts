import { toolkit } from "../../../tools/_libs/toolkit";
import { exampleTool } from "../../../tools/example/tool";
import staticInstructions from "./_instructions";

const tools = [exampleTool] as const;

export const example = toolkit(tools, {
  name: "example",
  instructions: [staticInstructions],
});
