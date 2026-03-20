import { components } from "./_generated/api";
import { HistoryClient } from "./components/history/client";
import { historyConfig } from "./history.config";

export const history = new HistoryClient(components.history, historyConfig);
