import rag from "@convex-dev/rag/convex.config.js";
import events from "@very-coffee/convex-events/convex.config.js";
import { defineComponent } from "convex/server";
import graph from "../graph/convex.config";
import history from "../history/convex.config";
import search from "../search/convex.config";

const component = defineComponent("context");
component.use(rag);
component.use(history);
component.use(search);
component.use(graph);
component.use(events);

export default component;
