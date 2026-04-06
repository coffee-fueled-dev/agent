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
      ontology: {
        seedMemoryGraphOntology: FunctionReference<
          "mutation",
          "internal",
          {},
          null,
          Name
        >;
      };
      records: {
        deleteMemoryRecordDocument: FunctionReference<
          "mutation",
          "internal",
          { memoryRecordId: string; namespace: string },
          null,
          Name
        >;
        deleteMemorySearchIndexes: FunctionReference<
          "mutation",
          "internal",
          { memoryRecordId: string; namespace: string },
          null,
          Name
        >;
        deleteMemorySourceMapBatch: FunctionReference<
          "mutation",
          "internal",
          { limit: number; memoryRecordId: string; namespace: string },
          { deleted: number; hasMore: boolean },
          Name
        >;
        getMemoryRecord: FunctionReference<
          "query",
          "internal",
          { memoryRecordId: string; namespace: string },
          null | { key: string; text?: string; title?: string },
          Name
        >;
        listMemoryRecordsPaginated: FunctionReference<
          "query",
          "internal",
          {
            namespace: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              key: string;
              namespace: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        patchMemoryRecordTitle: FunctionReference<
          "mutation",
          "internal",
          { memoryRecordId: string; namespace: string; title: string },
          null,
          Name
        >;
        tryDeleteMemoryGraphNode: FunctionReference<
          "mutation",
          "internal",
          { memoryRecordId: string; namespace: string },
          null,
          Name
        >;
      };
      search: {
        searchMemory: FunctionReference<
          "action",
          "internal",
          {
            armBias?: {
              lexical?: number;
              vectorFile?: number;
              vectorQuery?: number;
            };
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
          {
            memoryRecordId: string;
            namespace: string;
            paginationOpts?: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            searchBackend?: "lexical" | "vector" | "graph";
            type?: string;
          },
          | Array<{
              contentSource: { id: string; type: string };
              fileName?: string;
              mimeType?: string;
              searchBackend: "lexical" | "vector" | "graph";
              searchItemId: string;
            }>
          | {
              continueCursor: string;
              isDone: boolean;
              page: Array<{
                contentSource: { id: string; type: string };
                fileName?: string;
                mimeType?: string;
                searchBackend: "lexical" | "vector" | "graph";
                searchItemId: string;
              }>;
              pageStatus?: "SplitRecommended" | "SplitRequired" | null;
              splitCursor?: string | null;
            },
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
            memoryLinks?: Array<
              | {
                  edge: "SIMILAR_TO";
                  score: number;
                  targetMemoryRecordId: string;
                }
              | {
                  edge: "RELATES_TO";
                  relationship: string;
                  targetMemoryRecordId: string;
                }
              | {
                  edge: "REFINES";
                  refinement: string;
                  targetMemoryRecordId: string;
                }
            >;
            memoryRecordId?: string;
            mimeType?: string;
            mode?: null | "append";
            namespace: string;
            ontologyNodeLabel?:
              | "Fact"
              | "Preference"
              | "Procedure"
              | "Reference";
            skipCanonicalText?: boolean;
            title?: string;
          },
          { memoryRecordId: string; workId: string },
          Name
        >;
      };
    };
  };
