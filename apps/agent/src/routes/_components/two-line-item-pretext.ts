import { layout, prepare } from "@chenglou/pretext";

/** Primary line: `text-xs font-medium` */
const PRIMARY_FONT = "500 12px ui-sans-serif, sans-serif";
/** Secondary line: `text-xs text-muted-foreground` */
const SECONDARY_FONT = "400 12px ui-sans-serif, sans-serif";
/** ~Tailwind `text-xs` / `leading-4` */
const LINE_HEIGHT_PX = 16;
/** `gap-y-0.5` between stacked lines */
const STACK_GAP_PX = 2;

/**
 * Minimum height for two label lines (e.g. event type + stream type, memory title + key)
 * at `maxWidth`, matching CSS wrapping.
 */
export function estimateTwoLineItemTextHeight(
  primary: string,
  secondary: string | null,
  maxWidth: number,
): number {
  if (maxWidth <= 0) return 0;
  const h1 = layout(
    prepare(primary, PRIMARY_FONT),
    maxWidth,
    LINE_HEIGHT_PX,
  ).height;
  if (!secondary) return h1;
  const h2 = layout(
    prepare(secondary, SECONDARY_FONT),
    maxWidth,
    LINE_HEIGHT_PX,
  ).height;
  return h1 + STACK_GAP_PX + h2;
}
