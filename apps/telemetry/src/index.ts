import { serve } from "bun";
import context from "./context.html";
import index from "./index.html";

const server = serve({
  routes: {
    "/context": context,
    "/": index,
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
