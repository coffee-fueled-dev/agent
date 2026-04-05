import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ClickToEditInlineProps = {
  value: React.ReactNode;
  onSave: (next: string) => void | Promise<void>;
  /** Called when the user enters or leaves edit mode (e.g. to hide sibling chrome). */
  onEditingChange?: (editing: boolean) => void;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function ClickToEditInline({
  value,
  onSave,
  onEditingChange,
  debounceMs = 400,
  className,
  inputClassName,
  disabled,
  "aria-label": ariaLabel,
}: ClickToEditInlineProps) {
  const stringValue = typeof value === "string" ? value : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(stringValue);
  const snapshotRef = useRef(stringValue);
  const exitViaEscRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSave = useDebounceCallback((next: string) => {
    void onSave(next);
  }, debounceMs);

  useEffect(() => {
    if (!stringValue) return;
    if (!isEditing) {
      setDraft(stringValue);
    }
  }, [stringValue, isEditing]);

  useLayoutEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  const beginEdit = useCallback(() => {
    if (disabled) return;
    snapshotRef.current = stringValue;
    setDraft(stringValue);
    setIsEditing(true);
  }, [disabled, stringValue]);

  const endEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleBlur = useCallback(() => {
    if (exitViaEscRef.current) {
      exitViaEscRef.current = false;
      return;
    }
    debouncedSave.flush();
    endEdit();
  }, [debouncedSave, endEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitViaEscRef.current = true;
        debouncedSave.cancel();
        const snap = snapshotRef.current;
        if (!snap) return;
        setDraft(snap);
        void Promise.resolve(onSave(snap));
        endEdit();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        debouncedSave.flush();
        inputRef.current?.blur();
      }
    },
    [debouncedSave, endEdit, onSave],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      debouncedSave(next);
    },
    [debouncedSave],
  );

  if (!isEditing) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "block w-full min-w-0 cursor-pointer truncate text-left font-bold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50",
          className,
        )}
        onClick={beginEdit}
        aria-label={ariaLabel}
      >
        {value}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-auto w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-inherit shadow-none focus-visible:ring-0 md:text-inherit",
        inputClassName,
      )}
      aria-label={ariaLabel}
    />
  );
}
