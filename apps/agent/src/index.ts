import {
  DEFAULT_AGENT_LISTEN_HOST,
  DEFAULT_AGENT_LISTEN_PORT,
} from "@agent/config";
import { serve } from "bun";
import chatPage from "./routes/chat/page.html";
import eventsEventDetail from "./routes/events/[event]/page.html";
import eventsPage from "./routes/events/page.html";
import memoriesPage from "./routes/memories/page.html";

const hostname =
  process.env.AGENT_LISTEN_HOST?.trim() ||
  process.env.HOSTNAME?.trim() ||
  DEFAULT_AGENT_LISTEN_HOST;
const port = process.env.AGENT_LISTEN_PORT?.trim()
  ? Number.parseInt(process.env.AGENT_LISTEN_PORT, 10)
  : process.env.PORT
    ? Number.parseInt(process.env.PORT, 10)
    : DEFAULT_AGENT_LISTEN_PORT;

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

  hostname,
  port,
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
