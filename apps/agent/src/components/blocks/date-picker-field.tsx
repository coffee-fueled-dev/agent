"use client";

import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Calendar } from "@/components/ui/calendar.js";
import { Field, FieldLabel } from "@/components/ui/field.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.js";
import { cn } from "@/lib/utils.js";
import { dateToYmd, ymdToDate } from "./date-time-form.js";

export type DatePickerFieldProps = {
  id: string;
  label: string;
  /** `YYYY-MM-DD` or empty */
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  /** Passed to the root `Field` (e.g. `min-w-0 flex-1` for horizontal rows) */
  fieldClassName?: string;
  /** Controlled popover; omit for internal open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
  triggerClassName,
  fieldClassName,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: DatePickerFieldProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openInternal;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChangeControlled?.(next);
    else setOpenInternal(next);
  };

  const selected = ymdToDate(value);

  return (
    <Field className={cn("min-w-0", fieldClassName)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            className={cn(
              "min-w-[10.5rem] justify-between font-normal",
              triggerClassName,
            )}
          >
            {selected ? format(selected, "PPP") : placeholder}
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            defaultMonth={selected}
            onSelect={(d) => {
              onChange(d ? dateToYmd(d) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
