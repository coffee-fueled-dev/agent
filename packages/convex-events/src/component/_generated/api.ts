/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as internal_shared from "../internal/shared.js";
import type * as internal_store from "../internal/store.js";
import type * as models_fields from "../models/fields.js";
import type * as models_tables from "../models/tables.js";
import type * as models_types from "../models/types.js";
import type * as models_validators from "../models/validators.js";
import type * as public_append from "../public/append.js";
import type * as public_dimensions from "../public/dimensions.js";
import type * as public_metrics from "../public/metrics.js";
import type * as public_projectors from "../public/projectors.js";
import type * as public_read from "../public/read.js";
import type * as public_streams from "../public/streams.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "internal/shared": typeof internal_shared;
  "internal/store": typeof internal_store;
  "models/fields": typeof models_fields;
  "models/tables": typeof models_tables;
  "models/types": typeof models_types;
  "models/validators": typeof models_validators;
  "public/append": typeof public_append;
  "public/dimensions": typeof public_dimensions;
  "public/metrics": typeof public_metrics;
  "public/projectors": typeof public_projectors;
  "public/read": typeof public_read;
  "public/streams": typeof public_streams;
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
