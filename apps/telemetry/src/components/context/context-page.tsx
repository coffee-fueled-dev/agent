import { BrainIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "../layout/app-shell";
import { PageSection } from "../layout/page-section";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AddMemoryDialog } from "./add-memory-dialog";
import { ChartList } from "./chart-list";
import { FileDropzone, useFiles } from "./file-dropzone";
import { MemoryExplore } from "./memory-explore";
import { MemoryList } from "./memory-list";
import { SearchMemories } from "./search-memories";
import { ChartProvider, useChart } from "./use-chart";
import { MemoriesProvider } from "./use-memories";
import { NamespaceProvider, useNamespace } from "./use-namespace";

export function ContextPage() {
  return (
    <NamespaceProvider>
      <ChartProvider>
        <MemoriesProvider>
          <ContextPageInner />
        </MemoriesProvider>
      </ChartProvider>
    </NamespaceProvider>
  );
}

function ContextPageInner() {
  const { displayName } = useNamespace();
  const { selectedCount, clearCharts } = useChart();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AppShell
      current="context"
      eyebrow="Memory context"
      title="Search and refine a namespace"
      description="Searches stay namespace-oriented. Selecting charts narrows the visible memories without changing the namespace scope."
    >
      <FileDropzone>
        <ContextPageContent
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          displayName={displayName}
          selectedCount={selectedCount}
          clearCharts={clearCharts}
        />
      </FileDropzone>
    </AppShell>
  );
}

function ContextPageContent({
  dialogOpen,
  setDialogOpen,
  displayName,
  selectedCount,
  clearCharts,
}: {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  displayName: string;
  selectedCount: number;
  clearCharts: () => void;
}) {
  const { files } = useFiles();

  useEffect(() => {
    if (files.length > 0 && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [dialogOpen, files.length, setDialogOpen]);

  return (
    <PageSection>
      <PageSection.Header>
        <PageSection.HeaderRow>
          <PageSection.HeaderMedia>
            <BrainIcon size={16} />
          </PageSection.HeaderMedia>
          <PageSection.HeaderColumn>
            <PageSection.Title>Memories</PageSection.Title>
            <PageSection.Description>{displayName}</PageSection.Description>
          </PageSection.HeaderColumn>
          <PageSection.HeaderActions>
            {selectedCount > 0 ? (
              <Button variant="ghost" onClick={clearCharts}>
                Clear {selectedCount} chart
                {selectedCount === 1 ? "" : "s"}
              </Button>
            ) : null}
          </PageSection.HeaderActions>
        </PageSection.HeaderRow>
      </PageSection.Header>
      <PageSection.Content>
        <Tabs defaultValue="search" className="flex flex-col gap-4">
          <TabsList>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <SearchMemories />
              <AddMemoryDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AddMemoryDialog.Trigger asChild>
                  <Button size="sm">
                    <PlusIcon /> Memory
                  </Button>
                </AddMemoryDialog.Trigger>
              </AddMemoryDialog>
            </div>
            <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <PageSection.Body variant="card">
                <ChartList />
              </PageSection.Body>
              <PageSection.Body variant="card">
                <MemoryList />
              </PageSection.Body>
            </div>
          </TabsContent>
          <TabsContent value="explore">
            <MemoryExplore />
          </TabsContent>
        </Tabs>
      </PageSection.Content>
    </PageSection>
  );
}

export default ContextPage;
