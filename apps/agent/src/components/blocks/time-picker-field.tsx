"use client";

import { Field, FieldLabel } from "@/components/ui/field.js";
import { Input } from "@/components/ui/input.js";
import { cn } from "@/lib/utils.js";

export const TIME_PICKER_INPUT_CLASS =
  "appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none";

export type TimePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  fieldClassName?: string;
  inputClassName?: string;
};

export function TimePickerField({
  id,
  label,
  value,
  onChange,
  step = 1,
  fieldClassName,
  inputClassName,
}: TimePickerFieldProps) {
  return (
    <Field className={cn("w-[9.5rem] shrink-0", fieldClassName)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        type="time"
        id={id}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={cn(TIME_PICKER_INPUT_CLASS, inputClassName)}
      />
    </Field>
  );
}
