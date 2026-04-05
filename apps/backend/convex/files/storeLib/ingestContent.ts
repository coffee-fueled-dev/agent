export function buildIngestContentItem(
  chunk: { text?: string; embedding?: number[] },
  retrievalText?: string,
) {
  const text =
    chunk.text ??
    (retrievalText !== undefined && retrievalText.length > 0
      ? retrievalText
      : undefined);
  const emb = chunk.embedding;
  if (text !== undefined && emb !== undefined && emb.length > 0) {
    return { text, embedding: emb };
  }
  if (text !== undefined) {
    return { text };
  }
  if (emb !== undefined && emb.length > 0) {
    return { embedding: emb };
  }
  throw new Error("ingestFileEmbeddingChunk: empty chunk");
}
