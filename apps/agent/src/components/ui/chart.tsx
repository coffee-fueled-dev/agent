"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<ChartConfig>({});

function useChart(): ChartConfig {
  return React.useContext(ChartContext);
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <ChartContext.Provider value={config}>
      <div
        ref={ref}
        className={cn(
          // Recharts ResponsiveContainer needs a definite height (not min-height) so % height resolves.
          "flex h-[200px] w-full flex-col text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean;
    payload?: Array<{ value?: number; name?: string; dataKey?: string }>;
    label?: string;
    className?: string;
  }
>(({ active, payload, label, className }, ref) => {
  const config = useChart();
  if (!active || !payload?.length) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md",
        className,
      )}
    >
      {label ? (
        <div className="font-medium text-muted-foreground">{label}</div>
      ) : null}
      {payload.map((item, i) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const itemConfig = key in config ? config[key] : undefined;
        return (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              {itemConfig?.label ?? key}
            </span>
            <span className="font-mono font-medium tabular-nums">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
