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
      core: {
        getMemory: FunctionReference<
          "query",
          "internal",
          { memoryId: string; namespace: string },
          null | {
            fullText: string;
            key: string;
            memoryId: string;
            namespace: string;
            updatedAt: number;
          },
          Name
        >;
        getUpsertMemoryContext: FunctionReference<
          "query",
          "internal",
          { key: string; namespace: string; sourceRef?: string },
          { ragKey: string; resolvedMemoryId: string | null },
          Name
        >;
        listMemoryPage: FunctionReference<
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
            page: Array<{ key: string; memoryId: string; updatedAt: number }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        listVersionsPage: FunctionReference<
          "query",
          "internal",
          {
            memoryId: string;
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
              createdAt: number;
              entryId: string;
              key: string;
              memoryId: string;
              textSnapshot: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        recallVersion: FunctionReference<
          "query",
          "internal",
          { entryId: string; memoryId: string; namespace: string },
          null | {
            createdAt: number;
            entryId: string;
            key: string;
            memoryId: string;
            textSnapshot: string;
            title?: string;
          },
          Name
        >;
        recordMemoryAfterRagAdd: FunctionReference<
          "action",
          "internal",
          {
            actor?: { byId: string; byType: string };
            apiKey?: string;
            embedding: Array<number>;
            key: string;
            memoryId: string;
            namespace: string;
            ragKey: string;
            resolvedMemoryId: string | null;
            searchText?: string;
            similarityK?: number;
            similarityThreshold?: number;
            sourceRef?: string;
            text: string;
            title?: string;
          },
          { memoryId: string },
          Name
        >;
        removeMemory: FunctionReference<
          "action",
          "internal",
          { apiKey?: string; memoryId: string; namespace: string },
          null,
          Name
        >;
        upsertMemory: FunctionReference<
          "action",
          "internal",
          {
            actor?: { byId: string; byType: string };
            apiKey?: string;
            chunks?: Array<{ embedding: Array<number>; text: string }>;
            key: string;
            namespace: string;
            searchText?: string;
            similarityK?: number;
            similarityThreshold?: number;
            sourceRef?: string;
            text: string;
            title?: string;
          },
          { memoryId: string },
          Name
        >;
      };
      graph: {
        createCommunityJob: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; params: { k: number; resolution: number } },
          string,
          Name
        >;
        expandNeighbors: FunctionReference<
          "query",
          "internal",
          { limit?: number; memoryId: string },
          Array<string>,
          Name
        >;
        getCommunityForMemory: FunctionReference<
          "query",
          "internal",
          { memoryId: string; namespace: string },
          null | { communityId: number },
          Name
        >;
        getLatestCommunities: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          | null
          | {
              communities: Array<{
                id: number;
                memberCount: number;
                sampleMemoryIds: Array<string>;
              }>;
              completionTime: number;
              edgeCount: number;
              jobId: string;
              memoryCount: number;
              stale: boolean;
              status: "completed";
            }
          | any,
          Name
        >;
        getNeighborEdges: FunctionReference<
          "query",
          "internal",
          { memoryId: string },
          Array<{ neighbor: string; score: number }>,
          Name
        >;
        scheduleCommunityRebuild: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; namespace: string },
          null,
          Name
        >;
      };
      retrieval: {
        searchMemory: FunctionReference<
          "action",
          "internal",
          {
            apiKey?: string;
            fileEmbeddings?: Array<Array<number>>;
            graphWeight?: number;
            lexicalWeight?: number;
            limit?: number;
            minScore?: number;
            namespace: string;
            query: string | Array<number>;
            retrievalMode?: "vector" | "lexical" | "hybrid";
            rrfK?: number;
            vectorWeight?: number;
          },
          Array<{
            key: string;
            memoryId: string;
            score: number;
            text: string;
            title?: string;
          }>,
          Name
        >;
      };
    };
  };
