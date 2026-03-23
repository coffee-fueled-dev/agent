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
      runtime: {
        agentRuntime: {
          finalizeRuntimeCommit: FunctionReference<
            "mutation",
            "internal",
            { error?: string; state: "failed" | "canceled"; workId: string },
            any,
            Name
          >;
          getRuntimeCurrent: FunctionReference<
            "query",
            "internal",
            { runtime: string; streamId: string },
            any,
            Name
          >;
          getRuntimeStreamState: FunctionReference<
            "query",
            "internal",
            { runtime: string; streamId: string },
            any,
            Name
          >;
          listRuntimeEvolution: FunctionReference<
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
              runtime: string;
              streamId: string;
            },
            any,
            Name
          >;
          markRuntimeCommitQueued: FunctionReference<
            "mutation",
            "internal",
            {
              commitKey: string;
              runtime: string;
              streamId: string;
              workId: string;
            },
            any,
            Name
          >;
          registerRuntime: FunctionReference<
            "mutation",
            "internal",
            {
              description?: string;
              facts: {
                edgeKinds: Array<string>;
                entities: Array<{
                  attrs: Record<string, "string" | "number" | "boolean">;
                  entityType: string;
                  states: Array<string>;
                }>;
                partitions: Array<string>;
              };
              historyStreamType: string;
              namespaces?: {
                current?: string;
                facts?: string;
                historical?: string;
              };
              runtime: string;
              searchProfiles?: {
                current?: { sourceKinds?: Array<string> };
                historical?: { sourceKinds?: Array<string> };
              };
            },
            any,
            Name
          >;
        };
        index: {
          finalizeRuntimeCommit: FunctionReference<
            "mutation",
            "internal",
            { error?: string; state: "failed" | "canceled"; workId: string },
            any,
            Name
          >;
          getRuntimeCurrent: FunctionReference<
            "query",
            "internal",
            { runtime: string; streamId: string },
            any,
            Name
          >;
          getRuntimeStreamState: FunctionReference<
            "query",
            "internal",
            { runtime: string; streamId: string },
            any,
            Name
          >;
          listRuntimeEvolution: FunctionReference<
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
              runtime: string;
              streamId: string;
            },
            any,
            Name
          >;
          markRuntimeCommitQueued: FunctionReference<
            "mutation",
            "internal",
            {
              commitKey: string;
              runtime: string;
              streamId: string;
              workId: string;
            },
            any,
            Name
          >;
          registerRuntime: FunctionReference<
            "mutation",
            "internal",
            {
              description?: string;
              facts: {
                edgeKinds: Array<string>;
                entities: Array<{
                  attrs: Record<string, "string" | "number" | "boolean">;
                  entityType: string;
                  states: Array<string>;
                }>;
                partitions: Array<string>;
              };
              historyStreamType: string;
              namespaces?: {
                current?: string;
                facts?: string;
                historical?: string;
              };
              runtime: string;
              searchProfiles?: {
                current?: { sourceKinds?: Array<string> };
                historical?: { sourceKinds?: Array<string> };
              };
            },
            any,
            Name
          >;
        };
      };
      runtimeApi: {
        appendRuntimeHistory: FunctionReference<
          "mutation",
          "internal",
          {
            entryId: string;
            entryTime: number;
            kind: string;
            parentEntryIds?: Array<string>;
            payload?: any;
            runtime: string;
            streamId: string;
          },
          any,
          Name
        >;
        applyRuntimeFacts: FunctionReference<
          "mutation",
          "internal",
          {
            facts: {
              edges?: Array<{
                from: string;
                kind: string;
                scope?: string;
                to: string;
              }>;
              items: Array<{
                attrs?: Record<string, string | number | boolean>;
                entity: string;
                entityType: string;
                labels?: Array<string>;
                order: Array<number>;
                scope?: string;
                state?: string;
              }>;
              mode?: "direct" | "event";
              partitions?: Array<{
                count: number;
                head?: string;
                membersVersion?: number;
                partition: string;
                scope?: string;
                tail?: string;
              }>;
              projector?: string;
            };
            runtime: string;
            sourceVersion: number;
            streamId: string;
          },
          any,
          Name
        >;
        completeMemoryChartMaintenance: FunctionReference<
          "mutation",
          "internal",
          { entryTime: number; namespace: string },
          any,
          Name
        >;
        completeRuntimeCommit: FunctionReference<
          "mutation",
          "internal",
          {
            commitKey: string;
            currentKey?: string;
            entryId: string;
            entryTime: number;
            historicalKey?: string;
            latestEntity?: string;
            runtime: string;
            sourceVersion: number;
            streamId: string;
            workId?: string;
          },
          any,
          Name
        >;
        getMemoryChart: FunctionReference<
          "query",
          "internal",
          { chartId: string },
          any,
          Name
        >;
        getMemoryChartMemberByEntryId: FunctionReference<
          "query",
          "internal",
          { entryId: string; namespace: string },
          any,
          Name
        >;
        getMemoryChartNamespaceMetrics: FunctionReference<
          "query",
          "internal",
          { namespace: string },
          any,
          Name
        >;
        getMemoryEntryIdsForCharts: FunctionReference<
          "query",
          "internal",
          { chartIds: Array<string>; namespace: string },
          any,
          Name
        >;
        getRuntimeRegistration: FunctionReference<
          "query",
          "internal",
          { runtime: string },
          any,
          Name
        >;
        getStorageUrl: FunctionReference<
          "query",
          "internal",
          { storageId: string },
          any,
          Name
        >;
        listMemoryChartMembers: FunctionReference<
          "query",
          "internal",
          {
            chartId: string;
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
        listMemoryChartRepartitionEvents: FunctionReference<
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
        listMemoryCharts: FunctionReference<
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
        listMemoryChartSupportEdges: FunctionReference<
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
        maintainMemoryChartNamespace: FunctionReference<
          "mutation",
          "internal",
          { entryTime: number; namespace: string },
          any,
          Name
        >;
        markMemoryChartMaintenanceQueued: FunctionReference<
          "mutation",
          "internal",
          { entryTime: number; namespace: string },
          any,
          Name
        >;
        startRuntimeCommit: FunctionReference<
          "mutation",
          "internal",
          {
            commitKey: string;
            currentKey?: string;
            entryTime?: number;
            historicalKey?: string;
            runtime: string;
            streamId: string;
            workId?: string;
          },
          any,
          Name
        >;
        upsertMemoryChartAssignment: FunctionReference<
          "mutation",
          "internal",
          {
            embedding: Array<number>;
            entryId: string;
            entryTime: number;
            fileName?: string | null;
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            mimeType?: string;
            namespace: string;
            sourceKind?: string;
            sourceType: "text" | "textFile" | "binaryFile";
            storageId?: string;
            summary: string;
            title?: string;
          },
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
    };
  };
