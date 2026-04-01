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
      add: {
        deleteFeature: FunctionReference<
          "mutation",
          "internal",
          { featureId: string; namespace: string },
          null,
          Name
        >;
        upsertFeature: FunctionReference<
          "mutation",
          "internal",
          {
            bucketId?: string;
            bucketType?: string;
            featureId: string;
            namespace: string;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            text?: string;
            textSlices?: Array<{ propKey: string; text: string }>;
            title?: string;
            updatedAt?: number;
          },
          string,
          Name
        >;
      };
      search: {
        lexicalSearch: FunctionReference<
          "query",
          "internal",
          {
            limit?: number;
            namespace: string;
            query: string;
            sourceSystem?: string;
          },
          Array<{
            _creationTime: number;
            _id: string;
            bucketId?: string;
            bucketType?: string;
            featureId: string;
            matchedPropKey: string;
            namespace: string;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            text: string;
            title?: string;
            updatedAt: number;
          }>,
          Name
        >;
      };
    };
  };
