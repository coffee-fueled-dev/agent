import type { UIMessage } from "@agent/backend/types";
import type { FileUIPart } from "ai";
import { ChatMessagePart } from "./chat-message-part.js";
import { ChatMessagePartFile } from "./chat-message-part-file.js";

function separateFileParts(message: UIMessage["parts"]) {
  const fileParts: FileUIPart[] = [];
  const otherParts: UIMessage["parts"][number][] = [];
  for (const part of message) {
    if (part.type === "file") {
      fileParts.push(part);
    } else {
      otherParts.push(part);
    }
  }
  return { fileParts, otherParts };
}

export function ChatMessageBubble({
  message,
  namespace,
}: {
  message: UIMessage;
  /** For minting file URLs from storage id (e.g. account / tenant id). */
  namespace: string | undefined;
}) {
  const isUser = message.role === "user";
  const { fileParts, otherParts } = separateFileParts(message.parts);
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg text-sm ${
        isUser && "ml-auto max-w-lg bg-muted/50 text-muted-foreground p-4"
      }`}
    >
      <div className="flex flex-col gap-2">
        {otherParts.map((part, i) => (
          <ChatMessagePart
            // biome-ignore lint/suspicious/noArrayIndexKey: UIMessage parts have no stable id
            key={`${message.id}-${i}-${part.type}`}
            part={part}
            role={message.role}
            messageStatus={message.status}
            namespace={namespace}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {fileParts.map((part, i) => (
            <ChatMessagePartFile
              // biome-ignore lint/suspicious/noArrayIndexKey: UIMessage parts have no stable id
              key={`${message.id}-${i}-${part.type}`}
              part={part}
              namespace={namespace}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
