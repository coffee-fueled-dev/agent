import type { UIMessage } from "@agent/backend/types";
import { layout, prepare } from "@chenglou/pretext";

/** Matches `text-sm leading-relaxed` */
const FONT = "400 14px ui-sans-serif, sans-serif";
const LINE_HEIGHT_PX = 23;
/** `max-w-lg` user bubble */
const USER_BUBBLE_MAX_PX = 512;
/** User bubble `p-4` horizontal total */
const USER_PAD_X = 32;
/** User bubble `p-4` vertical total */
const USER_PAD_Y = 32;

function collectPlainText(message: UIMessage): string {
  const chunks: string[] = [];
  for (const p of message.parts) {
    if (p.type === "text") chunks.push(p.text);
    else if (p.type === "reasoning" && "text" in p && p.text) {
      chunks.push(p.text);
    }
  }
  return chunks.join("\n\n");
}

/**
 * Rough minimum height from text + reasoning parts (matches {@link ChatMessagePartUserText}
 * `pre-wrap` for user). Tool/file parts are not measured; natural layout grows past this.
 */
export function estimateChatMessageTextMinHeight(
  message: UIMessage,
  containerWidthPx: number,
): number {
  if (containerWidthPx <= 0) return 0;
  const raw = collectPlainText(message).trim();
  if (!raw) return 0;

  const isUser = message.role === "user";
  const maxWidth = isUser
    ? Math.max(0, Math.min(USER_BUBBLE_MAX_PX, containerWidthPx) - USER_PAD_X)
    : Math.max(0, containerWidthPx);

  const prep = prepare(raw, FONT, {
    whiteSpace: isUser ? "pre-wrap" : "normal",
  });
  const textH = layout(prep, maxWidth, LINE_HEIGHT_PX).height;
  return textH + (isUser ? USER_PAD_Y : 0);
}
