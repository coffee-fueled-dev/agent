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
          },
          Name
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
          }>,
          Name
        >;
        getPartitionTail: FunctionReference<
          "query",
          "internal",
          { namespace: string; partition: string; scope?: string },
          { partition: string; tail: string | null } | null,
          Name
        >;
        getReachableFacts: FunctionReference<
          "query",
          "internal",
          { edgeKinds: Array<string>; from: string; namespace: string },
          Array<string>,
          Name
        >;
      };
      sync: {
        removeFacts: FunctionReference<
          "mutation",
          "internal",
          { entities: Array<string>; namespace: string },
          null,
          Name
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
          null,
          Name
        >;
      };
    };
  };
