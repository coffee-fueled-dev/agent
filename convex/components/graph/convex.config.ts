import aggregate from "@convex-dev/aggregate/convex.config.js";
import { defineComponent } from "convex/server";

const component = defineComponent("graph");
component.use(aggregate);

export default component;
