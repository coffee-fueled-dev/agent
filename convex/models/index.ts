import auth from "./auth";
import context from "./context";
import geo from "./geo";
import llms from "./llms";

export const appTables = {
  ...auth,
  ...context,
  ...geo,
  ...llms,
};
