import { HistoryClient } from "@very-coffee/convex-history";
import { components } from "./_generated/api";
import { historyConfig } from "./history.config";

export const history = new HistoryClient(components.history, historyConfig);
