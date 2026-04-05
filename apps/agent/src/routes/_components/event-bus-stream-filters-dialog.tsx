"use client";

import { api } from "@agent/backend/api";
import { useForm } from "@tanstack/react-form";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { Filter } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { DatePickerField } from "@/components/blocks/date-picker-field.js";
import {
  datePartsToMs,
  msToDateParts,
} from "@/components/blocks/date-time-form.js";
import { TimePickerField } from "@/components/blocks/time-picker-field.js";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { usePublicEnv } from "@/env/index.js";
import {
  type EventsFiltersState,
  readEventsFiltersFromSearch,
  writeEventsFiltersToUrl,
} from "../events/_hooks/use-events-filters-from-url.js";
import { useOptionalEventBusStreamFilters } from "./event-bus-stream-provider.js";

const ANY_DIM = "__any__";

function stateToFormDefaults(f: EventsFiltersState) {
  const from =
    f.eventTimeMin != null
      ? msToDateParts(f.eventTimeMin)
      : { date: "", time: "" };
  const to =
    f.eventTimeMax != null
      ? msToDateParts(f.eventTimeMax)
      : { date: "", time: "" };
  return {
    eventTypeId: f.eventTypeId ?? "",
    sourceStreamTypeId: f.sourceStreamTypeId ?? "",
    fromDate: from.date,
    fromTime: from.time,
    toDate: to.date,
    toTime: to.time,
  };
}

function formToFilterState(values: FormShape): EventsFiltersState {
  const min = values.fromDate.trim()
    ? datePartsToMs(values.fromDate, values.fromTime.trim() || "00:00:00")
    : undefined;
  const max = values.toDate.trim()
    ? datePartsToMs(values.toDate, values.toTime.trim() || "23:59:59")
    : undefined;
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
    const shape: FormShape = {
      eventTypeId: String(form.getFieldValue("eventTypeId") ?? ""),
      sourceStreamTypeId: String(
        form.getFieldValue("sourceStreamTypeId") ?? "",
      ),
      fromDate: String(form.getFieldValue("fromDate") ?? ""),
      fromTime: String(form.getFieldValue("fromTime") ?? ""),
      toDate: String(form.getFieldValue("toDate") ?? ""),
      toTime: String(form.getFieldValue("toTime") ?? ""),
    };
    writeEventsFiltersToUrl(formToFilterState(shape));
  });
}

function scheduleSyncLocalFromForm(
  form: { getFieldValue: (name: keyof FormShape) => string },
  setFilters: Dispatch<SetStateAction<EventsFiltersState>>,
) {
  queueMicrotask(() => {
    const shape: FormShape = {
      eventTypeId: String(form.getFieldValue("eventTypeId") ?? ""),
      sourceStreamTypeId: String(
        form.getFieldValue("sourceStreamTypeId") ?? "",
      ),
      fromDate: String(form.getFieldValue("fromDate") ?? ""),
      fromTime: String(form.getFieldValue("fromTime") ?? ""),
      toDate: String(form.getFieldValue("toDate") ?? ""),
      toTime: String(form.getFieldValue("toTime") ?? ""),
    };
    setFilters(formToFilterState(shape));
  });
}

export function EventBusStreamFiltersDialog({
  syncUrl,
}: {
  /** When true, read/write `et` / `st` / `from` / `to` on the page URL. */
  syncUrl: boolean;
}) {
  const { accountToken: userId } = usePublicEnv();
  const local = useOptionalEventBusStreamFilters();
  const streamFilters =
    syncUrl === false
      ? (() => {
          if (!local) {
            throw new Error(
              "EventBusStreamFiltersDialog with syncUrl=false requires EventBusStreamProvider.",
            );
          }
          return local;
        })()
      : undefined;
  const [open, setOpen] = useState(false);
  const [fromCalOpen, setFromCalOpen] = useState(false);
  const [toCalOpen, setToCalOpen] = useState(false);

  const eventTypeDims = useSessionQuery(
    api.chat.eventBus.listEventBusDimensions,
    userId ? ({ userId, kind: "eventType" } as const) : "skip",
  );
  const streamTypeDims = useSessionQuery(
    api.chat.eventBus.listEventBusDimensions,
    userId ? ({ userId, kind: "streamType" } as const) : "skip",
  );

  const filters = streamFilters?.filters ?? {};

  const initialDefaults = syncUrl
    ? stateToFormDefaults(
        readEventsFiltersFromSearch(
          typeof window !== "undefined" ? window.location.search : "",
        ),
      )
    : stateToFormDefaults(filters);

  const form = useForm({
    defaultValues: initialDefaults,
    onSubmit: async () => {},
  });

  useEffect(() => {
    if (!open) return;
    if (syncUrl) {
      form.reset(
        stateToFormDefaults(
          readEventsFiltersFromSearch(window.location.search),
        ),
      );
    } else {
      form.reset(stateToFormDefaults(filters));
    }
  }, [open, form, syncUrl, filters]);

  const clearAll = () => {
    const empty: FormShape = {
      eventTypeId: "",
      sourceStreamTypeId: "",
      fromDate: "",
      fromTime: "",
      toDate: "",
      toTime: "",
    };
    form.reset(empty);
    if (syncUrl) writeEventsFiltersToUrl({});
    else streamFilters?.setFilters({});
  };

  const onFieldChangeUrl = () => scheduleSyncUrlFromForm(form);
  const onFieldChangeLocal = () => {
    scheduleSyncLocalFromForm(form, streamFilters?.setFilters ?? (() => {}));
  };
  const onFieldChange = syncUrl ? onFieldChangeUrl : onFieldChangeLocal;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5">
          <Filter className="size-3.5" aria-hidden />
          Filter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter events</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <form
            className="flex flex-col gap-6"
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
                      onFieldChange();
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
                      onFieldChange();
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

            <FieldGroup className="gap-2">
              <span className="text-sm font-normal text-muted-foreground">
                After
              </span>
              <FieldGroup className="w-full min-w-0 flex-row flex-nowrap items-end gap-3">
                <form.Field name="fromDate">
                  {(field) => (
                    <DatePickerField
                      id="events-filter-from-date"
                      label="Date"
                      fieldClassName="w-auto min-w-0 flex-1"
                      value={field.state.value}
                      open={fromCalOpen}
                      onOpenChange={setFromCalOpen}
                      onChange={(ymd) => {
                        field.handleChange(ymd);
                        onFieldChange();
                      }}
                    />
                  )}
                </form.Field>
                <form.Field name="fromTime">
                  {(field) => (
                    <TimePickerField
                      id="events-filter-from-time"
                      label="Time"
                      value={field.state.value}
                      onChange={(v) => {
                        field.handleChange(v);
                        onFieldChange();
                      }}
                    />
                  )}
                </form.Field>
              </FieldGroup>
            </FieldGroup>

            <FieldGroup className="gap-2">
              <span className="text-sm font-normal text-muted-foreground">
                Before
              </span>
              <FieldGroup className="w-full min-w-0 flex-row flex-nowrap items-end gap-3">
                <form.Field name="toDate">
                  {(field) => (
                    <DatePickerField
                      id="events-filter-to-date"
                      label="Date"
                      fieldClassName="w-auto min-w-0 flex-1"
                      value={field.state.value}
                      open={toCalOpen}
                      onOpenChange={setToCalOpen}
                      onChange={(ymd) => {
                        field.handleChange(ymd);
                        onFieldChange();
                      }}
                    />
                  )}
                </form.Field>
                <form.Field name="toTime">
                  {(field) => (
                    <TimePickerField
                      id="events-filter-to-time"
                      label="Time"
                      value={field.state.value}
                      onChange={(v) => {
                        field.handleChange(v);
                        onFieldChange();
                      }}
                    />
                  )}
                </form.Field>
              </FieldGroup>
            </FieldGroup>

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
