import agent from "@convex-dev/agent/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import agentFingerprints from "@very-coffee/convex-agent-fingerprints/convex.config.js";
import history from "@very-coffee/convex-history/convex.config.js";
import { defineApp } from "convex/server";
import memory from "./_components/memory/convex.config.js";

const app = defineApp();

app.use(memory);
app.use(agentFingerprints);
app.use(agent);
app.use(workpool);
app.use(history);

export default app;
