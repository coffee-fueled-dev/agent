import {
  createResolverBase,
  registerResolver,
  requireFactory,
} from "../lib/resolvers";

const SessionBase = createResolverBase("sessions");

export class Session extends SessionBase {
  static require = requireFactory(Session);
}

registerResolver(Session);
