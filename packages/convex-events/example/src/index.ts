import { serve } from "bun";
import bus from "./app/bus/page.html";
import dimensions from "./app/dimensions/page.html";
import metrics from "./app/metrics/page.html";
import home from "./app/page.html";
import projectors from "./app/projectors/page.html";
import streams from "./app/streams/page.html";
import version from "./app/version/page.html";

const server = serve({
  routes: {
    "/": home,
    "/streams": streams,
    "/version": version,
    "/metrics": metrics,
    "/bus": bus,
    "/dimensions": dimensions,
    "/projectors": projectors,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
