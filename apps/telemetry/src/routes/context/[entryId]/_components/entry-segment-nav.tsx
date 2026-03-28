"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { contextActivity, contextEntry, Link } from "@/navigation/index.js";
import type { EntrySegment } from "./entry-path.js";

export function EntrySegmentNav({
  entryId,
  namespace,
  current,
}: {
  entryId: string;
  namespace: string;
  current: EntrySegment;
}) {
  const items: { href: string; label: string; segment: EntrySegment }[] = [
    {
      href: contextEntry(entryId, { namespace }),
      label: "Overview",
      segment: "overview",
    },
    {
      href: contextActivity(entryId, { namespace }),
      label: "Activity",
      segment: "activity",
    },
  ];

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="flex-wrap justify-end">
        {items.map(({ href, label, segment }) => (
          <NavigationMenuItem key={segment}>
            <NavigationMenuLink asChild active={current === segment}>
              <Link href={href}>{label}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
