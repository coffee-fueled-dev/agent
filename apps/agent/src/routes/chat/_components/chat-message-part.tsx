import { isToolUIPart } from "ai";
import type { UIMessage } from "../../../../../../packages/backend/convex/agents/_tools/uiMessage.js";
import { ChatMessagePartAssistantText } from "./chat-message-part-assistant-text.js";
import { ChatMessagePartData } from "./chat-message-part-data.js";
import { ChatMessagePartFile } from "./chat-message-part-file.js";
import { ChatMessagePartReasoning } from "./chat-message-part-reasoning.js";
import { ChatMessagePartSourceDocument } from "./chat-message-part-source-document.js";
import { ChatMessagePartSourceUrl } from "./chat-message-part-source-url.js";
import { ChatMessagePartTool } from "./chat-message-part-tool.js";
import { ChatMessagePartUserText } from "./chat-message-part-user-text.js";

export function ChatMessagePart({
  part,
  role,
  messageStatus,
  namespace,
}: {
  part: UIMessage["parts"][number];
  role: UIMessage["role"];
  messageStatus: UIMessage["status"];
  /** When file parts are rendered here (not via {@link ChatMessageBubble} file strip), used to mint URLs. */
  namespace?: string | undefined;
}) {
  const streaming = messageStatus === "streaming";

  switch (part.type) {
    case "text":
      if (role === "assistant") {
        return (
          <ChatMessagePartAssistantText
            text={part.text}
            streaming={streaming}
          />
        );
      }
      if (part.providerMetadata?.ui?.visible === false) {
        return null;
      }
      return <ChatMessagePartUserText text={part.text} />;
    case "reasoning":
      return part.text ? <ChatMessagePartReasoning text={part.text} /> : null;
    case "source-url":
      return <ChatMessagePartSourceUrl title={part.title} url={part.url} />;
    case "source-document":
      return <ChatMessagePartSourceDocument title={part.title} />;
    case "file":
      return <ChatMessagePartFile part={part} namespace={namespace} />;
    case "dynamic-tool":
      return <ChatMessagePartTool part={part} />;
    case "step-start":
      return null;
    default:
      if (isToolUIPart(part)) {
        return <ChatMessagePartTool part={part} />;
      }
      if (part.type.startsWith("data-")) {
        const data = "data" in part ? part.data : undefined;
        return <ChatMessagePartData data={data} />;
      }
      return null;
  }
}
