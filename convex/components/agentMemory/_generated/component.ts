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
            fileName?: string;
            googleApiKey?: string;
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            mimeType: string;
            namespace: string;
            storageId: string;
            text?: string;
            title?: string;
          },
          any,
          Name
        >;
        addStoredTextFile: FunctionReference<
          "action",
          "internal",
          {
            fileName?: string;
            googleApiKey?: string;
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            mimeType: string;
            namespace: string;
            storageId: string;
            title?: string;
          },
          any,
          Name
        >;
        addText: FunctionReference<
          "action",
          "internal",
          {
            googleApiKey?: string;
            key: string;
            metadata?: Record<string, string | number | boolean | null>;
            namespace: string;
            text: string;
            title?: string;
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
            chunkContext?: { after: number; before: number };
            filters?: Array<any>;
            googleApiKey?: string;
            limit?: number;
            namespace: string;
            query: string | Array<number>;
            searchType?: "vector" | "text" | "hybrid";
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
