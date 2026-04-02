"use client";

import {
  ActivityIcon,
  BookOpenIcon,
  ChevronDownIcon,
  UserIcon,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { cn } from "@/lib/utils";
import { contextList, eventsList, Link } from "@/navigation/index.js";

function AccountMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem asChild>
        <Link
          href={eventsList()}
          onBeforeNavigate={onNavigate}
          className={cn("flex cursor-pointer items-center gap-2")}
        >
          <ActivityIcon className="size-4" />
          Events
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          href={contextList()}
          onBeforeNavigate={onNavigate}
          className={cn("flex cursor-pointer items-center gap-2")}
        >
          <BookOpenIcon className="size-4" />
          Memories
        </Link>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

export function AppSidebarAccountMenu({
  onNavigate,
  forceExpanded,
  className,
}: {
  onNavigate?: () => void;
  /** Mobile sheet: use wide trigger with label. */
  forceExpanded?: boolean;
  className?: string;
}) {
  const { isExpanded } = useSidebar();
  const showText = forceExpanded || isExpanded;

  return (
    <div className={cn("w-full", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {showText ? (
            <Button
              type="button"
              variant="ghost"
              className="text-sidebar-foreground h-9 w-full justify-start gap-2 px-2"
              aria-label="Account menu"
            >
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback>
                  <UserIcon className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                Account
              </span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Account menu"
            >
              <UserIcon className="size-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-52 min-w-[10rem]"
          side="right"
          align={showText ? "end" : "start"}
          sideOffset={8}
        >
          <AccountMenuItems onNavigate={onNavigate} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
