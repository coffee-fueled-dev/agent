import { api } from "@backend/api.js";
import { useSessionMutation } from "convex-helpers/react/sessions";
import { useEffect, useState } from "react";
import { usePublicEnv } from "../../../env/index.js";

const STORAGE_KEY = "telemetry_chat_thread_id";

export function useChatThread() {
  const { accountToken: token } = usePublicEnv();
  const createThread = useSessionMutation(api.chat.threads.createThread);
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(STORAGE_KEY);
  });
  const [initError, setInitError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (threadId) return;

    let cancelled = false;
    setCreating(true);
    void (async () => {
      try {
        const t = await createThread({ token, title: "Telemetry chat" });
        if (cancelled) return;
        sessionStorage.setItem(STORAGE_KEY, t.threadId);
        setThreadId(t.threadId);
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, threadId, createThread]);

  const resetThread = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setThreadId(null);
    setInitError(null);
  };

  return {
    threadId,
    token,
    hasToken: Boolean(token),
    creating: creating && !threadId,
    initError,
    resetThread,
  };
}
