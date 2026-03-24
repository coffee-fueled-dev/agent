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
          any,
          Name
        >;
        insertEntry: FunctionReference<
          "mutation",
          "internal",
          {
            createdAt: number;
            entryId: string;
            key: string;
            legacyEntryId?: string;
            namespace: string;
            textPreview: string;
            title?: string;
          },
          any,
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
          any,
          Name
        >;
        getVersionChain: FunctionReference<
          "query",
          "internal",
          { entryId: string; streamId: string; streamType: string },
          any,
          Name
        >;
        listHistoryHeads: FunctionReference<
          "query",
          "internal",
          { streamId: string; streamType: string },
          any,
          Name
        >;
      };
      list: {
        getEntryByLegacyId: FunctionReference<
          "query",
          "internal",
          { legacyEntryId: string; namespace: string },
          any,
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
          any,
          Name
        >;
      };
    };
  };
