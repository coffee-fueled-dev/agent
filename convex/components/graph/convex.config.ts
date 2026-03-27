import aggregate from "@convex-dev/aggregate/convex.config.js";
import shardedCounter from "@convex-dev/sharded-counter/convex.config.js";
import { defineComponent } from "convex/server";

const component = defineComponent("graph");
component.use(aggregate);
component.use(shardedCounter);

export default component;
