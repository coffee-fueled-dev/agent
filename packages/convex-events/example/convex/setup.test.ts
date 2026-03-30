import { test } from "bun:test";
import component, { importMetaGlob } from "@very-coffee/convex-events/test";
import { convexTest } from "convex-test";
import schema from "./schema.js";

const modules = importMetaGlob("**/*.ts", import.meta.dir);
// When users want to write tests that use your component, they need to
// explicitly register it with its schema and modules.
export function initConvexTest() {
  const t = convexTest(schema, modules);
  component.register(t);
  return t;
}

test("setup", () => {});
