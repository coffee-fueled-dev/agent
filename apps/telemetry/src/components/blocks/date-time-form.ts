/** Helpers for YYYY-MM-DD + time strings used with date/time picker fields. */

export function ymdToDate(ymd: string): Date | undefined {
  const t = ymd.trim();
  if (!t) return undefined;
  const parts = t.split("-").map((x) => Number.parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(mo) ||
    Number.isNaN(d) ||
    mo < 1 ||
    d < 1
  ) {
    return undefined;
  }
  return new Date(y, mo - 1, d);
}

export function dateToYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function msToDateParts(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
  };
}

export function parseTimeParts(time: string): [number, number, number] {
  const parts = time.trim().split(":");
  const h = Number.parseInt(parts[0] ?? "0", 10);
  const mm = Number.parseInt(parts[1] ?? "0", 10);
  const s = Number.parseInt(parts[2] ?? "0", 10);
  return [
    Number.isNaN(h) ? 0 : h,
    Number.isNaN(mm) ? 0 : mm,
    Number.isNaN(s) ? 0 : s,
  ];
}

export function datePartsToMs(date: string, time: string): number | undefined {
  const dStr = date.trim();
  if (!dStr) return undefined;
  const parts = dStr.split("-").map((x) => Number.parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    day === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(mo) ||
    Number.isNaN(day)
  ) {
    return undefined;
  }
  const [hh, mm, ss] = parseTimeParts(time.trim() || "00:00:00");
  const t = new Date(y, mo - 1, day, hh, mm, ss).getTime();
  return Number.isNaN(t) ? undefined : t;
}
