import { describe, expect, test } from "bun:test";
import { SearchClient } from "./index.js";
import { components } from "./setup.test.js";

describe("SearchClient", () => {
  test("constructs with component handle", () => {
    const client = new SearchClient(components.search, {
      sources: [
        {
          sourceSystem: "test",
          document: "contextEntries" as never,
          fields: ["entryId"],
        },
      ],
    });
    expect(client.config.sources).toHaveLength(1);
  });
});
