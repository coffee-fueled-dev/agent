import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileDropzoneProvider } from "@/components/files";
import { PageSection } from "../../components/layout/page-section";
import { Button } from "../../components/ui/button";
import { CommandDialog } from "../../components/ui/command";
import { renderApp } from "../../render-root";
import { AppLayout } from "../_components/app-layout.js";
import { AddContextDialog } from "./_components/add-context-dialog.js";
import { ContextExplore } from "./_components/context-explore.js";
import { ContextSearch } from "./_components/context-search.js";
import { NamespaceProvider } from "./_hooks/use-namespace.js";

function ContextIndexRoute() {
  return (
    <NamespaceProvider>
      <FileDropzoneProvider>
        <AppLayout current="context">
          <ContextPage />
        </AppLayout>
      </FileDropzoneProvider>
    </NamespaceProvider>
  );
}

function ContextPage() {
  const [isAddContextDialogOpen, setIsAddContextDialogOpen] = useState(false);
  const { isDragActive } = useDropzone();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  return (
    <PageSection>
      <PageSection.Header>
        <PageSection.HeaderRow className="flex-wrap items-start justify-between gap-4">
          <PageSection.HeaderColumn>
            <p className="text-sm font-medium text-muted-foreground">Context</p>
            <PageSection.Title>Add and search context</PageSection.Title>
            <PageSection.Description>
              Context entries indexed for semantic search. Add text or files and
              search across the namespace.
            </PageSection.Description>
          </PageSection.HeaderColumn>
          <PageSection.HeaderActions className="flex flex-row flex-wrap items-center gap-2">
            <AddContextDialog
              open={isAddContextDialogOpen}
              onOpenChange={setIsAddContextDialogOpen}
            >
              <AddContextDialog.Trigger asChild>
                <Button variant="outline" size="sm">
                  <PlusIcon className="size-4" />
                  Context
                </Button>
              </AddContextDialog.Trigger>
            </AddContextDialog>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSearchDialogOpen(true)}
            >
              <SearchIcon className="size-4" />
              Search
            </Button>
            <CommandDialog
              className="p-4"
              open={isSearchDialogOpen}
              onOpenChange={setIsSearchDialogOpen}
              showCloseButton={false}
            >
              <ContextSearch />
            </CommandDialog>
          </PageSection.HeaderActions>
        </PageSection.HeaderRow>
      </PageSection.Header>
      <PageSection.Content>
        <ContextExplore
          pushSceneBehind={
            isAddContextDialogOpen || isDragActive || isSearchDialogOpen
          }
        />
      </PageSection.Content>
    </PageSection>
  );
}

renderApp(<ContextIndexRoute />);
