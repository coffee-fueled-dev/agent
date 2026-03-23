import rag from "@convex-dev/rag/convex.config.js";
import { defineComponent } from "convex/server";

const component = defineComponent("context");
component.use(rag);

export default component;
