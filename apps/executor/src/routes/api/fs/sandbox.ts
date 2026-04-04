import { mkdirSync, realpathSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";
import { getAgentHomeRoot } from "./env.js";

const homeRoot = getAgentHomeRoot();
mkdirSync(homeRoot, { recursive: true });

/** Safe for single path segment / directory name (no separators). */
export function sanitizeSandboxId(id: string): string {
  const s = id.replace(/[/\\:\0\n\r]/g, "_").trim();
  return s.slice(0, 240) || "_empty";
}

/** One host directory per sandbox; stays under agent home root. */
export function getSandboxRoot(sandboxId: string): string {
  const safe = sanitizeSandboxId(sandboxId);
  const root = join(homeRoot, safe);
  mkdirSync(root, { recursive: true });
  return root;
}

/**
 * Resolve a relative path inside `root` only. Rejects traversal and absolute paths.
 */
export function resolveSafePath(root: string, relativePath: string): string {
  if (relativePath.includes("\0")) {
    throw new Error("Invalid path");
  }
  const trimmed = relativePath.trim();
  if (!trimmed) {
    throw new Error("Path is required");
  }
  const norm = normalize(trimmed);
  if (norm.startsWith("/") || /^[a-zA-Z]:/.test(norm)) {
    throw new Error("Path must be relative to the sandbox");
  }
  let rootAbs: string;
  try {
    rootAbs = realpathSync(root);
  } catch {
    mkdirSync(root, { recursive: true });
    rootAbs = realpathSync(root);
  }
  const full = resolve(rootAbs, norm);
  const rel = relative(rootAbs, full);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Path escapes sandbox");
  }
  return full;
}
