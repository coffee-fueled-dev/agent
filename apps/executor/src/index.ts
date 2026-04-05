import {
  DEFAULT_EXECUTOR_LISTEN_HOST,
  DEFAULT_EXECUTOR_LISTEN_PORT,
  executorHttpRoutes,
} from "@agent/config";
import { serve } from "bun";
import { browserBrowseRoute } from "./routes/api/browser/index.js";
import { fileEmbeddingRoute } from "./routes/api/embedding/index.js";
import {
  fsExecuteRoute,
  fsReadRoute,
  fsWriteRoute,
} from "./routes/api/fs/index.js";

const r = executorHttpRoutes;

const hostname =
  process.env.EXECUTOR_LISTEN_HOST?.trim() ||
  process.env.HOSTNAME?.trim() ||
  DEFAULT_EXECUTOR_LISTEN_HOST;
const port = process.env.EXECUTOR_LISTEN_PORT?.trim()
  ? Number.parseInt(process.env.EXECUTOR_LISTEN_PORT, 10)
  : process.env.PORT
    ? Number.parseInt(process.env.PORT, 10)
    : DEFAULT_EXECUTOR_LISTEN_PORT;

const server = serve({
  routes: {
    [r.browserBrowse]: browserBrowseRoute,
    [r.fileEmbedding]: fileEmbeddingRoute,
    [r.fsExecute]: fsExecuteRoute,
    [r.fsRead]: fsReadRoute,
    [r.fsWrite]: fsWriteRoute,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },

  hostname,
  port,
});

console.log(
  JSON.stringify({
    type: "bun-dev-server",
    app: "executor",
    url: server.url.href,
    hostname: server.hostname,
    port: server.port,
  }),
);
