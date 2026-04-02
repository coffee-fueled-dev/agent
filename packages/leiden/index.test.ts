import { expect, test } from "bun:test";
import { type Adjacency, leiden } from "./index";

test("leiden returns empty map for empty adjacency", () => {
  expect(leiden(new Map())).toEqual(new Map());
});

test("leiden assigns all nodes in simple graph", () => {
  const adj: Adjacency = new Map([
    [
      "a",
      new Map([
        ["b", 1],
        ["c", 1],
      ]),
    ],
    [
      "b",
      new Map([
        ["a", 1],
        ["c", 1],
      ]),
    ],
    [
      "c",
      new Map([
        ["a", 1],
        ["b", 1],
      ]),
    ],
  ]);
  const out = leiden(adj);
  expect(out.size).toBe(3);
  expect(out.has("a")).toBe(true);
  expect(out.has("b")).toBe(true);
  expect(out.has("c")).toBe(true);
});
