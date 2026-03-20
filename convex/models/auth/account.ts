import { defineTable } from "convex/server";
import { zid, zodOutputToConvex } from "convex-helpers/server/zod4";
import z from "zod";

export const accountKinds = ["human", "machine"] as const;
export const accountAliasKinds = ["session", "machineAgent", "token"] as const;

export const zAccount = z.object({
  kind: z.enum(accountKinds),
  displayName: z.string().optional(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  data: z.discriminatedUnion("status", [
    z.object({ status: z.literal("active") }),
    z.object({ status: z.literal("disabled"), reason: z.string().optional() }),
  ]),
});

export const accounts = defineTable(zodOutputToConvex(zAccount)).index(
  "by_kind",
  ["kind"],
);

export const zAccountAlias = z.object({
  account: zid("accounts"),
  kind: z.enum(accountAliasKinds),
  value: z.string(),
  normalizedValue: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  expiredAt: z.number().nullable(),
  verifiedAt: z.number().optional(),
});

export const accountAliases = defineTable(zodOutputToConvex(zAccountAlias))
  .index("by_account", ["account"])
  .index("by_kind_normalizedValue", ["kind", "normalizedValue"]);
