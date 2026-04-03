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
        appendEmbeddingSlice: FunctionReference<
          "mutation",
          "internal",
          {
            embedding: Array<number>;
            namespace: string;
            propKey: string;
            sliceId?: string;
            sourceRef: string;
            sourceSystem: string;
            updatedAt?: number;
          },
          string,
          Name
        >;
        deleteItem: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; sourceRef: string; sourceSystem: string },
          null,
          Name
        >;
        upsertItem: FunctionReference<
          "mutation",
          "internal",
          {
            bucketId?: string;
            bucketType?: string;
            embedding?: Array<number>;
            embeddingSlices?: Array<{
              embedding: Array<number>;
              propKey: string;
              sliceId?: string;
            }>;
            namespace: string;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            updatedAt?: number;
          },
          string,
          Name
        >;
      };
      search: {
        vectorSearch: FunctionReference<
          "action",
          "internal",
          {
            limit?: number;
            namespace: string;
            sourceSystem?: string;
            vector: Array<number>;
          },
          Array<{
            _creationTime: number;
            _id: string;
            bucketId?: string;
            bucketType?: string;
            namespace: string;
            propertyHits: Array<{
              _score: number;
              propKey: string;
              sliceId: string;
            }>;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            updatedAt: number;
          }>,
          Name
        >;
      };
    };
  };
