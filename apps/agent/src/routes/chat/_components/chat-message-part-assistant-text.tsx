import { useSmoothText } from "@convex-dev/agent/react";
import { useMemo } from "react";
import { chatMessageMarkdown } from "./chat-message-markdown.js";

export function ChatMessagePartAssistantText({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const [visible] = useSmoothText(text, { startStreaming: streaming });
  const rendered = useMemo(() => {
    try {
      return chatMessageMarkdown.processSync(visible).result;
    } catch {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{visible}</p>
      );
    }
  }, [visible]);
  return <div className="min-w-0 text-sm">{rendered}</div>;
}
