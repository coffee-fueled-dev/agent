export function RouteIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      {children}
    </div>
  );
}
