"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { chat, contextList, home, Link } from "@/navigation/index.js";

type AppNavProps = {
  current: "telemetry" | "context" | "memory" | "chat";
};

export function AppNav({ current }: AppNavProps) {
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild active={current === "telemetry"}>
            <Link href={home()}>Telemetry</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild active={current === "context"}>
            <Link href={contextList()}>Context</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild active={current === "chat"}>
            <Link href={chat()}>Chat</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
