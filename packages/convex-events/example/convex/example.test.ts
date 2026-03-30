import { describe, expect, test } from "bun:test";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";

describe("example", () => {
  test("ping", async () => {
    const t = initConvexTest();
    const r = await t.query(api.example.ping, {});
    expect(r).toBe("ok");
  });
});
