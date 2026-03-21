import {
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
} from "@convex-dev/rag";
import { useAction, useMutation } from "convex/react";
import { FileSearch, Search, Upload } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RouteIcon } from "@/components/layout/route-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { AgentMemorySearchResult } from "../../../../../convex/components/agentMemory/public/search";

const defaultNamespace = "context-playground";

function nextKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function inferMimeType(file: File) {
  if (file.type) {
    return file.type;
  }
  return (
    guessMimeTypeFromExtension(file.name) ??
    guessMimeTypeFromContents(await file.arrayBuffer()) ??
    "application/octet-stream"
  );
}

function isTextFile(mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

async function uploadFile(
  file: File,
  generateUploadUrl: (args: Record<string, never>) => Promise<string>,
  mimeType: string,
) {
  const uploadUrl = await generateUploadUrl({});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file");
  }

  const result = (await response.json()) as { storageId: Id<"_storage"> };
  return result.storageId;
}

function SearchResultCard({ result }: { result: AgentMemorySearchResult }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <RouteIcon>
            <FileSearch className="size-4 text-primary" />
          </RouteIcon>
          <span>{result.title ?? result.key}</span>
        </CardTitle>
        <CardDescription>
          <span>
            {result.type === "text"
              ? "Text entry"
              : result.type === "textFile"
                ? `Text file · ${result.mimeType}`
                : `Binary file · ${result.mimeType}`}
          </span>
          <span>{` · score ${result.score.toFixed(3)}`}</span>
          <span>{` · importance ${result.importance.toFixed(2)}`}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {"text" in result ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-3 whitespace-pre-wrap">
            {result.text}
          </pre>
        ) : null}
        {"url" in result ? (
          <a
            className="text-primary underline underline-offset-4"
            href={result.url}
            target="_blank"
            rel="noreferrer"
          >
            Open source file
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ContextPage() {
  const generateUploadUrl = useMutation(api.agentMemory.generateUploadUrl);
  const addText = useAction(api.agentMemory.addText);
  const addStoredTextFile = useAction(api.agentMemory.addStoredTextFile);
  const addStoredBinaryFile = useAction(api.agentMemory.addStoredBinaryFile);
  const searchMemory = useAction(api.agentMemory.search);

  const [namespace, setNamespace] = useState(defaultNamespace);
  const [textTitle, setTextTitle] = useState("");
  const [textValue, setTextValue] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [filePrompt, setFilePrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgentMemorySearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleAddText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingText(true);
    setStatus(null);

    try {
      await addText({
        namespace,
        key: nextKey("text"),
        title: textTitle || undefined,
        text: textValue,
      });
      setTextTitle("");
      setTextValue("");
      setStatus("Added plaintext context.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add text.");
    } finally {
      setIsSubmittingText(false);
    }
  }

  async function handleAddFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setStatus("Choose a file before uploading.");
      return;
    }

    setIsSubmittingFile(true);
    setStatus(null);

    try {
      const mimeType = await inferMimeType(selectedFile);
      const storageId = await uploadFile(
        selectedFile,
        generateUploadUrl,
        mimeType,
      );
      const commonArgs = {
        namespace,
        key: nextKey("file"),
        title: fileTitle || undefined,
        storageId,
        mimeType,
        fileName: selectedFile.name,
      };

      if (isTextFile(mimeType)) {
        await addStoredTextFile(commonArgs);
      } else {
        await addStoredBinaryFile({
          ...commonArgs,
          text: filePrompt || undefined,
        });
      }

      setFileTitle("");
      setFilePrompt("");
      setSelectedFile(null);
      setStatus("Added file-backed context.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add file.");
    } finally {
      setIsSubmittingFile(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setStatus(null);

    try {
      const nextResults = await searchMemory({
        namespace,
        query,
        limit: 10,
        vectorScoreThreshold: 0.5,
      });
      setResults(nextResults);
      setHasSearched(true);
      setStatus(
        `Found ${nextResults.length} result${nextResults.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <AppShell
      current="context"
      eyebrow="Agent memory playground"
      title="Manually add context and inspect search results"
      description="Upload files or add plaintext into agent memory, then query the shared vector space through the same browser page."
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Namespace</CardTitle>
            <CardDescription>
              Use one namespace to isolate a test set of memory entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="namespace">Namespace</Label>
              <Input
                id="namespace"
                value={namespace}
                onChange={(event) => setNamespace(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
            <CardDescription>
              Query text and file-backed memory through the input-group search
              UI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleSearch}>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <InputGroupText>
                    <Search className="size-4" />
                    Search
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search the current namespace"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    disabled={isSearching || !query.trim()}
                    type="submit"
                  >
                    Go
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add plaintext</CardTitle>
            <CardDescription>
              Store a text-only entry directly in the current namespace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleAddText}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="text-title">Title</Label>
                <Input
                  id="text-title"
                  placeholder="Optional title"
                  value={textTitle}
                  onChange={(event) => setTextTitle(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="text-value">Text</Label>
                <Textarea
                  id="text-value"
                  placeholder="Paste plaintext context"
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                />
              </div>
              <Button
                disabled={
                  isSubmittingText || !namespace.trim() || !textValue.trim()
                }
                type="submit"
              >
                {isSubmittingText ? "Adding..." : "Add plaintext"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add file</CardTitle>
            <CardDescription>
              Upload a file, store it in Convex, then index it as text or binary
              context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleAddFile}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="file-title">Title</Label>
                <Input
                  id="file-title"
                  placeholder="Optional title"
                  value={fileTitle}
                  onChange={(event) => setFileTitle(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="file-input">File</Label>
                <Input
                  id="file-input"
                  type="file"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="file-prompt">Binary retrieval text</Label>
                <Textarea
                  id="file-prompt"
                  placeholder="Optional prompt text for non-text files"
                  value={filePrompt}
                  onChange={(event) => setFilePrompt(event.target.value)}
                />
              </div>
              <Button
                disabled={
                  isSubmittingFile || !namespace.trim() || !selectedFile
                }
                type="submit"
              >
                <Upload className="size-4" />
                {isSubmittingFile ? "Uploading..." : "Add file"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Results</h2>
            <p className="text-sm text-muted-foreground">
              Search results are rendered by their discriminated union type.
            </p>
          </div>
          {status ? (
            <p className="text-sm text-muted-foreground">{status}</p>
          ) : null}
        </div>

        {hasSearched && results.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No results yet for this namespace and query.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {results.map((result) => (
            <SearchResultCard key={result.entryId} result={result} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
