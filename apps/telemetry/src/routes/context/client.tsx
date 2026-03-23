import { PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AddContextDialog } from "../../components/context-index/add-context-dialog";
import { ContextExplore } from "../../components/context-index/context-explore";
import { ContextSearch } from "../../components/context-index/context-search.js";
import {
  FileDropzone,
  FileDropzoneProvider,
  useFiles,
} from "../../components/context-index/file-dropzone";
import { NamespaceProvider } from "../../components/context-index/use-namespace";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { CommandDialog } from "../../components/ui/command";
import { renderApp } from "../../render-root";

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
  const { files } = useFiles();
  const { isDragActive } = useDropzone();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  useEffect(() => {
    if (files.length > 0) setIsAddContextDialogOpen(true);
  }, [files]);

  return (
    <FileDropzone>
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
            open={isSearchDialogOpen}
            onOpenChange={setIsSearchDialogOpen}
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
    </FileDropzone>
  );
}

renderApp(<ContextIndexRoute />);
