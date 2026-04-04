import { serve } from "bun";
import { fileEmbeddingRoute } from "./routes/api/embedding/index.js";
import {
  fsExecuteRoute,
  fsReadRoute,
  fsWriteRoute,
} from "./routes/api/fs/index.js";

const server = serve({
  routes: {
    "/api/file-embedding": fileEmbeddingRoute,
    "/api/fs/execute": fsExecuteRoute,
    "/api/fs/read": fsReadRoute,
    "/api/fs/write": fsWriteRoute,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
