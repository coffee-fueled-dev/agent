import agent from "@convex-dev/agent/convex.config.js";
import { defineApp } from "convex/server";
import identity from "./_components/identity/convex.config.js";
import memory from "./_components/memory/convex.config.js";

const app = defineApp();

app.use(memory);
app.use(identity);
app.use(agent);

export default app;
