import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten with an ellipsis in the middle when longer than `maxChars` (minimum 3). */
export function middleTruncate(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  const n = Math.max(3, maxChars);
  const left = Math.floor((n - 1) / 2);
  const right = Math.ceil((n - 1) / 2);
  return str.slice(0, left) + "…" + str.slice(-right);
}
