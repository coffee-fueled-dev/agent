import { getFileEmbeddingSecret } from "../../env/embedding.js";

export function requireEmbeddingSecret(secret: string) {
  if (secret !== getFileEmbeddingSecret()) {
    throw new Error("Unauthorized");
  }
}
