import { useCallback, useEffect, useState } from "react";
import { usePublicEnv } from "../../../env/index.js";

const STORAGE_KEY = "telemetry_chat_thread_id";

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

export function useChatThread() {
  const { accountToken: token } = usePublicEnv();
  const [threadId, setThreadIdState] = useState<string | null>(
    readInitialThreadId,
  );

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

  const resetThread = useCallback(() => {
    setThreadId(null);
  }, [setThreadId]);

  return {
    threadId,
    setThreadId,
    token,
    hasToken: Boolean(token),
    resetThread,
  };
}
