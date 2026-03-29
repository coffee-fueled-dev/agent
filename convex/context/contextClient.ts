import { components } from "../_generated/api";
import { ContextClient } from "../components/context/client";
import {
  getConvexSiteUrl as getConvexSiteUrlFromEnv,
  getEmbeddingServerUrl as getEmbeddingServerUrlFromEnv,
  getFileEmbeddingSecret as getFileEmbeddingSecretFromEnv,
  getGoogleApiKey,
} from "../env";

export function createContextClient() {
  return new ContextClient(components.context, {
    googleApiKey: getGoogleApiKey(),
  });
}

export function getEmbeddingServerUrl() {
  return getEmbeddingServerUrlFromEnv();
}

export function getFileEmbeddingSecret() {
  return getFileEmbeddingSecretFromEnv();
}

export function getConvexSiteUrl() {
  return getConvexSiteUrlFromEnv();
}
