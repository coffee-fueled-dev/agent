import type { FilePart, ImagePart, ModelMessage, TextPart } from "ai";
import type { SearchContextHit } from "../context/search";
import { getFileParts } from "./llmFileParts";

const MAX_HITS = 10;
const TEXT_CAP = 2000;

/**
 * Single system message content for retrieved context: text + optional file/image parts per hit.
 */
export function buildInjectedSystemMessage(
  hits: SearchContextHit[],
): ModelMessage | undefined {
  if (!hits.length) return undefined;

  type Part = TextPart | FilePart | ImagePart;

  const parts: Part[] = [
    {
      type: "text",
      text: "Retrieved context (may be incomplete):",
    },
  ];

  for (let i = 0; i < Math.min(hits.length, MAX_HITS); i++) {
    const hit = hits[i];
    if (hit === undefined) continue;
    const label = hit.title?.trim() || hit.key;
    parts.push({
      type: "text",
      text: `\n[${i + 1}] ${label} (score: ${hit.score.toFixed(4)})`,
    });

    if (hit.filePublicUrl && hit.mimeType) {
      const { filePart, imagePart } = getFileParts(
        hit.filePublicUrl,
        hit.mimeType,
        hit.fileName,
      );
      parts.push(imagePart ?? filePart);
    }

    const body = (hit.textPreview ?? hit.text).trim();
    if (body) {
      const snippet =
        body.length > TEXT_CAP ? `${body.slice(0, TEXT_CAP)}…` : body;
      parts.push({ type: "text", text: snippet });
    }
  }

  return { role: "system", content: parts } as unknown as ModelMessage;
}
