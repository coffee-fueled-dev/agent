/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib from "../_lib.js";
import type * as client_events from "../client/events.js";
import type * as client_index from "../client/index.js";
import type * as graph from "../graph.js";
import type * as history from "../history.js";
import type * as internal_canonicalText from "../internal/canonicalText.js";
import type * as internal_embedText from "../internal/embedText.js";
import type * as internal_mergeBatch from "../internal/mergeBatch.js";
import type * as internal_mergeWorkpool from "../internal/mergeWorkpool.js";
import type * as internal_store from "../internal/store.js";
import type * as public_records from "../public/records.js";
import type * as public_search from "../public/search.js";
import type * as public_sourceMaps from "../public/sourceMaps.js";
import type * as public_store from "../public/store.js";
import type * as search from "../search.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  _lib: typeof _lib;
  "client/events": typeof client_events;
  "client/index": typeof client_index;
  graph: typeof graph;
  history: typeof history;
  "internal/canonicalText": typeof internal_canonicalText;
  "internal/embedText": typeof internal_embedText;
  "internal/mergeBatch": typeof internal_mergeBatch;
  "internal/mergeWorkpool": typeof internal_mergeWorkpool;
  "internal/store": typeof internal_store;
  "public/records": typeof public_records;
  "public/search": typeof public_search;
  "public/sourceMaps": typeof public_sourceMaps;
  "public/store": typeof public_store;
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
  history: {
    public: {
      append: {
        append: FunctionReference<
          "mutation",
          "internal",
          {
            attrs?: Record<string, string | number | boolean | null>;
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
  lexicalSearch: {
    public: {
      add: {
        appendTextSlice: FunctionReference<
          "mutation",
          "internal",
          {
            namespace: string;
            propKey: string;
            sourceRef: string;
            sourceSystem: string;
            text: string;
            updatedAt?: number;
          },
          string
        >;
        deleteItem: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; sourceRef: string; sourceSystem: string },
          null
        >;
        upsertItem: FunctionReference<
          "mutation",
          "internal",
          {
            bucketId?: string;
            bucketType?: string;
            namespace: string;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            text?: string;
            textSlices?: Array<{ propKey: string; text: string }>;
            updatedAt?: number;
          },
          string
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
            namespace: string;
            propertyHits: Array<{ propKey: string; text: string }>;
            sourceRef: string;
            sourceSystem: string;
            sourceVersion?: number;
            supersededAt?: number;
            updatedAt: number;
          }>
        >;
      };
    };
  };
  vectorSearch: {
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
          string
        >;
        deleteItem: FunctionReference<
          "mutation",
          "internal",
          { namespace: string; sourceRef: string; sourceSystem: string },
          null
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
          string
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
          { type: "node" | "edge"; value: string },
          null | {
            _creationTime: number;
            _id: string;
            displayValue: string;
            type: "node" | "edge";
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
              type: "node" | "edge";
              value: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          }
        >;
        upsertLabel: FunctionReference<
          "mutation",
          "internal",
          { type: "node" | "edge"; value: string },
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
  mergeMemoryWorkpool: {
    config: {
      update: FunctionReference<
        "mutation",
        "internal",
        {
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          maxParallelism?: number;
        },
        any
      >;
    };
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          limit?: number;
          logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
        },
        any
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          fnArgs: any;
          fnHandle: string;
          fnName: string;
          fnType: "action" | "mutation" | "query";
          onComplete?: { context?: any; fnHandle: string };
          retryBehavior?: {
            base: number;
            initialBackoffMs: number;
            maxAttempts: number;
          };
          runAt: number;
        },
        string
      >;
      enqueueBatch: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
          };
          items: Array<{
            fnArgs: any;
            fnHandle: string;
            fnName: string;
            fnType: "action" | "mutation" | "query";
            onComplete?: { context?: any; fnHandle: string };
            retryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            runAt: number;
          }>;
        },
        Array<string>
      >;
      status: FunctionReference<
        "query",
        "internal",
        { id: string },
        | { previousAttempts: number; state: "pending" }
        | { previousAttempts: number; state: "running" }
        | { state: "finished" }
      >;
      statusBatch: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<
          | { previousAttempts: number; state: "pending" }
          | { previousAttempts: number; state: "running" }
          | { state: "finished" }
        >
      >;
    };
  };
};
