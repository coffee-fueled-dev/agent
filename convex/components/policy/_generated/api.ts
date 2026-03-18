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
import type * as internal_evaluate from "../internal/evaluate.js";
import type * as internal_shared from "../internal/shared.js";
import type * as public_access from "../public/access.js";
import type * as public_features from "../public/features.js";
import type * as public_scopes from "../public/scopes.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "client/index": typeof client_index;
  "internal/evaluate": typeof internal_evaluate;
  "internal/shared": typeof internal_shared;
  "public/access": typeof public_access;
  "public/features": typeof public_features;
  "public/scopes": typeof public_scopes;
  types: typeof types;
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
