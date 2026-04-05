/** Executor HTTP routes; must match `apps/executor` route modules. */
export const executorHttpRoutes = {
  browserBrowse: "/api/browser/browse",
  fileEmbedding: "/api/file-embedding",
  fsExecute: "/api/fs/execute",
  fsRead: "/api/fs/read",
  fsWrite: "/api/fs/write",
} as const;

export type ExecutorHttpRoutes = typeof executorHttpRoutes;
