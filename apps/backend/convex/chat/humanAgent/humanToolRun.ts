import type { ToolSpec } from "@very-coffee/agent-identity";

/**
 * Resolved tool map from {@link humanTools.evaluate}; lookup by name or throw policy denial.
 */
export function getEvaluatedHumanToolSpec(
  tools: Record<string, ToolSpec | undefined>,
  toolName: string,
): ToolSpec {
  const spec = tools[toolName];
  if (!spec) {
    throw new Error(`Tool not available or denied by policy: ${toolName}`);
  }
  return spec;
}

/**
 * Standard-schema validation for human toolkit tools ({@code inputSchema["~standard"].validate}).
 */
export async function parseValidatedHumanToolInput(
  spec: ToolSpec,
  input: unknown,
): Promise<unknown> {
  const validateResult = await spec.inputSchema["~standard"].validate(input);
  if (!("value" in validateResult)) {
    const issues = validateResult.issues?.map((i) => i.message).join("; ");
    throw new Error(issues ?? "Invalid tool input");
  }
  return validateResult.value;
}
