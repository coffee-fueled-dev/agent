import agent from "@convex-dev/agent/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import { defineApp } from "convex/server";
import files from "./_components/files/convex.config.js";
import identity from "./_components/identity/convex.config.js";
import memory from "./_components/memory/convex.config.js";

const app = defineApp();

app.use(memory);
app.use(files);
app.use(identity);
app.use(agent);
app.use(workpool);

export default app;
