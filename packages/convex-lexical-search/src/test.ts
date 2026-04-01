import type { GenericSchema, SchemaDefinition } from "convex/server";
import type { TestConvex } from "convex-test";
import schema from "./component/schema.js";
import { importMetaGlob } from "./importMetaGlob.js";

export { importMetaGlob };

const modules = importMetaGlob("component/**/*.ts", import.meta.dir);

/**
 * Register the component with the test convex instance.
 * @param t - The test convex instance, e.g. from calling `convexTest`.
 * @param name - The name of the component, as registered in convex.config.ts.
 */
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "search",
) {
  t.registerComponent(name, schema, modules);
}
export default { register, schema, modules };
