import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";

export function LoaderWithMessage({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return (
    <Skeleton
      className={cn(
        "flex flex-row items-center gap-2 text-muted-foreground text-sm p-2",
        className,
      )}
      {...props}
    >
      <Spinner />
      {children && <span>{children}</span>}
    </Skeleton>
  );
}
