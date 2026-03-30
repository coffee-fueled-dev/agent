import { bus } from "../../eventBus";
import { unifiedTimeline } from "../events/unifiedTimeline";
import { unifiedTimelineDimensions } from "../events/unifiedTimelineDimensions";

export default {
  unifiedTimeline,
  unifiedTimelineDimensions,
  ...bus.tables,
};
