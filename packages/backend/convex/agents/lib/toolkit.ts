export type ToolErrorOutput = { ok: false; error: string };
export type ToolSuccessOutput<DATA = unknown> = { ok: true; data?: DATA };
export type ToolOutput<DATA = unknown> =
  | ToolErrorOutput
  | ToolSuccessOutput<DATA>;

export type {
  Composable,
  EffectiveStaticProps,
  ExtractComposableTools,
  PolicyResultMap,
  SharedPolicy,
  ToolkitContext,
  ToolkitResult,
  ToolMapFromMembers,
  ToolRuntimeContext,
  ToolSpec,
  ToolStaticProps,
} from "@very-coffee/agent-identity";
export {
  dynamicToolkit,
  policy,
  tool,
  toolkit,
} from "@very-coffee/agent-identity";

export async function withFormattedResults<DATA>(
  promise: Promise<DATA>,
): Promise<ToolOutput<DATA>> {
  try {
    const data = await promise;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
