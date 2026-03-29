"use client";

import { api } from "@backend/api.js";
import { useForm } from "@tanstack/react-form";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Field, FieldLabel } from "@/components/ui/field.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import {
  type EventsFiltersState,
  readEventsFiltersFromSearch,
  writeEventsFiltersToUrl,
} from "../_hooks/use-events-filters-from-url.js";

const ANY_DIM = "__any__";

function msToDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function datetimeLocalToMs(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? undefined : t;
}

function stateToFormDefaults(f: EventsFiltersState) {
  return {
    eventTypeId: f.eventTypeId ?? "",
    sourceStreamTypeId: f.sourceStreamTypeId ?? "",
    eventTimeFrom:
      f.eventTimeMin != null ? msToDatetimeLocal(f.eventTimeMin) : "",
    eventTimeTo:
      f.eventTimeMax != null ? msToDatetimeLocal(f.eventTimeMax) : "",
  };
}

function formToUrlState(values: {
  eventTypeId: string;
  sourceStreamTypeId: string;
  eventTimeFrom: string;
  eventTimeTo: string;
}): EventsFiltersState {
  const min = datetimeLocalToMs(values.eventTimeFrom);
  const max = datetimeLocalToMs(values.eventTimeTo);
  return {
    eventTypeId: values.eventTypeId || undefined,
    sourceStreamTypeId: values.sourceStreamTypeId || undefined,
    eventTimeMin: min,
    eventTimeMax: max,
  };
}

type FormShape = ReturnType<typeof stateToFormDefaults>;

function scheduleSyncUrlFromForm(form: {
  getFieldValue: (name: keyof FormShape) => string;
}) {
  queueMicrotask(() => {
    writeEventsFiltersToUrl(
      formToUrlState({
        eventTypeId: String(form.getFieldValue("eventTypeId") ?? ""),
        sourceStreamTypeId: String(
          form.getFieldValue("sourceStreamTypeId") ?? "",
        ),
        eventTimeFrom: String(form.getFieldValue("eventTimeFrom") ?? ""),
        eventTimeTo: String(form.getFieldValue("eventTimeTo") ?? ""),
      }),
    );
  });
}

export function EventsFiltersTrigger() {
  const [open, setOpen] = useState(false);
  const eventTypeDims = useSessionQuery(
    api.chat.unifiedTimeline.listUnifiedTimelineDimensionValues,
    { kind: "eventType" },
  );
  const streamTypeDims = useSessionQuery(
    api.chat.unifiedTimeline.listUnifiedTimelineDimensionValues,
    { kind: "sourceStreamType" },
  );

  const form = useForm({
    defaultValues: stateToFormDefaults(
      readEventsFiltersFromSearch(
        typeof window !== "undefined" ? window.location.search : "",
      ),
    ),
    onSubmit: async () => {},
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      stateToFormDefaults(readEventsFiltersFromSearch(window.location.search)),
    );
  }, [open, form]);

  const clearAll = () => {
    const empty: FormShape = {
      eventTypeId: "",
      sourceStreamTypeId: "",
      eventTimeFrom: "",
      eventTimeTo: "",
    };
    form.reset(empty);
    writeEventsFiltersToUrl({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Filter className="size-3.5" aria-hidden />
          Filters
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter events</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <form.Field name="eventTypeId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="events-filter-event-type">
                    Event type
                  </FieldLabel>
                  <Select
                    value={field.state.value ? field.state.value : ANY_DIM}
                    onValueChange={(v) => {
                      const next = v === ANY_DIM ? "" : v;
                      field.handleChange(next);
                      scheduleSyncUrlFromForm(form);
                    }}
                    disabled={eventTypeDims === undefined}
                  >
                    <SelectTrigger
                      id="events-filter-event-type"
                      className="w-full min-w-0"
                    >
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_DIM}>Any</SelectItem>
                      {(eventTypeDims ?? []).map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="sourceStreamTypeId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="events-filter-stream-type">
                    Stream type
                  </FieldLabel>
                  <Select
                    value={field.state.value ? field.state.value : ANY_DIM}
                    onValueChange={(v) => {
                      const next = v === ANY_DIM ? "" : v;
                      field.handleChange(next);
                      scheduleSyncUrlFromForm(form);
                    }}
                    disabled={streamTypeDims === undefined}
                  >
                    <SelectTrigger
                      id="events-filter-stream-type"
                      className="w-full min-w-0"
                    >
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_DIM}>Any</SelectItem>
                      {(streamTypeDims ?? []).map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="eventTimeFrom">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="events-filter-from">
                    From (local time)
                  </FieldLabel>
                  <Input
                    id="events-filter-from"
                    type="datetime-local"
                    value={field.state.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.handleChange(val);
                      scheduleSyncUrlFromForm(form);
                    }}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="eventTimeTo">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="events-filter-to">
                    To (local time)
                  </FieldLabel>
                  <Input
                    id="events-filter-to"
                    type="datetime-local"
                    value={field.state.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.handleChange(val);
                      scheduleSyncUrlFromForm(form);
                    }}
                  />
                </Field>
              )}
            </form.Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
