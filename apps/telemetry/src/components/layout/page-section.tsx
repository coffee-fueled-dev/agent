import { cn } from "@/lib/utils";

export function PageSection({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-21", className)} {...props}>
      {children}
    </div>
  );
}

PageSection.Header = function PageSectionHeader({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      {children}
    </div>
  );
};

PageSection.HeaderRow = function HeaderRow({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("flex flex-row gap-5 items-center", className)}
      {...props}
    >
      {children}
    </span>
  );
};

PageSection.HeaderColumn = function PageSectionHeaderColumn({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 flex-1", className)} {...props}>
      {children}
    </div>
  );
};

PageSection.HeaderMedia = function PageSectionHeaderMedia({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

PageSection.HeaderActions = function PageSectionHeaderActions({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {children}
    </div>
  );
};

PageSection.Title = function PageSectionTitle({
  children,
  className,
  size = "2xl",
  ...props
}: React.ComponentProps<"h2"> & { size?: "lg" | "xl" | "2xl" }) {
  return (
    <h2 className={cn("font-bold", `text-${size}`, className)} {...props}>
      {children}
    </h2>
  );
};

PageSection.Description = function PageSectionDescription({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
};

PageSection.Content = function PageSectionContent({
  children,
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "muted" | "default" | "card" }) {
  let variantStyles: string | undefined;
  if (variant === "muted") variantStyles = "rounded-md p-8 bg-muted/50";
  if (variant === "card") variantStyles = "rounded-md p-8 bg-card";
  return (
    <div
      className={cn("flex flex-col gap-8", variantStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};

PageSection.Body = function PageSectionBody({
  children,
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "muted" | "default" | "card" }) {
  let variantStyles: string | undefined;
  if (variant === "muted") variantStyles = "rounded-md p-8 bg-muted/50";
  if (variant === "card") variantStyles = "rounded-md p-8 bg-card";
  return (
    <div
      className={cn("gap-5 flex flex-col", variantStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};
