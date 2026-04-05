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
      records: {
        getMemoryRecord: FunctionReference<
          "query",
          "internal",
          { memoryRecordId: string; namespace: string },
          null | { key: string; text?: string; title?: string },
          Name
        >;
      };
      search: {
        searchMemory: FunctionReference<
          "action",
          "internal",
          {
            embedding?: Array<number>;
            googleApiKey?: string;
            k?: number;
            lexicalQuery?: string;
            limit?: number;
            namespace: string;
            perArmLimit?: number;
            query: string;
          },
          Array<{
            contributions: Array<{
              armId: string;
              rank: number;
              score: number;
            }>;
            lexical: null | {
              _creationTime: number;
              _id: string;
              bucketId?: string;
              bucketType?: string;
              namespace: string;
              propertyHits: Array<{ propKey: string; text: string }>;
              sourceRef: string;
              sourceSystem: string;
              sourceVersion?: number;
              supersededAt?: number;
              updatedAt: number;
            };
            rrfScore: number;
            sourceRef: string;
            vector: null | {
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
            };
          }>,
          Name
        >;
      };
      sourceMaps: {
        listSourceMapsForMemory: FunctionReference<
          "query",
          "internal",
          { memoryRecordId: string; namespace: string; type?: string },
          Array<{
            contentSource: { id: string; type: string };
            fileName?: string;
            mimeType?: string;
            searchBackend: "lexical" | "vector";
            searchItemId: string;
          }>,
          Name
        >;
        registerStorageSourceMetadata: FunctionReference<
          "mutation",
          "internal",
          {
            contentSource: { id: string; type: string };
            fileName?: string;
            memoryRecordId: string;
            mimeType: string;
            namespace: string;
          },
          null,
          Name
        >;
      };
      store: {
        mergeMemory: FunctionReference<
          "mutation",
          "internal",
          {
            content: Array<
              | { text: string }
              | { embedding: Array<number> }
              | { embedding: Array<number>; text: string }
            >;
            contentSource?: { id: string; type: string };
            fileName?: string;
            googleApiKey?: string;
            key?: string;
            memoryRecordId?: string;
            mimeType?: string;
            mode?: null | "append";
            namespace: string;
            skipCanonicalText?: boolean;
            title?: string;
          },
          { memoryRecordId: string; workId: string },
          Name
        >;
      };
    };
  };
