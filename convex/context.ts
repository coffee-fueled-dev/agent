import { components } from "./_generated/api";
import { ContextClient } from "./components/context/client";
import { getGoogleApiKey } from "./env";

export const context = new ContextClient(components.context, {
  googleApiKey: getGoogleApiKey(),
});
