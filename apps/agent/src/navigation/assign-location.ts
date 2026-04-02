export type NavigateOptions = {
  onBeforeNavigate?: () => void;
};

/** Full-document navigation; resolves relative `href` against the current origin. */
export function assignLocation(href: string, options?: NavigateOptions): void {
  const resolved = new URL(href, window.location.origin).href;
  options?.onBeforeNavigate?.();
  window.location.assign(resolved);
}
