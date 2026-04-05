import type {
  HumanToolkitToolInputs,
  HumanToolkitToolName,
} from "./humanToolkitTypes.js";

/** Build a validated-shaped tool call for {@link sendMessage} `toolCalls`. */
export function buildHumanToolCall<K extends HumanToolkitToolName>(
  name: K,
  input: HumanToolkitToolInputs[K],
): { name: K; input: HumanToolkitToolInputs[K] } {
  return { name, input };
}
