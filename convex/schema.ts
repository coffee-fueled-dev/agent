import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { appTables } from "./models";

const aTable = defineTable({
  a: v.string(),
});

const bTable = defineTable({
  b: v.string(),
});

function tableConstructor(type: "a"): typeof aTable;
function tableConstructor(type: "b"): typeof bTable;
function tableConstructor<T extends "a" | "b">(type: T) {
  if (type === "a") {
    return aTable;
  }

  return bTable;
}
const tables = tableConstructor("b");

const schema = defineSchema({
  ...appTables,
});

export default schema;
