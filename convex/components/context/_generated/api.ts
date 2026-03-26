/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as client_index from "../client/index.js";
import type * as history from "../history.js";
import type * as internal_embedding from "../internal/embedding.js";
import type * as internal_embeddingStore from "../internal/embeddingStore.js";
import type * as internal_rag from "../internal/rag.js";
import type * as internal_status from "../internal/status.js";
import type * as internal_versionStore from "../internal/versionStore.js";
import type * as public_add from "../public/add.js";
import type * as public_context from "../public/context.js";
import type * as public_history from "../public/history.js";
import type * as public_list from "../public/list.js";
import type * as public_projection from "../public/projection.js";
import type * as public_search from "../public/search.js";
import type * as search from "../search.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "client/index": typeof client_index;
  history: typeof history;
  "internal/embedding": typeof internal_embedding;
  "internal/embeddingStore": typeof internal_embeddingStore;
  "internal/rag": typeof internal_rag;
  "internal/status": typeof internal_status;
  "internal/versionStore": typeof internal_versionStore;
  "public/add": typeof public_add;
  "public/context": typeof public_context;
  "public/history": typeof public_history;
  "public/list": typeof public_list;
  "public/projection": typeof public_projection;
  "public/search": typeof public_search;
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
};
