/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    public: {
      access: {
        check: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              resourceId: string | null;
              specificity: "exact" | "wildcard";
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          },
          Name
        >;
        explain: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              resourceId: string | null;
              specificity: "exact" | "wildcard";
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          },
          Name
        >;
        grant: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            activeTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime?: number | null;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        listByResource: FunctionReference<
          "query",
          "internal",
          { resourceId: string | null; resourceType: string },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            resourceId: string | null;
            resourceType: string;
            subjectId: string;
            subjectType: string;
          }>,
          Name
        >;
        listBySubject: FunctionReference<
          "query",
          "internal",
          { subject: { scopeId: string; scopeType: string } },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            resourceId: string | null;
            resourceType: string;
            subjectId: string;
            subjectType: string;
          }>,
          Name
        >;
        replaceSubjectPolicies: FunctionReference<
          "mutation",
          "internal",
          {
            policies: Array<{
              action: string;
              activeTime?: number | null;
              attrs?: Record<string, string | number | boolean | null>;
              effect: "allow" | "deny";
              expiredTime?: number | null;
              resourceId: string | null;
              resourceType: string;
            }>;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        requireAccess: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          null,
          Name
        >;
        revoke: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            effect?: "allow" | "deny";
            resourceId: string | null;
            resourceType: string;
            subject: { scopeId: string; scopeType: string };
          },
          null,
          Name
        >;
      };
      features: {
        check: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          },
          Name
        >;
        entitle: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            activeTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime?: number | null;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        explain: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          {
            decision: "allow" | "deny";
            matchedPolicies: Array<{
              depth: number;
              effect: "allow" | "deny";
              inherited: boolean;
              policyId: string;
              precedence: number;
              subjectId: string;
              subjectType: string;
            }>;
            reason: "matched_allow" | "matched_deny" | "no_match";
            resolvedScopes: Array<{
              depth: number;
              inherited: boolean;
              relationPath: Array<string>;
              scopeId: string;
              scopeType: string;
            }>;
          },
          Name
        >;
        listByNamespace: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            namespace: string;
            subjectId: string;
            subjectType: string;
          }>,
          Name
        >;
        listBySubject: FunctionReference<
          "query",
          "internal",
          { subject: { scopeId: string; scopeType: string } },
          Array<{
            action: string;
            activeTime: number | null;
            attrs?: Record<string, string | number | boolean | null>;
            effect: "allow" | "deny";
            expiredTime: number | null;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            namespace: string;
            subjectId: string;
            subjectType: string;
          }>,
          Name
        >;
        replaceSubjectEntitlements: FunctionReference<
          "mutation",
          "internal",
          {
            policies: Array<{
              action: string;
              activeTime?: number | null;
              attrs?: Record<string, string | number | boolean | null>;
              effect: "allow" | "deny";
              expiredTime?: number | null;
              namespace: string;
            }>;
            subject: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        requireEntitlement: FunctionReference<
          "query",
          "internal",
          {
            action: string;
            at?: number;
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          null,
          Name
        >;
        revoke: FunctionReference<
          "mutation",
          "internal",
          {
            action: string;
            effect?: "allow" | "deny";
            namespace: string;
            subject: { scopeId: string; scopeType: string };
          },
          null,
          Name
        >;
      };
      scopes: {
        link: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            from: { scopeId: string; scopeType: string };
            relation: string;
            to: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        listEdges: FunctionReference<
          "query",
          "internal",
          {
            relation?: string;
            subject?: { scopeId: string; scopeType: string };
          },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            fromId: string;
            fromType: string;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            relation: string;
            toId: string;
            toType: string;
          }>,
          Name
        >;
        listNodes: FunctionReference<
          "query",
          "internal",
          { scopeType?: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            lastUpdate: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
              time: number;
            };
            scopeId: string;
            scopeType: string;
          }>,
          Name
        >;
        register: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            scope: { scopeId: string; scopeType: string };
            update?: {
              byId: string;
              byType: string;
              reason?: string;
              source?: string;
            };
          },
          null,
          Name
        >;
        resolve: FunctionReference<
          "query",
          "internal",
          {
            relations?: Array<string>;
            subject: { scopeId: string; scopeType: string };
          },
          {
            edges: Array<{
              depth: number;
              fromId: string;
              fromType: string;
              relation: string;
              toId: string;
              toType: string;
            }>;
            scopes: Array<{ scopeId: string; scopeType: string }>;
          },
          Name
        >;
        unlink: FunctionReference<
          "mutation",
          "internal",
          {
            from: { scopeId: string; scopeType: string };
            relation: string;
            to: { scopeId: string; scopeType: string };
          },
          null,
          Name
        >;
      };
    };
  };
