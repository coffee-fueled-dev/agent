/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";
import type * as client_index from "../client/index.js";
import type * as graph from "../graph.js";
import type * as history from "../history.js";
import type * as internal_accessStats from "../internal/accessStats.js";
import type * as internal_embedding from "../internal/embedding.js";
import type * as internal_embeddingStore from "../internal/embeddingStore.js";
import type * as internal_entryStore from "../internal/entryStore.js";
import type * as internal_events from "../internal/events.js";
import type * as internal_historyOps from "../internal/historyOps.js";
import type * as internal_rag from "../internal/rag.js";
import type * as internal_searchFeatures from "../internal/searchFeatures.js";
import type * as internal_similarity from "../internal/similarity.js";
import type * as internal_status from "../internal/status.js";
import type * as internal_versionStore from "../internal/versionStore.js";
import type * as public_community from "../public/community.js";
import type * as public_entries from "../public/entries.js";
import type * as public_list from "../public/list.js";
import type * as public_projection from "../public/projection.js";
import type * as public_retrieval from "../public/retrieval.js";
import type * as search from "../search.js";

const fullApi: ApiFromModules<{
  "client/index": typeof client_index;
  graph: typeof graph;
  history: typeof history;
  "internal/accessStats": typeof internal_accessStats;
  "internal/embedding": typeof internal_embedding;
  "internal/embeddingStore": typeof internal_embeddingStore;
  "internal/entryStore": typeof internal_entryStore;
  "internal/events": typeof internal_events;
  "internal/historyOps": typeof internal_historyOps;
  "internal/rag": typeof internal_rag;
  "internal/searchFeatures": typeof internal_searchFeatures;
  "internal/similarity": typeof internal_similarity;
  "internal/status": typeof internal_status;
  "internal/versionStore": typeof internal_versionStore;
  "public/community": typeof public_community;
  "public/entries": typeof public_entries;
  "public/list": typeof public_list;
  "public/projection": typeof public_projection;
  "public/retrieval": typeof public_retrieval;
  search: typeof search;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {
  rag: {
    chunks: {
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          chunks: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entryId: string;
          startOrder: number;
        },
        { status: "pending" | "ready" | "replaced" }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          entryId: string;
          order: "desc" | "asc";
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
            metadata?: Record<string, any>;
            order: number;
            state: "pending" | "ready" | "replaced";
            text: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      replaceChunksPage: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        { nextStartOrder: number; status: "pending" | "ready" | "replaced" }
      >;
    };
    entries: {
      add: FunctionReference<
        "mutation",
        "internal",
        {
          allChunks?: Array<{
            content: { metadata?: Record<string, any>; text: string };
            embedding: Array<number>;
            searchableText?: string;
          }>;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        {
          created: boolean;
          entryId: string;
          status: "pending" | "ready" | "replaced";
        }
      >;
      addAsync: FunctionReference<
        "mutation",
        "internal",
        {
          chunker: string;
          entry: {
            contentHash?: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            namespaceId: string;
            title?: string;
          };
          onComplete?: string;
        },
        { created: boolean; entryId: string; status: "pending" | "ready" }
      >;
      deleteAsync: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; startOrder: number },
        null
      >;
      deleteByKeyAsync: FunctionReference<
        "mutation",
        "internal",
        { beforeVersion?: number; key: string; namespaceId: string },
        null
      >;
      deleteByKeySync: FunctionReference<
        "action",
        "internal",
        { key: string; namespaceId: string },
        null
      >;
      deleteSync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null
      >;
      findByContentHash: FunctionReference<
        "query",
        "internal",
        {
          contentHash: string;
          dimension: number;
          filterNames: Array<string>;
          key: string;
          modelId: string;
          namespace: string;
        },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        {
          contentHash?: string;
          entryId: string;
          filterValues: Array<{ name: string; value: any }>;
          importance: number;
          key?: string;
          metadata?: Record<string, any>;
          replacedAt?: number;
          status: "pending" | "ready" | "replaced";
          title?: string;
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          namespaceId?: string;
          order?: "desc" | "asc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        {
          replacedEntry: {
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          } | null;
        }
      >;
    };
    namespaces: {
      deleteNamespace: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          deletedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
      deleteNamespaceSync: FunctionReference<
        "action",
        "internal",
        { namespaceId: string },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | {
          createdAt: number;
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          namespaceId: string;
          status: "pending" | "ready" | "replaced";
          version: number;
        }
      >;
      getOrCreate: FunctionReference<
        "mutation",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
          onComplete?: string;
          status: "pending" | "ready";
        },
        { namespaceId: string; status: "pending" | "ready" }
      >;
      list: FunctionReference<
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
          status: "pending" | "ready" | "replaced";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listNamespaceVersions: FunctionReference<
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
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      lookup: FunctionReference<
        "query",
        "internal",
        {
          dimension: number;
          filterNames: Array<string>;
          modelId: string;
          namespace: string;
        },
        null | string
      >;
      promoteToReady: FunctionReference<
        "mutation",
        "internal",
        { namespaceId: string },
        {
          replacedNamespace: null | {
            createdAt: number;
            dimension: number;
            filterNames: Array<string>;
            modelId: string;
            namespace: string;
            namespaceId: string;
            status: "pending" | "ready" | "replaced";
            version: number;
          };
        }
      >;
    };
    search: {
      search: FunctionReference<
        "action",
        "internal",
        {
          chunkContext?: { after: number; before: number };
          dimension?: number;
          embedding?: Array<number>;
          filters: Array<{ name: string; value: any }>;
          limit: number;
          modelId: string;
          namespace: string;
          searchType?: "vector" | "text" | "hybrid";
          textQuery?: string;
          textWeight?: number;
          vectorScoreThreshold?: number;
          vectorWeight?: number;
        },
        {
          entries: Array<{
            contentHash?: string;
            entryId: string;
            filterValues: Array<{ name: string; value: any }>;
            importance: number;
            key?: string;
            metadata?: Record<string, any>;
            replacedAt?: number;
            status: "pending" | "ready" | "replaced";
            title?: string;
          }>;
          results: Array<{
            content: Array<{ metadata?: Record<string, any>; text: string }>;
            entryId: string;
            order: number;
            score: number;
            startOrder: number;
          }>;
        }
      >;
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
  search: {
    public: {
      add: {
        deleteFeature: FunctionReference<
          "mutation",
          "internal",
          { featureId: string; namespace: string },
          null
        >;
        upsertFeature: FunctionReference<
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
          string
        >;
      };
      search: {
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
          Array<{
            _creationTime: number;
            _id: string;
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
            updatedAt: number;
          }>
        >;
      };
    };
  };
  graph: {
    public: {
      edges: {
        createEdge: FunctionReference<
          "mutation",
          "internal",
          {
            directed?: boolean;
            from: string;
            label: string;
            properties?: any;
            to: string;
          },
          null
        >;
        createEdgesBatch: FunctionReference<
          "mutation",
          "internal",
          {
            directed?: boolean;
            edges: Array<{ from: string; properties?: any; to: string }>;
            label: string;
          },
          number
        >;
        deleteEdge: FunctionReference<
          "mutation",
          "internal",
          { directed?: boolean; from: string; label: string; to: string },
          null
        >;
        deleteEdgesForNode: FunctionReference<
          "mutation",
          "internal",
          { label: string; limit?: number; nodeKey: string },
          { deleted: number; hasMore: boolean }
        >;
        queryEdges: FunctionReference<
          "query",
          "internal",
          {
            from?: string;
            label: string;
            node?: string;
            paginationOpts: {
              cursor: string | null;
              endCursor?: string | null;
              id?: number;
              maximumBytesRead?: number;
              maximumRowsRead?: number;
              numItems: number;
            };
            to?: string;
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              directed: boolean;
              from: string;
              label: string;
              properties?: any;
              to: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        updateEdge: FunctionReference<
          "mutation",
          "internal",
          {
            directed?: boolean;
            from: string;
            label: string;
            properties: any;
            to: string;
          },
          null
        >;
      };
      labels: {
        getLabel: FunctionReference<
          "query",
          "internal",
          { value: string },
          null | {
            _creationTime: number;
            _id: string;
            displayValue: string;
            value: string;
          }
        >;
        listLabels: FunctionReference<
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
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              displayValue: string;
              value: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        searchLabels: FunctionReference<
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
            query: string;
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              _creationTime: number;
              _id: string;
              displayValue: string;
              value: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        upsertLabel: FunctionReference<
          "mutation",
          "internal",
          { value: string },
          null
        >;
      };
      nodes: {
        createNode: FunctionReference<
          "mutation",
          "internal",
          { key: string; label: string },
          null
        >;
        deleteNode: FunctionReference<
          "mutation",
          "internal",
          { key: string; label: string },
          null
        >;
        getNode: FunctionReference<
          "query",
          "internal",
          { key: string; label?: string },
          null | {
            _creationTime: number;
            _id: string;
            key: string;
            label: string;
          }
        >;
        listNodes: FunctionReference<
          "query",
          "internal",
          {
            label: string;
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
              label: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
      };
      stats: {
        getDegreeStats: FunctionReference<
          "query",
          "internal",
          { label?: string },
          {
            count: number;
            max: null | number;
            mean: number;
            median: null | number;
            min: null | number;
            sum: number;
          }
        >;
        getEdgeCount: FunctionReference<
          "query",
          "internal",
          { label?: string },
          number
        >;
        getNodeCount: FunctionReference<
          "query",
          "internal",
          { label?: string },
          number
        >;
        getNodeStats: FunctionReference<
          "query",
          "internal",
          { key: string },
          null | { inDegree: number; outDegree: number; totalDegree: number }
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
            session?: string;
            streamId: string;
            streamType: string;
          },
          {
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            session?: string;
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
            _creationTime: number;
            _id: string;
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
              _creationTime: number;
              _id: string;
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
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            session?: string;
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
            _creationTime: number;
            _id: string;
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
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            session?: string;
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
            eventTypes?: Array<string>;
            order?: "asc" | "desc";
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
        listStreamEventsSince: FunctionReference<
          "query",
          "internal",
          {
            eventTypes?: Array<string>;
            minEventTime: number;
            streamId: string;
            streamType: string;
          },
          Array<{
            _creationTime: number;
            _id: string;
            actor?: { byId: string; byType: string };
            causationId?: string;
            correlationId?: string;
            eventId: string;
            eventTime: number;
            eventType: string;
            globalSequence: number;
            metadata?: Record<string, string | number | boolean | null>;
            payload?: any;
            session?: string;
            streamId: string;
            streamType: string;
            streamVersion: number;
          }>
        >;
      };
      streams: {
        getStream: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          {
            _creationTime: number;
            _id: string;
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
};
