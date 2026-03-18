import { defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { z } from "zod";

export const zLocation = z.object({
  fullAddress: z.string(),
  mapboxPlaceId: z.string(),
});

export const locations = defineTable(zodOutputToConvex(zLocation)).index(
  "by_mapboxPlaceId",
  ["mapboxPlaceId"],
);
