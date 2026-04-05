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

  hostname: "0.0.0.0",
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
});

console.log(`Server running at ${server.url}`);
