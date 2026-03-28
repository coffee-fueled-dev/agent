import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "unified-timeline-projector",
  { minutes: 1 },
  internal.chat.unifiedTimeline.runProjectorTick,
);

export default crons;
