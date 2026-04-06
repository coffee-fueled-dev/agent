import { z } from "zod";

/**
 * Flat map pushed to the Convex dashboard via `convex env set` (dev script).
 *
 * `FILE_EMBEDDING_SECRET`, `SHELL_EXECUTOR_SECRET`, and `BROWSER_EXECUTOR_SECRET` must match
 * the executor process (`apps/executor`) — same strings Convex sends and the server checks.
 */
export const convexDashboardEnvSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  FILE_EMBEDDING_API_URL: z.string().min(1),
  FILE_EMBEDDING_SECRET: z.string().min(1),
  SHELL_EXECUTOR_API_URL: z.string().min(1),
  SHELL_EXECUTOR_SECRET: z.string().min(1),
  SHELL_EXECUTOR_ENABLED: z.string().min(1),
  BROWSER_EXECUTOR_API_URL: z.string().min(1),
  BROWSER_EXECUTOR_SECRET: z.string().min(1),
  BROWSER_EXECUTOR_ENABLED: z.string().min(1),
  BROWSERBASE_API_KEY: z.string().min(1),
  BROWSERBASE_PROJECT_ID: z.string().min(1),
  QUERY_URL_GEMINI_MODEL: z.string().optional(),
  STORAGE_PUBLIC_TUNNEL_ORIGIN: z.string().optional(),
  BROWSERBASE_STAGEHAND_CUA_MODEL: z.string().optional(),
});

export type ConvexDashboardEnv = z.infer<typeof convexDashboardEnvSchema>;
