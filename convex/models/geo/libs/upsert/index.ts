import type { MutationCtx } from "../../../../_generated/server";
import { Location } from "../../../../resolvers/geo";

export async function upsertLocation(
  ctx: MutationCtx,
  data: { mapboxPlaceId: string; fullAddress: string },
) {
  const existing = await Location.query(ctx)
    .withIndex("by_mapboxPlaceId", (q) =>
      q.eq("mapboxPlaceId", data.mapboxPlaceId),
    )
    .first();
  if (existing) return existing._id;
  return ctx.db.insert("locations", data);
}
