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
import type * as internal_shared from "../internal/shared.js";
import type * as internal_store from "../internal/store.js";
import type * as public_append from "../public/append.js";
import type * as public_metrics from "../public/metrics.js";
import type * as public_projectors from "../public/projectors.js";
import type * as public_read from "../public/read.js";
import type * as public_streams from "../public/streams.js";

const fullApi: ApiFromModules<{
  "internal/shared": typeof internal_shared;
  "internal/store": typeof internal_store;
  "public/append": typeof public_append;
  "public/metrics": typeof public_metrics;
  "public/projectors": typeof public_projectors;
  "public/read": typeof public_read;
  "public/streams": typeof public_streams;
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
