import { test } from "bun:test";
import { convexTest } from "convex-test";
import { importMetaGlob } from "../importMetaGlob.js";
import schema from "./schema.js";

export const modules = importMetaGlob("**/*.ts", import.meta.dir);

export function initConvexTest() {
  const t = convexTest(schema, modules);
  return t;
}
test("setup", () => {});
