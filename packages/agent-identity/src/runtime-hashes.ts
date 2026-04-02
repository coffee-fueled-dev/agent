import { hashPlainObject, schemaToHashInput } from "./hash.js";
import type { AnyComposable, ComposableWithChildren } from "./toolkit.js";
import type { ToolSpec } from "./types.js";

/**
 * Recursively collects each leaf tool's static hash (name → hash) from a composable tree.
 */
export async function collectToolStaticHashes(
  root: AnyComposable,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  async function walk(c: AnyComposable): Promise<void> {
    const kind = c.staticProps.kind;
    if (kind === "tool") {
      map.set(
        c.staticProps.name,
        await c.computeStaticHash(),
      );
      return;
    }
    const children = (c as ComposableWithChildren).childComposables;
    if (children?.length) {
      for (const ch of children) {
        await walk(ch);
      }
    }
  }

  await walk(root);
  return map;
}

/**
 * Runtime identity hash: enabled tools only, ordered by tool name.
 */
export async function computeRuntimeHash(
  enabledToolNames: string[],
  nameToStaticHash: Map<string, string>,
  toolsFallback: Record<string, ToolSpec>,
): Promise<string> {
  const sortedNames = [...enabledToolNames].sort((a, b) => a.localeCompare(b));
  const pairs: { name: string; hash: string }[] = [];
  for (const name of sortedNames) {
    const h = nameToStaticHash.get(name);
    if (h) {
      pairs.push({ name, hash: h });
    } else {
      const spec = toolsFallback[name];
      if (spec) {
        pairs.push({ name, hash: await hashToolSpecIdentity(spec) });
      }
    }
  }
  return hashPlainObject({
    kind: "runtime",
    tools: pairs,
  });
}

/**
 * Hash a {@link ToolSpec} using the same fields as static tool identity (for dynamic-only tools).
 */
export async function hashToolSpecIdentity(spec: ToolSpec): Promise<string> {
  const instructionLines = spec.instructions
    ? spec.instructions.split("\n\n")
    : [];
  return hashPlainObject({
    kind: "tool",
    name: spec.name,
    description: spec.description ?? null,
    schema: schemaToHashInput(spec.inputSchema),
    instructions: [...instructionLines].sort((a, b) => a.localeCompare(b)),
    policies: spec.policyIds ?? [],
  });
}
