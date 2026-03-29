export function isTextLikeFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml"
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
