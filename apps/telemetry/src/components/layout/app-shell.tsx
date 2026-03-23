import type { ReactNode } from "react";
import { AppNav } from "@/components/layout/app-nav";

type AppShellProps = {
  current: "telemetry" | "context" | "memory";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  current,
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <AppNav current={current} />
          <section className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </section>
        </header>
        {children}
      </div>
    </main>
  );
}
