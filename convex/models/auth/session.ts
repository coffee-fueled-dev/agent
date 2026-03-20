import { defineTable } from "convex/server";
import { zid, zodOutputToConvex } from "convex-helpers/server/zod4";
import z from "zod";

export const zSession = z.object({
  convexSessionId: z.string(),
  account: zid("accounts").nullable(),
  data: z.discriminatedUnion("status", [
    z.object({ status: z.literal("active") }),
    z.object({ status: z.literal("expired"), expirationTime: z.number() }),
  ]),
});

export const sessions = defineTable(zodOutputToConvex(zSession)).index(
  "by_convexSessionId",
  ["convexSessionId"],
);
