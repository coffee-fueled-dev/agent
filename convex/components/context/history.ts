import { HistoryClient } from "../history/client";
import { components } from "./_generated/api";
import { historyConfig } from "./history.config";

export const history = new HistoryClient(components.history, historyConfig);
