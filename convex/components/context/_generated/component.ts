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
        deleteEntry: FunctionReference<
          "mutation",
          "internal",
          { entryId: string; namespace: string },
          null,
          Name
        >;
        insertEntry: FunctionReference<
          "mutation",
          "internal",
          {
            entryId: string;
            key: string;
            legacyEntryId?: string;
            namespace: string;
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
          },
          null,
          Name
        >;
      };
      context: {
        add: FunctionReference<
          "action",
          "internal",
          {
            apiKey?: string;
            chunks?: Array<{ embedding: Array<number>; text: string }>;
            key: string;
            namespace: string;
            searchText?: string;
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
        remove: FunctionReference<
          "action",
          "internal",
          { apiKey?: string; entryId: string; namespace: string },
          null,
          Name
        >;
        search: FunctionReference<
          "action",
          "internal",
          {
            apiKey?: string;
            fileEmbedding?: Array<number>;
            includeHistorical?: boolean;
            lexicalWeight?: number;
            limit?: number;
            namespace: string;
            query: string | Array<number>;
            retrievalMode?: "vector" | "lexical" | "hybrid";
            rrfK?: number;
            searchType?: "vector" | "text" | "hybrid";
            vectorScoreThreshold?: number;
            vectorWeight?: number;
          },
          Array<{
            entryId: string;
            importance: number;
            key: string;
            metadata?: any;
            score: number;
            text: string;
            title?: string;
          }>,
          Name
        >;
      };
      history: {
        appendHistoryEntry: FunctionReference<
          "mutation",
          "internal",
          {
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
          },
          Name
        >;
        getVersionChain: FunctionReference<
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
          }>,
          Name
        >;
        listHistoryHeads: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          Array<{
            entryId: string;
            headKind?: string;
            streamId: string;
            streamType: string;
          }>,
          Name
        >;
      };
      list: {
        getEntryByLegacyId: FunctionReference<
          "query",
          "internal",
          { legacyEntryId: string; namespace: string },
          null | {
            _creationTime: number;
            _id: string;
            entryId: string;
            key: string;
            legacyEntryId?: string;
            namespace: string;
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
          },
          Name
        >;
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
          null | {
            _creationTime: number;
            _id: string;
            data:
              | { status: "pending" }
              | {
                  loadedCount: number;
                  phase: "loading" | "projecting";
                  status: "running";
                  workflowId: string;
                }
              | {
                  completionTime: number;
                  points: Array<{
                    entryId: string;
                    key: string;
                    mimeType?: string;
                    textPreview: string;
                    title?: string;
                    x: number;
                    y: number;
                    z: number;
                  }>;
                  status: "completed";
                }
              | { error: string; failureTime: number; status: "failed" };
            limit: number;
            namespace: string;
            stale: boolean;
            updateTime: number;
          },
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
                entryId: string;
                key: string;
                mimeType?: string;
                textPreview: string;
                title?: string;
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
                entryId: string;
                key: string;
                mimeType?: string;
                textPreview: string;
                title?: string;
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
          {
            jobId: string;
            points: Array<{
              entryId: string;
              key: string;
              mimeType?: string;
              textPreview: string;
              title?: string;
              x: number;
              y: number;
              z: number;
            }>;
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
        markProjectionsStale: FunctionReference<
          "mutation",
          "internal",
          { namespace: string },
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
      };
      search: {
        deleteSearchFeature: FunctionReference<
          "mutation",
          "internal",
          { featureId: string; namespace: string },
          any,
          Name
        >;
        searchFeatures: FunctionReference<
          "query",
          "internal",
          {
            includeHistorical?: boolean;
            limit?: number;
            namespace: string;
            query: string;
            sourceSystem?: string;
          },
          any,
          Name
        >;
        upsertSearchFeature: FunctionReference<
          "mutation",
          "internal",
          {
            featureId: string;
            namespace: string;
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
            sourceSystem: string;
            status: "current" | "historical";
            text: string;
            title?: string;
            updatedAt?: number;
          },
          any,
          Name
        >;
      };
    };
  };
