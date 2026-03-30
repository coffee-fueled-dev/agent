import { test } from "bun:test";
import { convexTest } from "convex-test";
import { importMetaGlob } from "../importMetaGlob.js";

export const modules = importMetaGlob("**/*.ts", import.meta.dir);

import {
  componentsGeneric,
  defineSchema,
  type GenericSchema,
  type SchemaDefinition,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import { register } from "../test.js";

export function initConvexTest<
  Schema extends SchemaDefinition<GenericSchema, boolean>,
>(schema?: Schema) {
  const t = convexTest(schema ?? defineSchema({}), modules);
  register(t);
  return t;
}
export const components = componentsGeneric() as unknown as {
  events: ComponentApi;
};

test("setup", () => {});
