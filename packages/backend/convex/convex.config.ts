import { defineApp } from "convex/server";
import identity from "./_components/identity/convex.config.js";
import memory from "./_components/memory/convex.config.js";

const app = defineApp();

app.use(memory);
app.use(identity);

export default app;
