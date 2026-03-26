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
          null,
          Name
        >;
        deleteEdge: FunctionReference<
          "mutation",
          "internal",
          { directed?: boolean; from: string; label: string; to: string },
          null,
          Name
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
          },
          Name
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
          null,
          Name
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
          },
          Name
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
          },
          Name
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
          },
          Name
        >;
        upsertLabel: FunctionReference<
          "mutation",
          "internal",
          { value: string },
          null,
          Name
        >;
      };
      nodes: {
        createNode: FunctionReference<
          "mutation",
          "internal",
          { key: string; label: string },
          null,
          Name
        >;
        deleteNode: FunctionReference<
          "mutation",
          "internal",
          { key: string; label: string },
          null,
          Name
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
          },
          Name
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
          },
          Name
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
          },
          Name
        >;
        getEdgeCount: FunctionReference<
          "query",
          "internal",
          { label?: string },
          number,
          Name
        >;
        getNodeCount: FunctionReference<
          "query",
          "internal",
          { label?: string },
          number,
          Name
        >;
        getNodeStats: FunctionReference<
          "query",
          "internal",
          { key: string },
          null | { inDegree: number; outDegree: number; totalDegree: number },
          Name
        >;
      };
    };
  };
