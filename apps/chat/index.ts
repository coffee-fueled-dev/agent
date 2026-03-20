import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { getToolName, isToolUIPart } from "ai";
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";
import type { UIMessage } from "../../convex/llms/uiMessage";

const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  throw new Error("CONVEX_URL is not set");
}

const client = new ConvexClient(convexUrl);

const chatApi = api.chat;
const rl = createInterface({ input: stdin, output: stdout });
const emptyPage = { cursor: null, numItems: 0 };

const renderedMessageStates = new Map<string, string>();

let unsubscribeMessages: (() => void) | undefined;
let renderedReply = false;
let closed = false;

function formatPart(part: UIMessage["parts"][number]) {
  switch (part.type) {
    case "text":
      return part.text;
    case "reasoning":
      return part.text ? `[reasoning] ${part.text}` : "";
    case "source-url":
      return `[source] ${String(part.title ?? part.url)}`;
    case "source-document":
      return `[source] ${String(part.title)}`;
    case "file":
      return `[file] ${String(part.filename ?? part.mediaType)}`;
    case "dynamic-tool":
      switch (part.state) {
        case "input-streaming":
        case "input-available":
          return `[tool call] ${part.toolName}(${JSON.stringify(part.input ?? {})})`;
        case "output-available":
          return `[tool result] ${part.toolName}: ${JSON.stringify(part.output)}`;
        case "output-error":
          return `[tool error] ${part.toolName}: ${part.errorText}`;
        default:
          return "";
      }
    case "step-start":
      return "";
    default:
      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        switch (part.state) {
          case "input-streaming":
          case "input-available":
            return `[tool call] ${toolName}(${JSON.stringify(part.input ?? {})})`;
          case "output-available":
            return `[tool result] ${toolName}: ${JSON.stringify(part.output)}`;
          case "output-error":
            return `[tool error] ${toolName}: ${part.errorText}`;
          default:
            return "";
        }
      }
      if (part.type.startsWith("data-")) {
        return `[data] ${JSON.stringify(part.data)}`;
      }
      return "";
  }
}

function formatMessageContent(content: UIMessage["parts"]) {
  return content.map(formatPart).filter(Boolean).join("\n");
}

function renderMessage(message: UIMessage) {
  if (message.role === "user" || message.role === "system") {
    return;
  }

  const body = formatMessageContent(message.parts).trim();
  if (!body) {
    return;
  }

  const nextState = `${message.status ?? ""}:${body}`;
  if (renderedMessageStates.get(message.id) === nextState) {
    return;
  }

  renderedMessageStates.set(message.id, nextState);
  stdout.write(`${message.role}> ${body}\n`);
  renderedReply = true;
}

async function closeClient() {
  if (closed) {
    return;
  }
  closed = true;
  unsubscribeMessages?.();
  rl.close();
  await client.close();
}

const { threadId } = await client.mutation(chatApi.createThread, {
  title: "Terminal Chat",
});

unsubscribeMessages = client.onPaginatedUpdate_experimental(
  chatApi.listThreadMessages,
  {
    threadId,
    paginationOpts: emptyPage,
    streamArgs: { kind: "list" },
  },
  { initialNumItems: 10 },
  (result) => {
    for (const paginated of result.page) {
      for (const message of paginated.page) {
        renderMessage(message);
      }
    }
  },
);

console.log("Simple terminal chat. Type `exit` to quit.");

try {
  while (true) {
    const prompt = (await rl.question("> ")).trim();
    if (!prompt) {
      continue;
    }
    if (prompt === "exit" || prompt === "quit") {
      break;
    }

    renderedReply = false;

    try {
      const result = await client.action(chatApi.sendMessage, {
        threadId,
        prompt,
      });

      if (!renderedReply) {
        console.log(`assistant> ${result.text}`);
      } else {
        stdout.write("\n");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`assistant error> ${message}`);
    }
  }
} finally {
  await closeClient();
}
