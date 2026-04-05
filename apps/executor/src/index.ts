import { serve } from "bun";
import { browserBrowseRoute } from "./routes/api/browser/index.js";
import { fileEmbeddingRoute } from "./routes/api/embedding/index.js";
import {
  fsExecuteRoute,
  fsReadRoute,
  fsWriteRoute,
} from "./routes/api/fs/index.js";

const server = serve({
  routes: {
    "/api/browser/browse": browserBrowseRoute,
    "/api/file-embedding": fileEmbeddingRoute,
    "/api/fs/execute": fsExecuteRoute,
    "/api/fs/read": fsReadRoute,
    "/api/fs/write": fsWriteRoute,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },

  hostname: process.env.HOSTNAME ?? "0.0.0.0",
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
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
