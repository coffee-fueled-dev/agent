import { defineSchema } from "convex/server";
import { appTables } from "./models";

const schema = defineSchema({
  ...appTables,
});

export default schema;
