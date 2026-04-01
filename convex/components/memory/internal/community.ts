import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const markCommunitiesStale = internalMutation({
  args: { namespace: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("memoryCommunityJobs")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .collect();
    for (const job of jobs) {
      if (job.data.status === "completed" && !job.stale) {
        await ctx.db.patch(job._id, { stale: true, updateTime: Date.now() });
      }
    }
  },
});
