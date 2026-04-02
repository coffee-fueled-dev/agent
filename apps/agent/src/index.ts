import { serve } from "bun";
import { fileEmbeddingRoute } from "./routes/api/file-embedding/index.js";
import { fileSystemRoute } from "./routes/api/file-system/index.js";
import chatPage from "./routes/chat/page.html";

const server = serve({
  routes: {
    "/api/file-embedding": fileEmbeddingRoute,
    "/api/file-system/execute": fileSystemRoute,
    "/chat": chatPage,
    "/": chatPage,
    "/*": chatPage,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
