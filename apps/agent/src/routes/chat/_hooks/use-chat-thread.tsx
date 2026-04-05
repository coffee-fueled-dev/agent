import { api } from "@agent/backend/api";
import { useMutation } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePublicEnv } from "../../../env/index.js";

const STORAGE_KEY = "agent_chat_thread_id";

function replaceUrlSearch(nextSearch: string) {
  if (typeof window === "undefined") return;
  const { pathname, hash } = window.location;
  window.history.replaceState(
    null,
    "",
    pathname + (nextSearch ? `?${nextSearch}` : "") + hash,
  );
}

function readInitialThreadId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  if (typeof window === "undefined") {
    return sessionStorage.getItem(STORAGE_KEY);
  }
  const params = new URLSearchParams(window.location.search);

  if (params.get("new") === "1") {
    sessionStorage.removeItem(STORAGE_KEY);
    params.delete("new");
    params.delete("thread");
    replaceUrlSearch(params.toString());
    return null;
  }

  const fromUrl = params.get("thread");
  if (fromUrl) {
    sessionStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  return sessionStorage.getItem(STORAGE_KEY);
}

function syncThreadToUrl(threadId: string | null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("new");
  if (threadId) {
    params.set("thread", threadId);
  } else {
    params.delete("thread");
  }
  replaceUrlSearch(params.toString());
}

export type ChatThreadContextValue = {
  threadId: string | null;
  setThreadId: (id: string | null) => void;
  userId: string | undefined;
  hasUserId: boolean;
  resetThread: () => void;
  /** Creates a thread, sets it as active, and returns the new thread id. */
  createThread: (args?: { title?: string }) => Promise<string>;
  /** True after send until the assistant message has renderable streamed content. */
  awaitingAssistantStream: boolean;
  setAwaitingAssistantStream: (value: boolean) => void;
};

const ChatThreadContext = createContext<ChatThreadContextValue | null>(null);

export function ChatThreadProvider({ children }: { children: ReactNode }) {
  const { accountToken } = usePublicEnv();
  const createThreadMutation = useMutation(api.chat.thread.createThread);
  const [threadId, setThreadIdState] = useState<string | null>(
    readInitialThreadId,
  );
  const [awaitingAssistantStream, setAwaitingAssistantStream] = useState(false);
  const prevThreadIdRef = useRef<string | null | undefined>(undefined);

  const setThreadId = useCallback((id: string | null) => {
    setThreadIdState(id);
    if (id) {
      sessionStorage.setItem(STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    syncThreadToUrl(threadId);
  }, [threadId]);

  useEffect(() => {
    const prev = prevThreadIdRef.current;
    prevThreadIdRef.current = threadId;
    if (prev === undefined) {
      return;
    }
    if (threadId === null) {
      setAwaitingAssistantStream(false);
      return;
    }
    if (prev !== null && prev !== threadId) {
      setAwaitingAssistantStream(false);
    }
  }, [threadId]);

  const resetThread = useCallback(() => {
    setAwaitingAssistantStream(false);
    setThreadId(null);
  }, [setThreadId]);

  const createThread = useCallback(
    async (args?: { title?: string }) => {
      if (!accountToken) {
        throw new Error(
          "Set BUN_PUBLIC_ACCOUNT_TOKEN in your environment to create a thread.",
        );
      }
      const id = await createThreadMutation({
        userId: accountToken,
        title: args?.title ?? "Chat",
      });
      setThreadId(id);
      return id;
    },
    [accountToken, createThreadMutation, setThreadId],
  );

  const value = useMemo(
    (): ChatThreadContextValue => ({
      threadId,
      setThreadId,
      userId: accountToken,
      hasUserId: Boolean(accountToken),
      resetThread,
      createThread,
      awaitingAssistantStream,
      setAwaitingAssistantStream,
    }),
    [
      threadId,
      setThreadId,
      accountToken,
      resetThread,
      createThread,
      awaitingAssistantStream,
    ],
  );

  return (
    <ChatThreadContext.Provider value={value}>
      {children}
    </ChatThreadContext.Provider>
  );
}

export function useChatThread(): ChatThreadContextValue {
  const ctx = useContext(ChatThreadContext);
  if (!ctx) {
    throw new Error("useChatThread must be used within ChatThreadProvider.");
  }
  return ctx;
}
