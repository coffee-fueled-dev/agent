import {
  createResolverBase,
  registerResolver,
  requireFactory,
} from "../lib/resolvers";

const LocationBase = createResolverBase("locations");

export class Location extends LocationBase {
  static require = requireFactory(Location);
}

registerResolver(Location);
