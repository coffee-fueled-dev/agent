import path from "node:path";
import { pathToFileURL } from "node:url";
import { Glob } from "bun";

/**
 * Vite-compatible `import.meta.glob` for convex-test when running under Bun.
 * @see https://vitejs.dev/guide/features.html#glob-import
 */
export function importMetaGlob(
  pattern: string,
  cwd: string,
): Record<string, () => Promise<unknown>> {
  const g = new Glob(pattern);
  const resolved = path.resolve(cwd);
  const out: Record<string, () => Promise<unknown>> = {};
  for (const file of g.scanSync({ cwd: resolved, onlyFiles: true })) {
    const rel = file.replace(/\\/g, "/");
    const key = `./${rel}`;
    const abs = path.join(resolved, file);
    const href = pathToFileURL(abs).href;
    out[key] = () => import(href);
  }
  return out;
}
