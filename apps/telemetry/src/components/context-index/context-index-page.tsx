import { PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileDropzone,
  FileDropzoneProvider,
  useFiles,
} from "../context/file-dropzone";
import { AppShell } from "../layout/app-shell";
import { Button } from "../ui/button";
import { CommandDialog } from "../ui/command";
import { AddContextDialog } from "./add-context-dialog";
import { ContextExplore } from "./context-explore";
import { ContextSearch } from "./context-search.js";
import { NamespaceProvider } from "./use-namespace";

export function ContextIndexPage() {
  return (
    <NamespaceProvider>
      <FileDropzoneProvider>
        <ContextIndexPageInner />
      </FileDropzoneProvider>
    </NamespaceProvider>
  );
}

function ContextIndexPageInner() {
  const [isAddContextDialogOpen, setIsAddContextDialogOpen] = useState(false);
  const { files } = useFiles();
  const { isDragActive } = useDropzone();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  useEffect(() => {
    if (files.length > 0) setIsAddContextDialogOpen(true);
  }, [files]);

  return (
    <FileDropzone>
      <AppShell
        current="context"
        eyebrow="Context"
        title="Add and search context"
        description="Context entries indexed for semantic search. Add text or files and search across the namespace."
      >
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
      </AppShell>
    </FileDropzone>
  );
}
