import { api } from "@very-coffee/backend/api";
import {
  useSessionAction,
  useSessionMutation,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQuery } from "convex/react";
import { useChatThread } from "../_hooks/use-chat-thread.js";

export type HumanToolkitToolUi = {
  name: string;
  description?: string;
  enabled: boolean;
  policyIds?: string[];
  inputJsonSchema?: unknown;
};

export type HumanToolkitContextValue = {
  namespace: string | undefined;
  threadId: string | null;
  /** Resolved human affordances (policy-filtered). */
  toolkit:
    | { tools: HumanToolkitToolUi[]; instructions: string }
    | undefined
    | null;
  /** Run a human tool with server validation; uses {@code chatContext.lastMessageId} when set. */
  executeHumanTool: (
    toolName: string,
    input: unknown,
  ) => Promise<unknown>;
};

const HumanToolkitContext = createContext<HumanToolkitContextValue | null>(
  null,
);

export function HumanToolkitProvider({ children }: { children: ReactNode }) {
  const { threadId, userId } = useChatThread();
  const ensureRegistration = useSessionMutation(
    api.agents.human.ensureRegistration.ensureHumanAgentRegistration,
  );
  const chatCtx = useQuery(
    api.chat.chatContext.getChatContext,
    threadId && userId
      ? { namespace: userId, threadId }
      : "skip",
  );
  const toolkit = useSessionQuery(
    api.chat.humanAgent.humanToolkitForChat,
    threadId && userId
      ? { threadId, namespace: userId }
      : "skip",
  );
  const runTool = useSessionAction(api.chat.humanAgent.executeHumanTool);

  useEffect(() => {
    if (!userId) return;
    void ensureRegistration({ namespace: userId });
  }, [ensureRegistration, userId]);

  const executeHumanTool = useCallback(
    async (toolName: string, input: unknown) => {
      if (!threadId || !userId) {
        throw new Error("Missing thread or user");
      }
      return await runTool({
        threadId,
        userId,
        namespace: userId,
        ...(chatCtx?.lastMessageId
          ? { messageId: chatCtx.lastMessageId }
          : {}),
        toolName,
        input,
      });
    },
    [chatCtx?.lastMessageId, runTool, threadId, userId],
  );

  const value = useMemo(
    (): HumanToolkitContextValue => ({
      namespace: userId,
      threadId,
      toolkit,
      executeHumanTool,
    }),
    [executeHumanTool, threadId, toolkit, userId],
  );

  return (
    <HumanToolkitContext.Provider value={value}>
      {children}
    </HumanToolkitContext.Provider>
  );
}

export function useHumanToolkit(): HumanToolkitContextValue | null {
  return useContext(HumanToolkitContext);
}
