import type { ComponentApi as HistoryComponentApi } from "../../history/_generated/component";
import { HistoryClient } from "../../history/client";
import { historyConfig } from "../../../history.config";
import { components } from "../_generated/api";

const historyComponent = (components as {
  history: HistoryComponentApi<"history">;
}).history;

export const agentMemoryHistory = new HistoryClient(
  historyComponent,
  historyConfig,
);
