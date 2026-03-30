import events from "@very-coffee/convex-events/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(events);

export default app;
