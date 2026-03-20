import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  throw new Error("CONVEX_URL is not set");
}

type ThreadMessagesResult = {
  streams?: SyncStreamsReturnValue;
};

const client = new ConvexClient(convexUrl);
type MutationRef = Parameters<typeof client.mutation>[0];
type QueryRef = Parameters<typeof client.onUpdate>[0];
type ActionRef = Parameters<typeof client.action>[0];

const chatApi = (
  api as {
    chat: {
      createThread: MutationRef;
      listThreadMessages: QueryRef;
      sendMessage: ActionRef;
    };
  }
).chat;
const rl = createInterface({ input: stdin, output: stdout });
const emptyPage = { cursor: null, numItems: 0 };

const streamCursors = new Map<string, number>();
const streamOrders = new Map<string, number>();

let unsubscribeList: (() => void) | undefined;
let unsubscribeDeltas: (() => void) | undefined;
let subscribedStreamKey = "";
let currentStreamId: string | undefined;
let renderedReply = false;
let closed = false;

function printStreamPrefix(streamId: string) {
  if (currentStreamId === streamId) {
    return;
  }
  if (currentStreamId && renderedReply) {
    stdout.write("\n");
  }
  stdout.write("assistant> ");
  currentStreamId = streamId;
}

function resubscribeDeltas(threadId: string, streamIds: string[]) {
  const nextKey = [...streamIds].sort().join(",");
  if (nextKey === subscribedStreamKey) {
    return;
  }

  subscribedStreamKey = nextKey;
  unsubscribeDeltas?.();
  unsubscribeDeltas = undefined;

  if (streamIds.length === 0) {
    return;
  }

  unsubscribeDeltas = client.onUpdate(
    chatApi.listThreadMessages,
    {
      threadId,
      paginationOpts: emptyPage,
      streamArgs: {
        kind: "deltas",
        cursors: streamIds.map((streamId) => ({ streamId, cursor: 0 })),
      },
    },
    (result: ThreadMessagesResult | undefined) => {
      if (result?.streams?.kind !== "deltas") {
        return;
      }

      const deltas = [...result.streams.deltas].sort((a, b) => {
        const orderA = streamOrders.get(a.streamId) ?? 0;
        const orderB = streamOrders.get(b.streamId) ?? 0;
        return orderA - orderB || a.start - b.start;
      });

      for (const delta of deltas) {
        const cursor = streamCursors.get(delta.streamId) ?? 0;
        if (delta.end <= cursor || delta.start < cursor) {
          continue;
        }

        printStreamPrefix(delta.streamId);

        for (const part of delta.parts) {
          if (part.type === "text-delta") {
            stdout.write(part.delta);
            renderedReply = true;
          }
        }

        streamCursors.set(delta.streamId, delta.end);
      }
    },
  );
}

async function closeClient() {
  if (closed) {
    return;
  }
  closed = true;
  unsubscribeList?.();
  unsubscribeDeltas?.();
  rl.close();
  await client.close();
}

const { threadId } = await client.mutation(chatApi.createThread, {
  title: "Terminal Chat",
});

unsubscribeList = client.onUpdate(
  chatApi.listThreadMessages,
  {
    threadId,
    paginationOpts: emptyPage,
    streamArgs: { kind: "list" },
  },
  (result: ThreadMessagesResult | undefined) => {
    if (result?.streams?.kind !== "list") {
      return;
    }

    for (const stream of result.streams.messages) {
      streamOrders.set(stream.streamId, stream.order);
    }

    resubscribeDeltas(
      threadId,
      result.streams.messages.map((stream) => stream.streamId),
    );
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
    currentStreamId = undefined;

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
