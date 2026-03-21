import type { ComponentApi as FactsComponentApi } from "../../facts/_generated/component";
import { FactsClient } from "../../facts/client";
import { components } from "../_generated/api";

const factsComponent = (components as {
  facts: FactsComponentApi<"facts">;
}).facts;

const threadIdentityFactsConfig = {
  entities: [
    {
      entityType: "turn",
      states: ["stable", "changed"],
      attrs: {
        messageId: "string",
        codeId: "string",
        staticHash: "string",
        runtimeHash: "string",
        entryTime: "number",
      },
    },
  ],
  edgeKinds: ["next_turn"],
  partitions: ["latest_turn"],
} as const;

export const threadIdentityFacts = new FactsClient(
  factsComponent,
  threadIdentityFactsConfig,
);
