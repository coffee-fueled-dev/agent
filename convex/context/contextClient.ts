import {
  getConvexSiteUrl as getConvexSiteUrlFromEnv,
  getEmbeddingServerUrl as getEmbeddingServerUrlFromEnv,
  getFileEmbeddingSecret as getFileEmbeddingSecretFromEnv,
} from "../env";

export function getEmbeddingServerUrl() {
  return getEmbeddingServerUrlFromEnv();
}

export function getFileEmbeddingSecret() {
  return getFileEmbeddingSecretFromEnv();
}

export function getConvexSiteUrl() {
  return getConvexSiteUrlFromEnv();
}
