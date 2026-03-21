import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config.js";
import geospatial from "@convex-dev/geospatial/convex.config.js";
import rag from "@convex-dev/rag/convex.config.js";
import { defineApp } from "convex/server";
import events from "./components/events/convex.config.js";
import facts from "./components/facts/convex.config.js";
import history from "./components/history/convex.config.js";
import agentMemory from "./components/agentMemory/convex.config.js";
import policy from "./components/policy/convex.config.js";

const app = defineApp();

app.use(aggregate);
app.use(geospatial);
app.use(facts);
app.use(events);
app.use(history);
app.use(agentMemory);
app.use(policy);
app.use(agent);
app.use(rag);

export default app;
