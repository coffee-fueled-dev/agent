import { ArrowDownIcon } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { useChatScrollAnchor } from "../_hooks/use-chat-scroll-anchor.js";

type ChatJumpToLatestContextValue = {
  lastPairRef: React.RefObject<HTMLDivElement | null>;
  showJumpToLatest: boolean;
  scrollToTail: () => void;
};

const ChatJumpToLatestContext =
  createContext<ChatJumpToLatestContextValue | null>(null);

function useChatJumpToLatest() {
  const value = useContext(ChatJumpToLatestContext);
  if (!value) {
    throw new Error(
      "ChatJumpToLatest components must be used within ChatJumpToLatestProvider.",
    );
  }
  return value;
}

export function ChatJumpToLatestProvider({
  children,
  viewportRef,
  messageCount,
  threadId,
}: {
  children: ReactNode;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  messageCount: number;
  threadId: string;
}) {
  const lastPairRef = useRef<HTMLDivElement>(null);
  const { showJumpToLatest, scrollToTail } = useChatScrollAnchor({
    viewportRef,
    lastPairRef,
    messageCount,
    threadId,
  });

  const value = useMemo(
    () => ({ lastPairRef, showJumpToLatest, scrollToTail }),
    [showJumpToLatest, scrollToTail],
  );

  return (
    <ChatJumpToLatestContext.Provider value={value}>
      {children}
    </ChatJumpToLatestContext.Provider>
  );
}

export function LastMessagePair({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { lastPairRef } = useChatJumpToLatest();
  return (
    <div ref={lastPairRef} className={className} style={style}>
      {children}
    </div>
  );
}

export function JumpToLatest() {
  const { showJumpToLatest, scrollToTail } = useChatJumpToLatest();

  if (!showJumpToLatest) return null;

  return (
    <div className="absolute z-10 bottom-3 w-full flex justify-center">
      <Button
        type="button"
        size="icon"
        onClick={() => scrollToTail()}
        variant="outline"
        className="rounded-full backdrop-blur-sm opacity-80 hover:opacity-100"
      >
        <ArrowDownIcon />
      </Button>
    </div>
  );
}
