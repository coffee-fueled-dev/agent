import { describe, expect, test } from "bun:test";
import { hashIdentityInput, normalizeStaticProps } from "./hash.js";
import { policy } from "./policy.js";

describe("normalizeStaticProps", () => {
  test("sorts object keys", () => {
    const a = normalizeStaticProps({ z: 1, a: 2 });
    const b = normalizeStaticProps({ a: 2, z: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("nested policy objects collapse to id string", () => {
    const p = policy("p1", async () => true);
    expect(normalizeStaticProps({ policy: p })).toEqual({ policy: "p1" });
  });
});

describe("hashIdentityInput", () => {
  test("is deterministic", async () => {
    const h1 = await hashIdentityInput({ x: 1, y: [2, 3] });
    const h2 = await hashIdentityInput({ y: [2, 3], x: 1 });
    expect(h1).toBe(h2);
  });
});
