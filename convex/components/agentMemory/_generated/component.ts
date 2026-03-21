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
        addStoredBinaryFile: FunctionReference<
          "action",
          "internal",
          {
            entity?: string;
            entityType?: string;
            entryTime?: number;
            fileName?: string;
            googleApiKey?: string;
            indexKind?: "current" | "historical";
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            mimeType: string;
            namespace: string;
            scope?: string;
            sourceEntryId?: string;
            sourceKind?: string;
            sourceVersion?: number;
            storageId: string;
            streamId?: string;
            streamType?: string;
            text?: string;
            title?: string;
            validFrom?: number;
            validTo?: number | null;
          },
          any,
          Name
        >;
        addStoredTextFile: FunctionReference<
          "action",
          "internal",
          {
            entity?: string;
            entityType?: string;
            entryTime?: number;
            fileName?: string;
            googleApiKey?: string;
            indexKind?: "current" | "historical";
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            mimeType: string;
            namespace: string;
            scope?: string;
            sourceEntryId?: string;
            sourceKind?: string;
            sourceVersion?: number;
            storageId: string;
            streamId?: string;
            streamType?: string;
            title?: string;
            validFrom?: number;
            validTo?: number | null;
          },
          any,
          Name
        >;
        addText: FunctionReference<
          "action",
          "internal",
          {
            entity?: string;
            entityType?: string;
            entryTime?: number;
            googleApiKey?: string;
            indexKind?: "current" | "historical";
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            scope?: string;
            sourceEntryId?: string;
            sourceKind?: string;
            sourceVersion?: number;
            streamId?: string;
            streamType?: string;
            text: string;
            title?: string;
            validFrom?: number;
            validTo?: number | null;
          },
          any,
          Name
        >;
        generateUploadUrl: FunctionReference<
          "mutation",
          "internal",
          {},
          any,
          Name
        >;
      };
      search: {
        search: FunctionReference<
          "action",
          "internal",
          {
            asOfTime?: number;
            chunkContext?: { after: number; before: number };
            entity?: string;
            entityType?: string;
            filters?: Array<any>;
            googleApiKey?: string;
            includeHistorical?: boolean;
            limit?: number;
            namespace: string;
            query: string | Array<number>;
            searchType?: "vector" | "text" | "hybrid";
            sourceKinds?: Array<string>;
            streamId?: string;
            streamType?: string;
            textWeight?: number;
            vectorScoreThreshold?: number;
            vectorWeight?: number;
          },
          any,
          Name
        >;
      };
      temporal: {
        getThreadIdentityCurrent: FunctionReference<
          "query",
          "internal",
          { threadId: string },
          any,
          Name
        >;
        listThreadIdentityEvolution: FunctionReference<
          "query",
          "internal",
          { limit?: number; threadId: string },
          any,
          Name
        >;
        recordThreadIdentityEpisode: FunctionReference<
          "action",
          "internal",
          {
            codeId: string;
            entryTime?: number;
            googleApiKey?: string;
            messageId: string;
            previousCodeId?: string;
            previousRuntimeHash?: string;
            previousStaticHash?: string;
            runtimeHash: string;
            staticHash: string;
            threadId: string;
          },
          any,
          Name
        >;
        searchThreadIdentityAsOf: FunctionReference<
          "action",
          "internal",
          {
            asOfTime: number;
            chunkContext?: { after: number; before: number };
            entity?: string;
            entityType?: string;
            filters?: Array<any>;
            googleApiKey?: string;
            includeHistorical?: boolean;
            limit?: number;
            query: string | Array<number>;
            searchType?: "vector" | "text" | "hybrid";
            sourceKinds?: Array<string>;
            streamId?: string;
            streamType?: string;
            textWeight?: number;
            threadId: string;
            vectorScoreThreshold?: number;
            vectorWeight?: number;
          },
          any,
          Name
        >;
        searchThreadIdentityCurrent: FunctionReference<
          "action",
          "internal",
          {
            asOfTime?: number;
            chunkContext?: { after: number; before: number };
            entity?: string;
            entityType?: string;
            filters?: Array<any>;
            googleApiKey?: string;
            includeHistorical?: boolean;
            limit?: number;
            query: string | Array<number>;
            searchType?: "vector" | "text" | "hybrid";
            sourceKinds?: Array<string>;
            streamId?: string;
            streamType?: string;
            textWeight?: number;
            threadId: string;
            vectorScoreThreshold?: number;
            vectorWeight?: number;
          },
          any,
          Name
        >;
      };
    };
  };
