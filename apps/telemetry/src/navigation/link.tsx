"use client";

import {
  forwardRef,
  type ComponentProps,
  type MouseEvent,
} from "react";
import { assignLocation } from "./assign-location.js";

export type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  /** When set, skips internal navigation handling (native anchor behavior). */
  external?: boolean;
  /** Runs before navigation when intercepting default (e.g. close mobile sheet). */
  onBeforeNavigate?: () => void;
};

function isLikelyExternalHref(href: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/\/)/i.test(href);
}

function shouldUseNativeNavigation(
  e: MouseEvent<HTMLAnchorElement>,
  props: Pick<LinkProps, "external" | "target" | "href">,
): boolean {
  if (props.external) return true;
  if (props.target === "_blank") return true;
  if (isLikelyExternalHref(props.href)) return true;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
  if (e.button !== 0) return true;
  return false;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, external, onBeforeNavigate, onClick, ...rest },
  ref,
) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!onBeforeNavigate) return;
    if (shouldUseNativeNavigation(e, { external, target: rest.target, href }))
      return;
    e.preventDefault();
    assignLocation(e.currentTarget.href, { onBeforeNavigate });
  };

  return <a ref={ref} href={href} onClick={handleClick} {...rest} />;
});
