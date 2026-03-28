import { PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { FileDropzoneProvider } from "@/components/files";
import { PageSection } from "../../components/layout/page-section";
import { Button } from "../../components/ui/button";
import { CommandDialog } from "../../components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Spinner } from "../../components/ui/spinner";
import { renderApp } from "../../render-root";
import { AppLayout } from "../_components/app-layout.js";
import { AddContextDialog } from "./_components/add-context-dialog.js";
import { ContextExplore } from "./_components/context-explore.js";
import { ContextSearch } from "./_components/context-search.js";
import { NamespaceProvider, useNamespace } from "./_hooks/use-namespace.js";
import { ProjectionProvider, useProjection } from "./_hooks/use-projection.js";

type MemoryUiValue = {
  isAddContextDialogOpen: boolean;
  setIsAddContextDialogOpen: (open: boolean) => void;
  isSearchDialogOpen: boolean;
  setIsSearchDialogOpen: (open: boolean) => void;
};

const MemoryUiContext = createContext<MemoryUiValue | null>(null);

function useMemoryUi() {
  const ctx = useContext(MemoryUiContext);
  if (!ctx) throw new Error("useMemoryUi must be used within MemoryUiProvider");
  return ctx;
}

function MemoryUiProvider({ children }: PropsWithChildren) {
  const [isAddContextDialogOpen, setIsAddContextDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  return (
    <MemoryUiContext.Provider
      value={{
        isAddContextDialogOpen,
        setIsAddContextDialogOpen,
        isSearchDialogOpen,
        setIsSearchDialogOpen,
      }}
    >
      {children}
    </MemoryUiContext.Provider>
  );
}

function ContextIndexRoute() {
  return (
    <NamespaceProvider>
      <FileDropzoneProvider>
        <ProjectionProvider>
          <MemoryUiProvider>
            <AppLayout
              current="context"
              segmentLead={<PageLead />}
              segmentTrail={<MemoryActions />}
            >
              <ContextPage />
            </AppLayout>
          </MemoryUiProvider>
        </ProjectionProvider>
      </FileDropzoneProvider>
    </NamespaceProvider>
  );
}

function PageLead() {
  const { namespace } = useNamespace();
  return (
    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide space-x-2">
      <b>Explore Memories</b>
      <span className="font-thin">{namespace}</span>
    </span>
  );
}

function MemoryActions() {
  const {
    limitOptions,
    limit,
    setLimit,
    isRefreshing,
    canRegenerate,
    hasNoData,
    phase,
    launch,
  } = useProjection();
  const {
    isAddContextDialogOpen,
    setIsAddContextDialogOpen,
    isSearchDialogOpen,
    setIsSearchDialogOpen,
  } = useMemoryUi();

  return (
    <>
      <span className="text-sm text-muted-foreground">Limit</span>
      <Select value={limit} onValueChange={setLimit}>
        <SelectTrigger size="sm" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {limitOptions.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canRegenerate && (
        <Button variant="outline" size="sm" onClick={launch}>
          <RefreshCwIcon className="size-3.5" />
          {hasNoData ? "Generate" : "Refresh"}
        </Button>
      )}
      {isRefreshing && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Spinner />
          {phase === "projecting" ? "Projecting" : "Loading"}
        </span>
      )}
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
    </>
  );
}

function ContextPage() {
  const { isDragActive } = useDropzone();
  const { isAddContextDialogOpen, isSearchDialogOpen } = useMemoryUi();

  return (
    <PageSection>
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
