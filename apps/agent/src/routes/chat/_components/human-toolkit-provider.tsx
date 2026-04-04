import { api } from "@very-coffee/backend/api";
import {
  buildHumanToolCall,
  type HumanToolkitExecutableToolName,
  type HumanToolkitToolName,
  type HumanToolkitToolUi,
} from "@very-coffee/backend/types";
import { useQuery } from "convex/react";
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
import { useChatThread } from "../_hooks/use-chat-thread.js";

export type {
  HumanToolkitExecutableToolName,
  HumanToolkitToolName,
  HumanToolkitToolUi,
};

export type HumanToolkitContextValue = {
  namespace: string | undefined;
  threadId: string | null;
  /** Resolved human affordances (policy-filtered). */
  toolkit:
    | { tools: HumanToolkitToolUi[]; instructions: string }
    | undefined
    | null;
  /**
   * Whether a tool name appears in the policy-filtered kit.
   * `undefined` while toolkit is loading; `false` when loaded and absent or kit null.
   */
  isAllowed: (toolName: HumanToolkitToolName) => boolean | undefined;
  /** Run a human tool with server validation; uses {@code chatContext.lastMessageId} when set. */
  executeHumanTool: (
    toolName: HumanToolkitExecutableToolName,
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
    threadId && userId ? { namespace: userId, threadId } : "skip",
  );
  const toolkit = useSessionQuery(
    api.chat.humanAgent.humanToolkitForChat,
    userId ? { namespace: userId, ...(threadId ? { threadId } : {}) } : "skip",
  );
  const runTool = useSessionAction(api.chat.humanAgent.executeHumanTool);

  useEffect(() => {
    if (!userId) return;
    void ensureRegistration({ namespace: userId });
  }, [ensureRegistration, userId]);

  const executeHumanTool = useCallback(
    async (toolName: HumanToolkitExecutableToolName, input: unknown) => {
      if (!threadId || !userId) {
        throw new Error("Missing thread or user");
      }
      return await runTool({
        threadId,
        userId,
        namespace: userId,
        ...(chatCtx?.lastMessageId ? { messageId: chatCtx.lastMessageId } : {}),
        toolName,
        input,
      });
    },
    [chatCtx?.lastMessageId, runTool, threadId, userId],
  );

  const isAllowed = useCallback(
    (toolName: HumanToolkitToolName): boolean | undefined => {
      if (toolkit === undefined) return undefined;
      if (toolkit === null) return false;
      return toolkit.tools.some((t) => t.name === toolName);
    },
    [toolkit],
  );

  const value = useMemo(
    (): HumanToolkitContextValue => ({
      namespace: userId,
      threadId,
      toolkit,
      isAllowed,
      executeHumanTool,
    }),
    [executeHumanTool, isAllowed, threadId, toolkit, userId],
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

export { buildHumanToolCall };
