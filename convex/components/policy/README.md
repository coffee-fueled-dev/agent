# Policy

`policy` is a small Convex authorization component.

It gives you three things:

- `scopes`: register subjects and optional scope relationships
- `access`: grant or deny actions on concrete resources
- `features`: grant or deny actions on named capability namespaces

## Good Fit

Use it when you want:

- app-owned policy templates
- typed client calls instead of stringly-typed checks
- direct and inherited authorization decisions
- explainable check results

## App Config

Keep domain registration in app code:

```ts
import type { PolicyConfig } from "./components/policy/types";

export const policyConfig = {
  accessTemplates: [
    { resourceType: "document", actions: ["read", "write"] },
  ],
  featureTemplates: [
    { namespace: "docs:editor", actions: ["use"] },
  ],
  scopeTypes: ["user", "team"],
  relationTemplates: [
    { relation: "member_of", from: "user", to: "team", traversable: true },
  ],
} as const satisfies PolicyConfig;
```

## Client

```ts
import { components } from "../_generated/api";
import { PolicyClient } from "./components/policy/client";

export const policy = new PolicyClient(components.policy, policyConfig);
```

## Example

```ts
await policy.scopes.register(ctx, {
  scope: { scopeType: "user", scopeId: userId },
});

await policy.access.grant(ctx, {
  subject: { scopeType: "user", scopeId: userId },
  resourceType: "document",
  resourceId: documentId,
  action: "read",
  effect: "allow",
});

const decision = await policy.access.check(ctx, {
  subject: { scopeType: "user", scopeId: userId },
  resourceType: "document",
  resourceId: documentId,
  action: "read",
});
```

Use `check` when you only need the decision. Use `explain` when you need the matched policy path for debugging or UI.
