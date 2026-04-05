/** Canonical plaintext on `memoryRecords.text` (search mirrors this field). */
export function appendCanonicalMemoryText(
  prev: string | undefined,
  segment: string,
): string {
  const t = segment.trim();
  if (!t) return prev?.trim() ?? "";
  if (!prev?.trim()) return t;
  return `${prev.trim()}\n\n${t}`;
}
