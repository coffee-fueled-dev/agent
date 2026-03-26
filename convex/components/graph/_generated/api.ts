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
import type * as internal_normalize from "../internal/normalize.js";
import type * as public_edges from "../public/edges.js";
import type * as public_labels from "../public/labels.js";
import type * as public_nodes from "../public/nodes.js";

const fullApi: ApiFromModules<{
  "client/index": typeof client_index;
  "internal/normalize": typeof internal_normalize;
  "public/edges": typeof public_edges;
  "public/labels": typeof public_labels;
  "public/nodes": typeof public_nodes;
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

export const components = componentsGeneric() as unknown as {};
