import { SheetWithTabs } from "@/components/blocks/sheet-with-tabs";
import { JsonValue, TimeValue } from "@/components/formatters";
import { Button } from "@/components/ui/button";
import type { TelemetryDetailItem } from "./types";

export function TelemetryDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: TelemetryDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SheetWithTabs
      key={
        item
          ? item.type === "event"
            ? `event:${item.entry.eventId}`
            : `history:${item.entry.entryId}`
          : "empty"
      }
      defaultValue="overview"
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetWithTabs.ContentList side="right" className="w-full sm:max-w-2xl">
        <SheetWithTabs.Header>
          <SheetWithTabs.Title>
            {item
              ? item.type === "event"
                ? item.entry.eventType
                : item.entry.kind
              : "Telemetry details"}
          </SheetWithTabs.Title>
          <SheetWithTabs.Description>
            {item
              ? item.type === "event"
                ? "Expanded event metadata and payload."
                : "Expanded history metadata, relations, and payload."
              : "Select an item to inspect its details."}
          </SheetWithTabs.Description>
        </SheetWithTabs.Header>

        {item ? (
          <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
            <SheetWithTabs.TabsList className="inline-flex w-fit items-center gap-1 rounded-md border bg-muted/50 p-1">
              <SheetWithTabs.TabTrigger
                value="overview"
                className="rounded-sm px-3 py-1 text-sm data-[state=active]:bg-background"
              >
                Overview
              </SheetWithTabs.TabTrigger>
              <SheetWithTabs.TabTrigger
                value="json"
                className="rounded-sm px-3 py-1 text-sm data-[state=active]:bg-background"
              >
                JSON
              </SheetWithTabs.TabTrigger>
              <SheetWithTabs.TabTrigger
                value="relations"
                className="rounded-sm px-3 py-1 text-sm data-[state=active]:bg-background"
              >
                Relations
              </SheetWithTabs.TabTrigger>
            </SheetWithTabs.TabsList>
            <SheetWithTabs.Content value="overview" className="outline-none">
              <div className="rounded-lg border bg-background p-4">
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Timestamp
                    </div>
                    <div className="mt-1 text-sm">
                      <TimeValue
                        value={
                          item.type === "event"
                            ? item.entry.eventTime
                            : item.entry.entryTime
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Identifier
                    </div>
                    <div className="mt-1 break-all text-sm">
                      {item.type === "event"
                        ? item.entry.eventId
                        : item.entry.entryId}
                    </div>
                  </div>
                </div>
              </div>
            </SheetWithTabs.Content>
            <SheetWithTabs.Content value="json" className="outline-none">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Payload
                </div>
                <JsonValue value={item.entry.payload} className="mt-3" />
              </div>
            </SheetWithTabs.Content>
            <SheetWithTabs.Content value="relations" className="outline-none">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Relations
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {item.type === "event" ? (
                    <div className="grid gap-2">
                      <div>Correlation: {item.entry.correlationId ?? "—"}</div>
                      <div>Causation: {item.entry.causationId ?? "—"}</div>
                    </div>
                  ) : (
                    <div className="break-all">
                      Parents:{" "}
                      {item.entry.parentEntryIds.length > 0
                        ? item.entry.parentEntryIds.join(", ")
                        : "root"}
                    </div>
                  )}
                </div>
              </div>
            </SheetWithTabs.Content>
          </div>
        ) : null}

        <SheetWithTabs.Footer>
          <SheetWithTabs.Close asChild>
            <Button variant="outline">Close</Button>
          </SheetWithTabs.Close>
        </SheetWithTabs.Footer>
      </SheetWithTabs.ContentList>
    </SheetWithTabs>
  );
}
