import { serve } from "bun";
import chatPage from "./routes/chat/page.html";
import eventsEventDetail from "./routes/events/[event]/page.html";
import eventsPage from "./routes/events/page.html";
import memoriesPage from "./routes/memories/page.html";

const server = serve({
  routes: {
    "/events/:event": eventsEventDetail,
    "/events": eventsPage,
    "/memories": memoriesPage,
    "/chat": chatPage,
    "/": chatPage,
    "/*": chatPage,
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
    app: "agent",
    url: server.url.href,
    hostname: server.hostname,
    port: server.port,
  }),
);
