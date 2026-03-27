import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
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
  const q = `?namespace=${encodeURIComponent(namespace)}`;
  const id = encodeURIComponent(entryId);
  const base = `/context/${id}`;

  const items: { href: string; label: string; segment: EntrySegment }[] = [
    { href: `${base}${q}`, label: "Overview", segment: "overview" },
    { href: `${base}/activity${q}`, label: "Activity", segment: "activity" },
  ];

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="flex-wrap justify-end">
        {items.map(({ href, label, segment }) => (
          <NavigationMenuItem key={segment}>
            <NavigationMenuLink asChild active={current === segment}>
              <a href={href}>{label}</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
