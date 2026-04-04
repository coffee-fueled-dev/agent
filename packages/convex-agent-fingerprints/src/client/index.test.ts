import { describe, expect, test } from "bun:test";
import { FingerprintClient } from "./index.js";
import { components } from "./setup.test.js";

describe("FingerprintClient", () => {
  test("constructs with component handle", () => {
    const handle = components.agentFingerprints;
    const client = new FingerprintClient(handle);
    expect(client).toBeInstanceOf(FingerprintClient);
    expect(client.component).toEqual(handle);
  });
});
