import { describe, expect, test } from "bun:test";
import { deriveOrderedSelection } from "./derive.js";

describe("deriveOrderedSelection", () => {
  test("finds selected index and partition tails", () => {
    const result = deriveOrderedSelection({
      selected: "b",
      items: [
        {
          entity: "a",
          entityType: "t",
          order: [0],
          labels: [],
        },
        {
          entity: "b",
          entityType: "t",
          order: [1],
          labels: [],
        },
      ],
      partitions: [{ partition: "p1", tail: "b" }],
    });
    expect(result.selectedIndex).toBe(1);
    expect(result.lastIndex).toBe(1);
    expect(result.partitionTails[0]?.tail).toBe("b");
    expect(result.partitionTails[0]?.index).toBe(1);
  });
});
