import agent from "@convex-dev/agent/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import events from "@very-coffee/convex-events/convex.config.js";
import { defineApp } from "convex/server";
import context from "./components/context/convex.config.js";
import facts from "./components/facts/convex.config.js";
import history from "./components/history/convex.config.js";
import policy from "./components/policy/convex.config.js";

const app = defineApp();

app.use(facts);
app.use(events);
app.use(history);
app.use(context);
app.use(policy);
app.use(agent);
app.use(shardedCounter);
app.use(workpool);

export default app;
