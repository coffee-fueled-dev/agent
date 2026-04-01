import { IdentityClient } from "../_components/identity/client/index.js";
import { components } from "../_generated/api.js";

export const identityClient = new IdentityClient(components.identity);
