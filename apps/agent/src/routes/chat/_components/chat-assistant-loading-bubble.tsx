import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function ChatAssistantLoadingBubble() {
  return (
    <span className="flex justify-start">
      <Skeleton className="flex items-center gap-2 py-3 px-8 rounded-full">
        <Spinner />
      </Skeleton>
    </span>
  );
}
