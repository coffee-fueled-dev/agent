function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

export function requireBrowserbaseApiKey(): string {
  const k = trim(process.env.BROWSERBASE_API_KEY);
  if (!k) {
    throw new Error(
      "Missing BROWSERBASE_API_KEY for this Convex deployment (`npx convex env set BROWSERBASE_API_KEY ...`).",
    );
  }
  return k;
}

export function requireBrowserbaseProjectId(): string {
  const k = trim(process.env.BROWSERBASE_PROJECT_ID);
  if (!k) {
    throw new Error(
      "Missing BROWSERBASE_PROJECT_ID for Stagehand on Browserbase (`npx convex env set BROWSERBASE_PROJECT_ID ...`).",
    );
  }
  return k;
}

const DEFAULT_STAGEHAND_CUA_MODEL =
  "google/gemini-2.5-computer-use-preview-10-2025" as const;

/** Model id for `stagehand.agent({ mode: \"cua\", model: { modelName } })`. */
export function getStagehandCuaModelName(): string {
  return (
    trim(process.env.BROWSERBASE_STAGEHAND_CUA_MODEL) ??
    DEFAULT_STAGEHAND_CUA_MODEL
  );
}
