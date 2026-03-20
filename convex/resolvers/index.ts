import "./geo";
import "./auth";

import { Session } from "./auth";
import { Location } from "./geo";

export { Location, Session };

declare module "../lib/resolvers" {
  interface ResolverRegistry {
    Session: typeof Session;
    Location: typeof Location;
  }
}
