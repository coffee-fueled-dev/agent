import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { CommandDialog } from "../../components/ui/command";
import { renderApp } from "../../render-root";
import { AddContextDialog } from "./_components/add-context-dialog.js";
import { ContextExplore } from "./_components/context-explore.js";
import { ContextSearch } from "./_components/context-search.js";
import { FileDropzoneProvider } from "./_components/file-dropzone.js";
import { NamespaceProvider } from "./_hooks/use-namespace.js";

function ContextIndexRoute() {
  return (
    <NamespaceProvider>
      <FileDropzoneProvider>
        <AppShell
          current="context"
          eyebrow="Context"
          title="Add and search context"
          description="Context entries indexed for semantic search. Add text or files and search across the namespace."
        >
          <ContextIndex />
        </AppShell>
      </FileDropzoneProvider>
    </NamespaceProvider>
  );
}

function ContextIndex() {
  const [isAddContextDialogOpen, setIsAddContextDialogOpen] = useState(false);
  const { isDragActive } = useDropzone();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
      </div>

      <ContextExplore
        pushSceneBehind={
          isAddContextDialogOpen || isDragActive || isSearchDialogOpen
        }
      />
    </div>
  );
}

renderApp(<ContextIndexRoute />);
