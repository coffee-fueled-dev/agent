import type * as React from "react";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-US");
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCount(value: number | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function CountValue({
  value,
  className,
}: {
  value: number | undefined;
  className?: string;
}) {
  return <span className={className}>{formatCount(value)}</span>;
}

export function formatTime(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }

  return timeFormatter.format(value);
}

export function TimeValue({
  value,
  className,
}: {
  value: number | undefined;
  className?: string;
}) {
  return <span className={className}>{formatTime(value)}</span>;
}

export function shorten(value: string, length = 10) {
  return value.length <= length ? value : `${value.slice(0, length)}...`;
}

export function TruncatedValue({
  value,
  length = 10,
  className,
}: {
  value: string;
  length?: number;
  className?: string;
}) {
  return <span className={className}>{shorten(value, length)}</span>;
}

export function formatJson(value: unknown) {
  if (value == null) {
    return "—";
  }

  return JSON.stringify(value, null, 2);
}

export function JsonValue({
  value,
  className,
}: {
  value: unknown;
  className?: string;
}) {
  return (
    <pre
      className={cn("overflow-x-auto text-xs text-muted-foreground", className)}
    >
      {formatJson(value)}
    </pre>
  );
}

export function InlineCountSummary({
  items,
  className,
}: {
  items: Array<{
    key: string;
    label: React.ReactNode;
    value: number | undefined;
  }>;
  className?: string;
}) {
  return (
    <span className={className}>
      {items.map((item, index) => (
        <span key={item.key}>
          {index > 0 ? " · " : null}
          {item.label} <CountValue value={item.value} />
        </span>
      ))}
    </span>
  );
}
