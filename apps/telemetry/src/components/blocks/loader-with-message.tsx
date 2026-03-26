import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";

export function LoaderWithMessage({ children }: { children: string }) {
  return (
    <Skeleton className="flex flex-row items-center gap-2 text-muted-foreground text-sm p-2">
      <Spinner />
      <span>{children}</span>
    </Skeleton>
  );
}
