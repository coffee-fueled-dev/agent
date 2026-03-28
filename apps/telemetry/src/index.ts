import { serve } from "bun";
import chatPage from "./routes/chat/page.html";
import contextEntryActivityEvent from "./routes/context/[entryId]/activity/[event]/page.html";
import contextEntryActivity from "./routes/context/[entryId]/activity/page.html";
import contextEntryOverview from "./routes/context/[entryId]/page.html";
import contextPage from "./routes/context/page.html";
import homePage from "./routes/home/page.html";

const server = serve({
  routes: {
    "/context/:entryId/activity/:event": contextEntryActivityEvent,
    "/context/:entryId/activity": contextEntryActivity,
    "/context/:entryId": contextEntryOverview,
    "/context": contextPage,
    "/chat": chatPage,
    "/": homePage,
    "/*": homePage,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
