import { serve } from "bun";
import chatPage from "./routes/chat/page.html";

const server = serve({
  routes: {
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
