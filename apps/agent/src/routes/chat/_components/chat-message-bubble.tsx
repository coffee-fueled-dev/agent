import type { UIMessage } from "@very-coffee/backend/types";
import { ChatMessagePart } from "./chat-message-part.js";

export function ChatMessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg text-sm ${
        isUser && "ml-auto max-w-lg bg-muted/50 text-muted-foreground p-4"
      }`}
    >
      <div className="flex flex-col gap-2">
        {message.parts.map((part, i) => (
          <ChatMessagePart
            // biome-ignore lint/suspicious/noArrayIndexKey: UIMessage parts have no stable id
            key={`${message.id}-${i}-${part.type}`}
            part={part}
            role={message.role}
            messageStatus={message.status}
          />
        ))}
      </div>
    </div>
  );
}
