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
        createFileProcess: FunctionReference<
          "mutation",
          "internal",
          {
            contentHash?: string;
            fileName?: string;
            key: string;
            mimeType: string;
            namespace: string;
            storageId: string;
            title?: string;
          },
          string,
          Name
        >;
        deleteFileEmbeddingChunkBatchesForProcess: FunctionReference<
          "mutation",
          "internal",
          { processId: string },
          null,
          Name
        >;
        getCachedFileResult: FunctionReference<
          "query",
          "internal",
          { contentHash: string },
          null | {
            chunks: Array<{ embedding: Array<number>; text?: string }>;
            contentHash: string;
            lexicalText?: string;
            mimeType: string;
            retrievalText: string;
            updatedAt: number;
          },
          Name
        >;
        getFileProcess: FunctionReference<
          "query",
          "internal",
          { processId: string },
          null | {
            _id: string;
            contentHash?: string;
            error?: string;
            fileName?: string;
            key: string;
            memoryId?: string;
            mimeType: string;
            namespace: string;
            status: "pending" | "dispatched" | "completed" | "failed";
            storageId: string;
            title?: string;
            updatedAt: number;
          },
          Name
        >;
        getLatestFileForMemory: FunctionReference<
          "query",
          "internal",
          { memoryId: string; namespace: string },
          null | {
            _id: string;
            contentHash?: string;
            error?: string;
            fileName?: string;
            key: string;
            memoryId?: string;
            mimeType: string;
            namespace: string;
            status: "pending" | "dispatched" | "completed" | "failed";
            storageId: string;
            title?: string;
            updatedAt: number;
          },
          Name
        >;
        insertFileEmbeddingChunkBatch: FunctionReference<
          "mutation",
          "internal",
          {
            batchIndex: number;
            chunks: Array<{ embedding: Array<number>; text?: string }>;
            processId: string;
          },
          null,
          Name
        >;
        listFileEmbeddingChunkBatchesForProcess: FunctionReference<
          "query",
          "internal",
          { processId: string },
          Array<{
            batchIndex: number;
            chunks: Array<{ embedding: Array<number>; text?: string }>;
          }>,
          Name
        >;
        listFileProcessesPage: FunctionReference<
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
              error?: string;
              fileName?: string;
              key: string;
              memoryId?: string;
              mimeType: string;
              processId: string;
              status: "pending" | "dispatched" | "completed" | "failed";
              title?: string;
              updatedAt: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        markFileProcessCompleted: FunctionReference<
          "mutation",
          "internal",
          { memoryId: string; processId: string },
          null,
          Name
        >;
        markFileProcessDispatched: FunctionReference<
          "mutation",
          "internal",
          { processId: string },
          null,
          Name
        >;
        markFileProcessFailed: FunctionReference<
          "mutation",
          "internal",
          { error: string; processId: string },
          null,
          Name
        >;
        upsertCachedFileResult: FunctionReference<
          "mutation",
          "internal",
          {
            chunks: Array<{ embedding: Array<number>; text?: string }>;
            contentHash: string;
            lexicalText?: string;
            mimeType: string;
            retrievalText: string;
          },
          null,
          Name
        >;
      };
    };
  };
