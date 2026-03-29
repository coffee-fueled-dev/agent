/**
 * Browser-exposed env: values are injected at dev (`render-root`) / build (`build.ts`) from
 * root `.env.local` — do not import server-only env modules into client bundles.
 */
export const publicEnvKeys = [
  "BUN_PUBLIC_CONVEX_URL",
  "BUN_PUBLIC_ACCOUNT_TOKEN",
] as const;

export type PublicEnv = { convexUrl: string; accountToken: string };
