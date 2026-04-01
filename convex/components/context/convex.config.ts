import rag from "@convex-dev/rag/convex.config.js";
import events from "@very-coffee/convex-events/convex.config.js";
import graph from "@very-coffee/convex-graph/convex.config.js";
import history from "@very-coffee/convex-history/convex.config.js";
import { defineComponent } from "convex/server";
import search from "@very-coffee/convex-search-features/convex.config.js";

const component = defineComponent("context");
component.use(rag);
component.use(history);
component.use(search);
component.use(graph);
component.use(events);

export default component;
