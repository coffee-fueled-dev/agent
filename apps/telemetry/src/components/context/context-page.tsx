import { BrainIcon, PlusIcon } from "lucide-react";
import { PageSection } from "../layout/page-section";
import { Button } from "../ui/button";
import { AddMemoryDialog } from "./add-memory-dialog";
import { ChartList } from "./chart-list";
import { FileDropzone } from "./file-dropzone";
import { MemoryList } from "./memory-list";
import { SearchMemories } from "./search-memories";

export function App() {
  return (
    <FileDropzone>
      <PageSection>
        <PageSection.Header>
          <PageSection.HeaderRow>
            <PageSection.HeaderMedia>
              <BrainIcon size={16} />
            </PageSection.HeaderMedia>
            <PageSection.Title>
              {/* Selected namespace */} Memories
            </PageSection.Title>
            <PageSection.HeaderActions>{}</PageSection.HeaderActions>
          </PageSection.HeaderRow>
          <PageSection.HeaderRow>
            <SearchMemories />
            <AddMemoryDialog>
              <AddMemoryDialog.Trigger>
                <Button>
                  <PlusIcon /> Memory
                </Button>
              </AddMemoryDialog.Trigger>
            </AddMemoryDialog>
          </PageSection.HeaderRow>
        </PageSection.Header>

        <PageSection.Content>
          <PageSection.Body>
            <ChartList />
          </PageSection.Body>
          <PageSection.Body>
            <MemoryList />
          </PageSection.Body>
        </PageSection.Content>
      </PageSection>
    </FileDropzone>
  );
}
