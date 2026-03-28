import auth from "./auth";
import context from "./context";
import events from "./events";
import geo from "./geo";
import llms from "./llms";

export const appTables = {
  ...auth,
  ...context,
  ...geo,
  ...llms,
  ...events,
};
