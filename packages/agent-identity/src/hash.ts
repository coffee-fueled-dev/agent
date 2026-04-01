type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function isSharedPolicyLike(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "evaluate" in value &&
    typeof (value as { id: unknown }).id === "string"
  );
}

export function normalizeStaticProps(value: unknown): JsonValue {
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map(normalizeStaticProps);
  }
  if (typeof value === "function") {
    return `[function:${value.name || "anonymous"}]`;
  }
  if (typeof value === "object") {
    if (isSharedPolicyLike(value)) {
      return String(value.id);
    }
    const entries = Object.entries(value)
      .filter(
        ([key, entryValue]) =>
          entryValue !== undefined && !key.startsWith("$"),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeStaticProps(entryValue)] as const);
    return Object.fromEntries(entries);
  }
  return String(value);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) =>
    part.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashIdentityInput(value: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(normalizeStaticProps(value)));
}
