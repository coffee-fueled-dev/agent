import facts from "../facts/convex.config.js";
import history from "../history/convex.config.js";
import rag from "@convex-dev/rag/convex.config.js";
import { defineComponent } from "convex/server";

const component = defineComponent("agentMemory");
component.use(facts);
component.use(history);
component.use(rag);

export default component;
