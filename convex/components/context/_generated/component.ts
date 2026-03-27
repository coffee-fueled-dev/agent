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
      community: {
        batchKnnSearch: FunctionReference<
          "action",
          "internal",
          { entryIds: Array<string>; k: number; namespace: string },
          Array<{
            entryId: string;
            neighbors: Array<{ entryId: string; score: number }>;
          }>,
          Name
        >;
        clearAssignments: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean },
          Name
        >;
        clearStaging: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean },
          Name
        >;
        createJob: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; params: { k: number; resolution: number } },
          string,
          Name
        >;
        createSimilarityEdgeBatch: FunctionReference<
          "mutation",
          "internal",
          { edges: Array<{ from: string; score: number; to: string }> },
          number,
          Name
        >;
        deleteSimilarityEdgesForEntries: FunctionReference<
          "mutation",
          "internal",
          { entryIds: Array<string> },
          number,
          Name
        >;
        deleteSimilarityEdgesForNode: FunctionReference<
          "mutation",
          "internal",
          { nodeKey: string },
          { deleted: number; hasMore: boolean },
          Name
        >;
        getCommunityForEntry: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          null | { communityId: number },
          Name
        >;
        getCommunityMembers: FunctionReference<
          "query",
          "internal",
          { communityId: number; namespace: string },
          Array<string>,
          Name
        >;
        getEntryMetas: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string>; namespace: string },
          Array<{
            entryId: string;
            observationTime?: number;
            textPreview: string;
            title?: string;
          }>,
          Name
        >;
        getJob: FunctionReference<
          "query",
          "internal",
          { jobId: string },
          any,
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
                sampleEntryIds: Array<string>;
              }>;
              completionTime: number;
              edgeCount: number;
              entryCount: number;
              jobId: string;
              stale: boolean;
              status: "completed";
            }
          | {
              jobId: string;
              loadedCount: number;
              phase: "loading" | "building" | "detecting" | "writing";
              stale: boolean;
              status: "running";
            }
          | { error: string; jobId: string; stale: boolean; status: "failed" }
          | { jobId: string; stale: boolean; status: "pending" },
          Name
        >;
        getNeighborEdges: FunctionReference<
          "query",
          "internal",
          { entryId: string },
          Array<{ neighbor: string; score: number }>,
          Name
        >;
        getNeighborEdgesBatch: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string> },
          Array<{
            entryId: string;
            neighbors: Array<{ neighbor: string; score: number }>;
          }>,
          Name
        >;
        markCompleted: FunctionReference<
          "mutation",
          "internal",
          {
            communities: Array<{
              id: number;
              memberCount: number;
              sampleEntryIds: Array<string>;
            }>;
            edgeCount: number;
            entryCount: number;
            jobId: string;
          },
          null,
          Name
        >;
        markFailed: FunctionReference<
          "mutation",
          "internal",
          { error: string; jobId: string },
          null,
          Name
        >;
        markRunning: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; workflowId: string },
          null,
          Name
        >;
        readStagingAssignmentPage: FunctionReference<
          "query",
          "internal",
          {
            jobId: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          any,
          Name
        >;
        readStagingEdgePage: FunctionReference<
          "query",
          "internal",
          {
            jobId: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
          },
          any,
          Name
        >;
        updatePhase: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            loadedCount?: number;
            phase: "loading" | "building" | "detecting" | "writing";
          },
          null,
          Name
        >;
        writeAssignments: FunctionReference<
          "mutation",
          "internal",
          {
            assignments: Array<{ communityId: number; entryId: string }>;
            jobId: string;
            namespace: string;
          },
          null,
          Name
        >;
        writeStagingAssignments: FunctionReference<
          "mutation",
          "internal",
          {
            assignments: Array<{ communityId: number; nodeId: string }>;
            jobId: string;
          },
          null,
          Name
        >;
        writeStagingEdges: FunctionReference<
          "mutation",
          "internal",
          {
            edges: Array<{ from: string; to: string; weight: number }>;
            jobId: string;
          },
          null,
          Name
        >;
      };
      entries: {
        add: FunctionReference<
          "action",
          "internal",
          {
            apiKey?: string;
            chunks?: Array<{ embedding: Array<number>; text: string }>;
            key: string;
            namespace: string;
            observationTime?: number;
            searchText?: string;
            similarityK?: number;
            similarityThreshold?: number;
            source?:
              | {
                  document: string;
                  documentId: string;
                  entryId: string;
                  key: string;
                  kind: "document";
                  sourceType: "text" | "binary";
                }
              | {
                  contentId: string;
                  kind: "content";
                  sourceType: "text" | "binary";
                };
            sourceType?: "text" | "binary";
            text: string;
            title?: string;
          },
          { entryId: string },
          Name
        >;
        edit: FunctionReference<
          "action",
          "internal",
          {
            apiKey?: string;
            entryId: string;
            namespace: string;
            observationTime?: number;
            similarityK?: number;
            similarityThreshold?: number;
            text: string;
            title?: string;
          },
          { entryId: string },
          Name
        >;
        get: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          null | {
            entryId: string;
            fullText: string;
            key: string;
            legacyEntryId?: string;
            namespace: string;
            observationTime?: number;
            source:
              | {
                  document: string;
                  documentId: string;
                  entryId: string;
                  key: string;
                  kind: "document";
                  sourceType: "text" | "binary";
                }
              | {
                  contentId: string;
                  kind: "content";
                  sourceType: "text" | "binary";
                };
            textPreview: string;
            title?: string;
            version: null | {
              data:
                | { status: "current" }
                | {
                    replacedByEntryId: string;
                    replacementTime: number;
                    status: "historical";
                  };
              key: string;
            };
            versionChain: Array<{
              entryId: string;
              entryTime: number;
              kind: string;
              payload?: any;
            }>;
          },
          Name
        >;
        getAccessStatsBatch: FunctionReference<
          "query",
          "internal",
          { entryIds: Array<string> },
          any,
          Name
        >;
        getEntryAccessEvent: FunctionReference<
          "query",
          "internal",
          { entryId: string; eventId: string; namespace: string },
          any | null,
          Name
        >;
        getEntryAccessWeekByDay: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          Array<{ day: string; searches: number; views: number }>,
          Name
        >;
        listEntryAccessEvents: FunctionReference<
          "query",
          "internal",
          {
            entryId: string;
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
            page: Array<any>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        recordView: FunctionReference<
          "mutation",
          "internal",
          {
            actor?: { byId: string; byType: string };
            entryId: string;
            idempotencyKey?: string;
            namespace: string;
            session?: string;
          },
          null,
          Name
        >;
        remove: FunctionReference<
          "action",
          "internal",
          { apiKey?: string; entryId: string; namespace: string },
          null,
          Name
        >;
      };
      list: {
        listEntries: FunctionReference<
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
              entryId: string;
              key: string;
              legacyEntryId?: string;
              namespace: string;
              observationTime?: number;
              source:
                | {
                    document: string;
                    documentId: string;
                    entryId: string;
                    key: string;
                    kind: "document";
                    sourceType: "text" | "binary";
                  }
                | {
                    contentId: string;
                    kind: "content";
                    sourceType: "text" | "binary";
                  };
              textPreview: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      projection: {
        clearPointsForJob: FunctionReference<
          "mutation",
          "internal",
          { jobId: string },
          { hasMore: boolean },
          Name
        >;
        createJob: FunctionReference<
          "mutation",
          "internal",
          { limit: number; namespace: string },
          string,
          Name
        >;
        getJob: FunctionReference<
          "query",
          "internal",
          { jobId: string },
          any,
          Name
        >;
        getLatestProjection: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          | null
          | {
              completionTime: number;
              jobId: string;
              points: Array<{
                decayedScore?: number;
                entryId: string;
                key: string;
                lastAccessTime?: number;
                mimeType?: string;
                textPreview: string;
                title?: string;
                totalAccesses?: number;
                x: number;
                y: number;
                z: number;
              }>;
              stale: boolean;
              status: "completed";
            }
          | {
              jobId: string;
              loadedCount: number;
              phase: "loading" | "projecting";
              stale: boolean;
              status: "running";
            }
          | { error: string; jobId: string; stale: boolean; status: "failed" }
          | { jobId: string; stale: boolean; status: "pending" },
          Name
        >;
        getProjectionStatus: FunctionReference<
          "query",
          "internal",
          { jobId: string },
          | null
          | {
              completionTime: number;
              namespace: string;
              points: Array<{
                decayedScore?: number;
                entryId: string;
                key: string;
                lastAccessTime?: number;
                mimeType?: string;
                textPreview: string;
                title?: string;
                totalAccesses?: number;
                x: number;
                y: number;
                z: number;
              }>;
              stale: boolean;
              status: "completed";
            }
          | {
              error: string;
              failureTime: number;
              namespace: string;
              stale: boolean;
              status: "failed";
            }
          | {
              loadedCount: number;
              namespace: string;
              phase: "loading" | "projecting";
              stale: boolean;
              status: "running";
            }
          | { namespace: string; stale: boolean; status: "pending" },
          Name
        >;
        loadCurrentEntryIdPage: FunctionReference<
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
          any,
          Name
        >;
        loadCurrentEntryIds: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          Array<string>,
          Name
        >;
        loadEmbeddingPage: FunctionReference<
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
              embedding: Array<number>;
              entryId: string;
              namespace: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        loadEntryPage: FunctionReference<
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
              entryId: string;
              key: string;
              legacyEntryId?: string;
              namespace: string;
              observationTime?: number;
              source:
                | {
                    document: string;
                    documentId: string;
                    entryId: string;
                    key: string;
                    kind: "document";
                    sourceType: "text" | "binary";
                  }
                | {
                    contentId: string;
                    kind: "content";
                    sourceType: "text" | "binary";
                  };
              textPreview: string;
              title?: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        markCompleted: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; pointCount: number },
          null,
          Name
        >;
        markFailed: FunctionReference<
          "mutation",
          "internal",
          { error: string; jobId: string },
          null,
          Name
        >;
        markRunning: FunctionReference<
          "mutation",
          "internal",
          { jobId: string; workflowId: string },
          null,
          Name
        >;
        updatePhase: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            loadedCount?: number;
            phase: "loading" | "projecting";
          },
          null,
          Name
        >;
        writePointsBatch: FunctionReference<
          "mutation",
          "internal",
          {
            jobId: string;
            points: Array<{
              decayedScore?: number;
              entryId: string;
              key: string;
              lastAccessTime?: number;
              mimeType?: string;
              textPreview: string;
              title?: string;
              totalAccesses?: number;
              x: number;
              y: number;
              z: number;
            }>;
          },
          null,
          Name
        >;
      };
      retrieval: {
        search: FunctionReference<
          "action",
          "internal",
          {
            accessWeight?: number;
            actor?: { byId: string; byType: string };
            apiKey?: string;
            fileEmbedding?: Array<number>;
            graphWeight?: number;
            includeHistorical?: boolean;
            lexicalWeight?: number;
            limit?: number;
            namespace: string;
            query: string | Array<number>;
            retrievalMode?: "vector" | "lexical" | "hybrid";
            rrfK?: number;
            session?: string;
            vectorWeight?: number;
          },
          Array<{
            entryId: string;
            importance: number;
            key: string;
            metadata?: any;
            observationTime?: number;
            score: number;
            text: string;
            title?: string;
          }>,
          Name
        >;
      };
    };
  };
