"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { Button } from "@/components/ui/button.js";
import { usePublicEnv } from "@/env/index.js";
import { renderApp } from "../../render-root.js";
import { AddMemoryDialog } from "../_components/add-memory-dialog.js";
import { AppLayout } from "../_components/app-layout.js";
import {
  MemorySearch,
  MemorySearchModal,
  MemorySearchTrigger,
} from "../_components/memory-search-modal.js";
import { MemoryStreamList } from "../_components/memory-stream-list.js";

function MemoriesRoute() {
  const { accountToken } = usePublicEnv();
  const [memorySearchOpen, setMemorySearchOpen] = useState(false);

  const segmentTrail = accountToken ? (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <AddMemoryDialog namespace={accountToken}>
        <AddMemoryDialog.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-muted-foreground"
            aria-label="Add memory"
          >
            <PlusIcon className="size-4" />
            <span className="text-xs">Memory</span>
          </Button>
        </AddMemoryDialog.Trigger>
        <AddMemoryDialog.Content />
      </AddMemoryDialog>
      <MemorySearch
        namespace={accountToken}
        open={memorySearchOpen}
        onOpenChange={setMemorySearchOpen}
        disabled={!accountToken}
      >
        <MemorySearchModal />
        <MemorySearchTrigger
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Search memories"
        >
          <SearchIcon className="size-4" />
        </MemorySearchTrigger>
      </MemorySearch>
    </div>
  ) : null;

  return (
    <AppLayout
      segmentLead={
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Memories
        </span>
      }
      segmentTrail={segmentTrail}
    >
      <PageSection>
        <PageSection.Content className="py-8">
          <SidebarInsetFill>
            <PageSection.Body className="h-full overflow-auto">
              <MemoryStreamList
                userId={accountToken}
                emptyTitle="No memories yet."
              />
            </PageSection.Body>
          </SidebarInsetFill>
        </PageSection.Content>
      </PageSection>
    </AppLayout>
  );
}

renderApp(<MemoriesRoute />);
