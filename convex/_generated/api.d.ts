/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as customFunctions from "../customFunctions.js";
import type * as http from "../http.js";
import type * as lib_resolvers_index from "../lib/resolvers/index.js";
import type * as lib_status_index from "../lib/status/index.js";
import type * as models_auth_index from "../models/auth/index.js";
import type * as models_auth_session from "../models/auth/session.js";
import type * as models_geo_index from "../models/geo/index.js";
import type * as models_geo_libs_upsert_index from "../models/geo/libs/upsert/index.js";
import type * as models_geo_location from "../models/geo/location.js";
import type * as models_index from "../models/index.js";
import type * as resolvers_auth from "../resolvers/auth.js";
import type * as resolvers_geo from "../resolvers/geo.js";
import type * as resolvers_index from "../resolvers/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  customFunctions: typeof customFunctions;
  http: typeof http;
  "lib/resolvers/index": typeof lib_resolvers_index;
  "lib/status/index": typeof lib_status_index;
  "models/auth/index": typeof models_auth_index;
  "models/auth/session": typeof models_auth_session;
  "models/geo/index": typeof models_geo_index;
  "models/geo/libs/upsert/index": typeof models_geo_libs_upsert_index;
  "models/geo/location": typeof models_geo_location;
  "models/index": typeof models_index;
  "resolvers/auth": typeof resolvers_auth;
  "resolvers/geo": typeof resolvers_geo;
  "resolvers/index": typeof resolvers_index;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  geospatial: {
    document: {
      get: FunctionReference<
        "query",
        "internal",
        { key: string },
        {
          coordinates: { latitude: number; longitude: number };
          filterKeys: Record<
            string,
            | string
            | number
            | boolean
            | null
            | bigint
            | Array<string | number | boolean | null | bigint>
          >;
          key: string;
          sortKey: number;
        } | null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          document: {
            coordinates: { latitude: number; longitude: number };
            filterKeys: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey: number;
          };
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
        },
        null
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          key: string;
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
        },
        boolean
      >;
    };
    query: {
      debugCells: FunctionReference<
        "query",
        "internal",
        {
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
          rectangle: {
            east: number;
            north: number;
            south: number;
            west: number;
          };
        },
        Array<{
          token: string;
          vertices: Array<{ latitude: number; longitude: number }>;
        }>
      >;
      execute: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          levelMod: number;
          logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
          maxCells: number;
          maxLevel: number;
          minLevel: number;
          query: {
            filtering: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            maxResults: number;
            rectangle: {
              east: number;
              north: number;
              south: number;
              west: number;
            };
            sorting: {
              interval: { endExclusive?: number; startInclusive?: number };
            };
          };
        },
        {
          nextCursor?: string;
          results: Array<{
            coordinates: { latitude: number; longitude: number };
            key: string;
          }>;
        }
      >;
      nearestPoints: FunctionReference<
        "query",
        "internal",
        {
          filtering: Array<{
            filterKey: string;
            filterValue: string | number | boolean | null | bigint;
            occur: "should" | "must";
          }>;
          levelMod: number;
          logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
          maxDistance?: number;
          maxLevel: number;
          maxResults: number;
          minLevel: number;
          nextCursor?: string;
          point: { latitude: number; longitude: number };
          sorting: {
            interval: { endExclusive?: number; startInclusive?: number };
          };
        },
        Array<{
          coordinates: { latitude: number; longitude: number };
          distance: number;
          key: string;
        }>
      >;
    };
  };
  facts: {
    public: {
      evaluate: {
        deriveSelection: FunctionReference<
          "query",
          "internal",
          {
            entityType: string;
            namespace: string;
            partitions: Array<string>;
            scope?: string;
            selected: string;
          },
          {
            lastIndex: number | null;
            partitionTails: Array<{
              index: number | null;
              partition: string;
              tail: string | null;
            }>;
            selectedIndex: number | null;
          }
        >;
        getOrderedFacts: FunctionReference<
          "query",
          "internal",
          { entityType?: string; namespace: string; scope?: string },
          Array<{
            attrs?: any;
            entity: string;
            entityType: string;
            labels: Array<string>;
            order: Array<number>;
            scope?: string;
            state?: string;
          }>
        >;
        getPartitionTail: FunctionReference<
          "query",
          "internal",
          { namespace: string; partition: string; scope?: string },
          { partition: string; tail: string | null } | null
        >;
        getReachableFacts: FunctionReference<
          "query",
          "internal",
          { edgeKinds: Array<string>; from: string; namespace: string },
          Array<string>
        >;
      };
      sync: {
        removeFacts: FunctionReference<
          "mutation",
          "internal",
          { entities: Array<string>; namespace: string },
          null
        >;
        upsertFacts: FunctionReference<
          "mutation",
          "internal",
          {
            edges: Array<{
              attrs?: any;
              from: string;
              kind: string;
              scope?: string;
              to: string;
            }>;
            items: Array<{
              attrs?: any;
              entity: string;
              entityType: string;
              labels: Array<string>;
              order: Array<number>;
              scope?: string;
              state?: string;
            }>;
            mode?: "direct" | "event";
            namespace: string;
            partitions?: Array<{
              attrs?: any;
              count: number;
              head?: string;
              membersVersion?: number;
              partition: string;
              scope?: string;
              tail?: string;
            }>;
            projector?: string;
            version?: number;
          },
          null
        >;
      };
    };
  };
  events: {
    public: {
      append: {
        appendToStream: FunctionReference<
          "mutation",
          "internal",
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime?: number;
            eventType: string;
            expectedVersion?: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
          },
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }
        >;
      };
      projectors: {
        advanceCheckpoint: FunctionReference<
          "mutation",
          "internal",
          {
            lastSequence: number;
            leaseOwner?: string;
            projector: string;
            releaseClaim?: boolean;
            streamType: string;
          },
          {
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          }
        >;
        claimOrReadCheckpoint: FunctionReference<
          "mutation",
          "internal",
          {
            leaseDurationMs?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
          },
          {
            checkpoint: {
              lastSequence: number;
              leaseExpiresAt?: number;
              leaseOwner?: string;
              projector: string;
              streamType: string;
              updatedTime: number;
            };
            claimed: boolean;
          }
        >;
        listUnprocessedEvents: FunctionReference<
          "query",
          "internal",
          { limit?: number; projector: string; streamType: string },
          Array<{
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }>
        >;
        readCheckpoint: FunctionReference<
          "query",
          "internal",
          { projector: string; streamType: string },
          {
            lastSequence: number;
            leaseExpiresAt?: number;
            leaseOwner?: string;
            projector: string;
            streamType: string;
            updatedTime: number;
          } | null
        >;
      };
      read: {
        getEvent: FunctionReference<
          "query",
          "internal",
          { eventId: string; streamId: string; streamType: string },
          {
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            streamId: string;
            streamType: string;
            streamVersion: number;
          } | null
        >;
        listCategoryEvents: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            streamType: string;
          },
          any
        >;
        listStreamEvents: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            streamId: string;
            streamType: string;
          },
          any
        >;
      };
      streams: {
        getStream: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          {
            createdTime: number;
            lastEventSequence: number | null;
            streamId: string;
            streamType: string;
            updatedTime: number;
            version: number;
          } | null
        >;
        getStreamVersion: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          number
        >;
      };
    };
  };
  history: {
    public: {
      append: {
        append: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime?: number;
            kind: string;
            parentEntryIds?: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }
        >;
      };
      heads: {
        listHeads: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          Array<{
            entryId: string;
            headKind?: string;
            streamId: string;
            streamType: string;
          }>
        >;
      };
      read: {
        getChildren: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        getEntry: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          } | null
        >;
        getLatestCommonAncestor: FunctionReference<
          "query",
          "internal",
          {
            leftEntryId: string;
            rightEntryId: string;
            streamId: string;
            streamType: string;
          },
          {
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          } | null
        >;
        getParents: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        getPathToRoot: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          Array<{
            attrs?: Record<string, string | number | boolean | null>;
            author?: { byId: string; byType: string };
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds: Array<string>;
            payload?: any;
            streamId: string;
            streamType: string;
          }>
        >;
        isAncestor: FunctionReference<
          "query",
          "internal",
          {
            ancestorEntryId: string;
            descendantEntryId: string;
            streamId: string;
            streamType: string;
          },
          boolean
        >;
        listEntries: FunctionReference<
          "query",
          "internal",
          {
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            streamId: string;
            streamType: string;
          },
          any
        >;
      };
    };
  };
  policy: {
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
          }
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
          }
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
          null
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
          }>
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
          }>
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
          null
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
          null
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
          null
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
          }
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
          null
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
          }
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
          }>
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
          }>
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
          null
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
          null
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
          null
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
          null
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
          }>
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
          }>
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
          null
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
          }
        >;
        unlink: FunctionReference<
          "mutation",
          "internal",
          {
            from: { scopeId: string; scopeType: string };
            relation: string;
            to: { scopeId: string; scopeType: string };
          },
          null
        >;
      };
    };
  };
};
