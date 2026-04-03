import rag from "@convex-dev/rag/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import graph from "@very-coffee/convex-graph/convex.config.js";
import history from "@very-coffee/convex-history/convex.config.js";
import lexicalSearch from "@very-coffee/convex-lexical-search/convex.config.js";
import vectorSearch from "@very-coffee/convex-vector-search/convex.config.js";
import { defineComponent } from "convex/server";

const component = defineComponent("memory");
component.use(rag);
component.use(history);
component.use(lexicalSearch);
component.use(vectorSearch);
component.use(graph);
component.use(workpool, { name: "mergeMemoryWorkpool" });

export default component;
