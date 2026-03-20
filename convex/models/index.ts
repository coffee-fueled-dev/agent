import auth from "./auth";
import geo from "./geo";
import llms from "./llms";

export const appTables = {
  ...auth,
  ...geo,
  ...llms,
};
