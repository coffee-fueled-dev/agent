"use client";

/**
 * Re-exports for React + Convex apps that prefer a dedicated subpath.
 * Add hooks here as needed (e.g. wrappers around `useQuery` for fingerprint bindings).
 */
export {
  type FingerprintCallCtx,
  FingerprintClient,
  type FingerprintClientEvent,
  type FingerprintMutationCtx,
  type FingerprintSubscribable,
  type FingerprintSubscriber,
  IdentityClient,
  type RecordEvaluationArgs,
  type RecordEvaluationForRegisteredAgentArgs,
  type RecordTurnIdentityMutationResult,
  type RegisterAgentAndToolsArgs,
  type RegisterAgentAndToolsResult,
  type RegisterAgentArgs,
  type RegisterAgentMutationResult,
  type RegisterToolArgs,
  type RegisterToolMutationResult,
} from "../client/index.js";
