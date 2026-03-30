export function isTextLikeFile(file: File) {
  return isTextLikeMimeType(file.type);
}

/** Matches server `isTextLikeMime` / embed-for-search text branch. */
export function isTextLikeMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/** Stable entry key: slug plus random suffix (replaces per-feature key builders). */
export function buildContextFileKey(options: {
  title?: string;
  fileName?: string;
  /** e.g. "chat" — prefixed to the slug */
  prefix?: string;
  fallback?: string;
}): string {
  const segment =
    options.title?.trim() || options.fileName || options.fallback || "context";
  const slug = segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const core = slug || options.fallback || "context";
  const base = options.prefix ? `${options.prefix}-${core}` : core;
  return `${base}:${crypto.randomUUID()}`;
}
