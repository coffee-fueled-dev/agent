import { expect, test } from "bun:test";
import { buildKnnGraph, type KnnEntry } from "./index";

test("buildKnnGraph returns adjacency for all entries", () => {
  const entries: KnnEntry[] = [
    { id: "a", embedding: [1, 0] },
    { id: "b", embedding: [0.9, 0.1] },
    { id: "c", embedding: [0, 1] },
  ];
  const out = buildKnnGraph(entries, 1);
  expect(out.size).toBe(3);
  expect(out.get("a")?.size).toBeGreaterThan(0);
});

test("buildKnnGraph creates symmetric edges", () => {
  const entries: KnnEntry[] = [
    { id: "a", embedding: [1, 0] },
    { id: "b", embedding: [0.99, 0.01] },
    { id: "c", embedding: [0, 1] },
  ];
  const out = buildKnnGraph(entries, 1);
  const ab = out.get("a")?.get("b") ?? 0;
  const ba = out.get("b")?.get("a") ?? 0;
  expect(ab).toBeGreaterThan(0);
  expect(ba).toBeGreaterThan(0);
});
