import { useContext } from "react";
import {
  ContextEntryContext,
  type ContextEntryValue,
} from "../_components/context-entry-provider";

export function useContextEntry(): ContextEntryValue {
  const ctx = useContext(ContextEntryContext);
  if (!ctx) throw new Error("useContextEntry must be used within ContextEntryProvider");
  return ctx;
}
