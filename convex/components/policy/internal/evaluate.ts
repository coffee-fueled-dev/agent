import { policyConfig } from "../../../policy.config";
import type { QueryCtx } from "../_generated/server";
import type {
  AccessTemplate,
  FeatureTemplate,
  RelationTemplate,
} from "../types";

export type ScopeRef = {
  scopeType: string;
  scopeId: string;
};

export type ResolvedScope = ScopeRef & {
  depth: number;
  inherited: boolean;
  relationPath: string[];
};

export type AccessMatch = {
  policyId: string;
  subjectType: string;
  subjectId: string;
  effect: "allow" | "deny";
  resourceId: string | null;
  inherited: boolean;
  depth: number;
  specificity: "exact" | "wildcard";
  precedence: number;
};

export type FeatureMatch = {
  policyId: string;
  subjectType: string;
  subjectId: string;
  effect: "allow" | "deny";
  inherited: boolean;
  depth: number;
  precedence: number;
};

export function assertScopeType(scopeType: string) {
  if (!(policyConfig.scopeTypes as readonly string[]).includes(scopeType)) {
    throw new Error(`Unknown scope type: ${scopeType}`);
  }
}

export function assertAccessTemplate(
  templates: readonly AccessTemplate[],
  resourceType: string,
  action: string,
) {
  const template = templates.find(
    (entry) => entry.resourceType === resourceType,
  );
  if (!template) {
    throw new Error(`Unknown access template: ${resourceType}`);
  }
  if (!template.actions.includes(action)) {
    throw new Error(
      `Unknown action '${action}' for resource '${resourceType}'`,
    );
  }
}

export function assertFeatureTemplate(
  templates: readonly FeatureTemplate[],
  namespace: string,
  action: string,
) {
  const template = templates.find((entry) => entry.namespace === namespace);
  if (!template) {
    throw new Error(`Unknown feature template: ${namespace}`);
  }
  if (!template.actions.includes(action)) {
    throw new Error(`Unknown action '${action}' for feature '${namespace}'`);
  }
}

export function isPolicyActive(
  policy: {
    activeTime: number | null;
    expiredTime: number | null;
  },
  at: number,
) {
  if (policy.activeTime != null && policy.activeTime > at) return false;
  if (policy.expiredTime != null && policy.expiredTime <= at) return false;
  return true;
}

export function assertRelationTemplate(
  templates: readonly RelationTemplate[],
  fromType: string,
  toType: string,
  relation: string,
) {
  const template = templates.find(
    (entry) =>
      entry.relation === relation &&
      entry.from === fromType &&
      entry.to === toType,
  );
  if (!template) {
    throw new Error(
      `Unknown relation '${relation}' from '${fromType}' to '${toType}'`,
    );
  }
  return template;
}

export async function resolveScopes(
  ctx: QueryCtx,
  subject: ScopeRef,
  options?: {
    relations?: string[];
    traversableOnly?: boolean;
  },
) {
  assertScopeType(subject.scopeType);
  const visited = new Set([`${subject.scopeType}:${subject.scopeId}`]);
  const resolvedScopes: ResolvedScope[] = [
    {
      ...subject,
      depth: 0,
      inherited: false,
      relationPath: [],
    },
  ];
  const edges: {
    fromType: string;
    fromId: string;
    relation: string;
    toType: string;
    toId: string;
    depth: number;
  }[] = [];
  const root = resolvedScopes[0] as ResolvedScope;
  const queue: ResolvedScope[] = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const outgoing = await ctx.db
      .query("scope_edges")
      .withIndex("by_from", (q) =>
        q.eq("fromType", current.scopeType).eq("fromId", current.scopeId),
      )
      .collect();

    for (const edge of outgoing) {
      const template = assertRelationTemplate(
        policyConfig.relationTemplates,
        edge.fromType,
        edge.toType,
        edge.relation,
      );
      if (options?.relations && !options.relations.includes(edge.relation)) {
        continue;
      }
      if (options?.traversableOnly && template.traversable === false) {
        continue;
      }

      edges.push({
        fromType: edge.fromType,
        fromId: edge.fromId,
        relation: edge.relation,
        toType: edge.toType,
        toId: edge.toId,
        depth: current.depth + 1,
      });

      const key = `${edge.toType}:${edge.toId}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const next: ResolvedScope = {
        scopeType: edge.toType,
        scopeId: edge.toId,
        depth: current.depth + 1,
        inherited: true,
        relationPath: [...current.relationPath, edge.relation],
      };
      resolvedScopes.push(next);
      queue.push(next);
    }
  }

  return { resolvedScopes, edges };
}

function accessPrecedence(match: AccessMatch) {
  return (
    (match.inherited ? 0 : 100) +
    (match.specificity === "exact" ? 10 : 0) -
    match.depth
  );
}

function featurePrecedence(match: FeatureMatch) {
  return (match.inherited ? 0 : 100) - match.depth;
}

export function resolveAccessDecision(matches: AccessMatch[]) {
  if (matches.length === 0) {
    return {
      decision: "deny" as const,
      reason: "no_match" as const,
      matchedPolicies: [],
    };
  }
  const topPrecedence = Math.max(...matches.map((entry) => entry.precedence));
  const topMatches = matches.filter(
    (entry) => entry.precedence === topPrecedence,
  );
  const decision: "allow" | "deny" = topMatches.some(
    (entry) => entry.effect === "deny",
  )
    ? "deny"
    : "allow";
  return {
    decision,
    reason:
      decision === "allow"
        ? ("matched_allow" as const)
        : ("matched_deny" as const),
    matchedPolicies: topMatches,
  };
}

export function resolveFeatureDecision(matches: FeatureMatch[]) {
  if (matches.length === 0) {
    return {
      decision: "deny" as const,
      reason: "no_match" as const,
      matchedPolicies: [],
    };
  }
  const topPrecedence = Math.max(...matches.map((entry) => entry.precedence));
  const topMatches = matches.filter(
    (entry) => entry.precedence === topPrecedence,
  );
  const decision: "allow" | "deny" = topMatches.some(
    (entry) => entry.effect === "deny",
  )
    ? "deny"
    : "allow";
  return {
    decision,
    reason:
      decision === "allow"
        ? ("matched_allow" as const)
        : ("matched_deny" as const),
    matchedPolicies: topMatches,
  };
}

export function toAccessMatch(args: {
  id: string;
  subjectType: string;
  subjectId: string;
  effect: "allow" | "deny";
  resourceId: string | null;
  scope: ResolvedScope;
}) {
  const match: AccessMatch = {
    policyId: args.id,
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    effect: args.effect,
    resourceId: args.resourceId,
    inherited: args.scope.inherited,
    depth: args.scope.depth,
    specificity: args.resourceId == null ? "wildcard" : "exact",
    precedence: 0,
  };
  match.precedence = accessPrecedence(match);
  return match;
}

export function toFeatureMatch(args: {
  id: string;
  subjectType: string;
  subjectId: string;
  effect: "allow" | "deny";
  scope: ResolvedScope;
}) {
  const match: FeatureMatch = {
    policyId: args.id,
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    effect: args.effect,
    inherited: args.scope.inherited,
    depth: args.scope.depth,
    precedence: 0,
  };
  match.precedence = featurePrecedence(match);
  return match;
}
