import {
  createResolverBase,
  registerResolver,
  requireFactory,
} from "../lib/resolvers";

const AccountBase = createResolverBase("accounts");
const AccountAliasBase = createResolverBase("accountAliases");
const SessionBase = createResolverBase("sessions");

export class Account extends AccountBase {
  static require = requireFactory(Account);
}

export class AccountAlias extends AccountAliasBase {
  static require = requireFactory(AccountAlias);
}

export class Session extends SessionBase {
  static require = requireFactory(Session);
}

registerResolver(Account);
registerResolver(AccountAlias);
registerResolver(Session);
