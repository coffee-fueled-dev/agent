import { serve } from "bun";
import contextDetailPage from "./routes/context/[entryId]/page.html";
import contextPage from "./routes/context/page.html";
import homePage from "./routes/home/page.html";

const server = serve({
  routes: {
    "/context/:entryId": contextDetailPage,
    "/context": contextPage,
    "/": homePage,
    "/*": homePage,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
