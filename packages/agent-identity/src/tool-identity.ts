import { hashIdentityInput } from "./hash.js";
import type { Composable, ToolSpec } from "./types.js";

/**
 * Hash a tool’s **static** identity (what is knowable before `evaluate`), e.g. `ToolStaticProps`.
 * Uses the same normalization as [`hashIdentityInput`](./hash.ts) (policies collapse to `id`).
 */
export async function hashToolStaticIdentity(
  staticProps: unknown,
): Promise<string> {
  return hashIdentityInput(staticProps);
}

/**
 * Hash static `staticProps` of a composable that must be a single `kind: "tool"` node.
 */
export async function hashToolComposableStatic(
  composable: Composable<
    { kind: string; name: string },
    Record<string, ToolSpec>,
    unknown
  >,
): Promise<string> {
  if (composable.staticProps.kind !== "tool") {
    throw new Error(
      `hashToolComposableStatic: expected composable with kind "tool", got ${String(composable.staticProps.kind)}`,
    );
  }
  return hashToolStaticIdentity(composable.staticProps);
}
