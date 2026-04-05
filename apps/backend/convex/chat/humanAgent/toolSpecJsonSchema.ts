import type { ToolSpec } from "@very-coffee/agent-identity";
import { toJSONSchema } from "zod/v4";

/** Convex values cannot include object keys starting with {@code $} (e.g. JSON Schema {@code $schema}, {@code $ref}). */
export function sanitizeJsonSchemaForConvex(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonSchemaForConvex);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.startsWith("$")) {
      continue;
    }
    out[k] = sanitizeJsonSchemaForConvex(v);
  }
  return out;
}

/** Serialize tool input schema for {@link humanToolkitForChat} UI (Convex-safe JSON Schema). */
export function serializeInputSchema(spec: ToolSpec): unknown {
  const schema = spec.inputSchema as unknown as {
    toJSONSchema?: (params?: object) => unknown;
  };
  let raw: unknown;
  if (typeof schema?.toJSONSchema === "function") {
    raw = schema.toJSONSchema();
  } else {
    try {
      raw = toJSONSchema(schema as never);
    } catch {
      return undefined;
    }
  }
  return sanitizeJsonSchemaForConvex(raw);
}
