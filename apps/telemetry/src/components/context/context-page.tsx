import {
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
} from "@convex-dev/rag";
import { useAction, useMutation, useQuery } from "convex/react";
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
  const metadataBits = [
    result.metadata.indexKind,
    result.metadata.sourceKind,
    result.metadata.streamId,
    result.metadata.entryTime
      ? new Date(result.metadata.entryTime).toLocaleString()
      : null,
  ].filter(Boolean);

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
          {metadataBits.length > 0 ? (
            <span>{` · ${metadataBits.join(" · ")}`}</span>
          ) : null}
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
        {result.metadata.sourceEntryId || result.metadata.entity ? (
          <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            {result.metadata.entity ? `entity ${result.metadata.entity}` : null}
            {result.metadata.entity && result.metadata.sourceEntryId
              ? " · "
              : null}
            {result.metadata.sourceEntryId
              ? `source entry ${result.metadata.sourceEntryId}`
              : null}
          </div>
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
  const recordThreadIdentityEpisode = useAction(
    api.agentMemory.recordThreadIdentityEpisode,
  );
  const searchThreadIdentityCurrent = useAction(
    api.agentMemory.searchThreadIdentityCurrent,
  );
  const searchThreadIdentityAsOf = useAction(api.agentMemory.searchThreadIdentityAsOf);

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
  const [threadId, setThreadId] = useState("thread-demo");
  const [threadMessageId, setThreadMessageId] = useState("");
  const [threadCodeId, setThreadCodeId] = useState("demo-agent");
  const [threadStaticHash, setThreadStaticHash] = useState("static-demo");
  const [threadRuntimeHash, setThreadRuntimeHash] = useState("runtime-demo");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadAsOfTime, setThreadAsOfTime] = useState("");
  const [threadResults, setThreadResults] = useState<AgentMemorySearchResult[]>([]);
  const [threadStatus, setThreadStatus] = useState<string | null>(null);
  const [isRecordingThreadEpisode, setIsRecordingThreadEpisode] = useState(false);
  const [isSearchingThreadKnowledge, setIsSearchingThreadKnowledge] = useState(false);
  const [hasSearchedThreadKnowledge, setHasSearchedThreadKnowledge] = useState(false);
  const threadIdentityCurrent = useQuery(
    api.agentMemory.getThreadIdentityCurrent,
    threadId.trim() ? { threadId } : "skip",
  );
  const threadIdentityEvolution = useQuery(
    api.agentMemory.listThreadIdentityEvolution,
    threadId.trim() ? { threadId, limit: 20 } : "skip",
  );

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

  async function handleRecordThreadEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRecordingThreadEpisode(true);
    setThreadStatus(null);

    try {
      const messageId = threadMessageId.trim() || nextKey("turn");
      const result = await recordThreadIdentityEpisode({
        threadId,
        messageId,
        codeId: threadCodeId,
        staticHash: threadStaticHash,
        runtimeHash: threadRuntimeHash,
      });
      setThreadMessageId("");
      setThreadStatus(
        `Recorded ${result.entryId} (${result.identityChanged ? "changed" : "stable"}) with ${result.totalTurns} total turn${result.totalTurns === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setThreadStatus(
        error instanceof Error ? error.message : "Failed to record episode.",
      );
    } finally {
      setIsRecordingThreadEpisode(false);
    }
  }

  async function handleSearchThreadCurrent() {
    setIsSearchingThreadKnowledge(true);
    setThreadStatus(null);

    try {
      const nextResults = await searchThreadIdentityCurrent({
        threadId,
        query: threadQuery,
        limit: 10,
        vectorScoreThreshold: 0.5,
      });
      setThreadResults(nextResults);
      setHasSearchedThreadKnowledge(true);
      setThreadStatus(
        `Found ${nextResults.length} current result${nextResults.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setThreadStatus(
        error instanceof Error ? error.message : "Current knowledge search failed.",
      );
    } finally {
      setIsSearchingThreadKnowledge(false);
    }
  }

  async function handleSearchThreadAsOf() {
    setIsSearchingThreadKnowledge(true);
    setThreadStatus(null);

    try {
      const asOfTime = Number(threadAsOfTime);
      const nextResults = await searchThreadIdentityAsOf({
        threadId,
        query: threadQuery,
        asOfTime,
        limit: 10,
        vectorScoreThreshold: 0.5,
      });
      setThreadResults(nextResults);
      setHasSearchedThreadKnowledge(true);
      setThreadStatus(
        `Found ${nextResults.length} historical result${nextResults.length === 1 ? "" : "s"} as of ${new Date(asOfTime).toLocaleString()}.`,
      );
    } catch (error) {
      setThreadStatus(
        error instanceof Error ? error.message : "As-of knowledge search failed.",
      );
    } finally {
      setIsSearchingThreadKnowledge(false);
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

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Thread Identity Temporal Knowledge
            </h2>
            <p className="text-sm text-muted-foreground">
              Record deterministic thread-identity episodes, inspect the current
              projection, search historical knowledge as of a timestamp, and
              view the projected evolution.
            </p>
          </div>
          {threadStatus ? (
            <p className="text-sm text-muted-foreground">{threadStatus}</p>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Record episode</CardTitle>
              <CardDescription>
                Append a thread-identity episode into the component-owned history,
                facts, and memory stack.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={handleRecordThreadEpisode}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="thread-id">Thread id</Label>
                    <Input
                      id="thread-id"
                      value={threadId}
                      onChange={(event) => setThreadId(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="thread-message-id">Message id</Label>
                    <Input
                      id="thread-message-id"
                      placeholder="Optional, autogenerated if empty"
                      value={threadMessageId}
                      onChange={(event) => setThreadMessageId(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="thread-code-id">Code id</Label>
                    <Input
                      id="thread-code-id"
                      value={threadCodeId}
                      onChange={(event) => setThreadCodeId(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="thread-static-hash">Static hash</Label>
                    <Input
                      id="thread-static-hash"
                      value={threadStaticHash}
                      onChange={(event) => setThreadStaticHash(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label htmlFor="thread-runtime-hash">Runtime hash</Label>
                    <Input
                      id="thread-runtime-hash"
                      value={threadRuntimeHash}
                      onChange={(event) => setThreadRuntimeHash(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  disabled={
                    isRecordingThreadEpisode ||
                    !threadId.trim() ||
                    !threadCodeId.trim() ||
                    !threadStaticHash.trim() ||
                    !threadRuntimeHash.trim()
                  }
                  type="submit"
                >
                  {isRecordingThreadEpisode ? "Recording..." : "Record episode"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search current or as-of</CardTitle>
              <CardDescription>
                Search the current semantic projection or the historical archive
                for a single thread.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="thread-query">Semantic query</Label>
                <Input
                  id="thread-query"
                  placeholder="Ask about the selected thread"
                  value={threadQuery}
                  onChange={(event) => setThreadQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="thread-as-of">As-of time (ms since epoch)</Label>
                <Input
                  id="thread-as-of"
                  placeholder="Optional for historical search"
                  value={threadAsOfTime}
                  onChange={(event) => setThreadAsOfTime(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    isSearchingThreadKnowledge ||
                    !threadId.trim() ||
                    !threadQuery.trim()
                  }
                  type="button"
                  onClick={handleSearchThreadCurrent}
                >
                  Search current
                </Button>
                <Button
                  disabled={
                    isSearchingThreadKnowledge ||
                    !threadId.trim() ||
                    !threadQuery.trim() ||
                    !threadAsOfTime.trim()
                  }
                  type="button"
                  variant="outline"
                  onClick={handleSearchThreadAsOf}
                >
                  Search as-of
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current projection</CardTitle>
              <CardDescription>
                Deterministic current-state view projected through facts.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {threadIdentityCurrent ? (
                <div className="grid gap-2">
                  <div>{`Latest message: ${threadIdentityCurrent.latestMessageId ?? "—"}`}</div>
                  <div>{`Code: ${threadIdentityCurrent.latestCodeId ?? "—"}`}</div>
                  <div>{`Static: ${threadIdentityCurrent.latestStaticHash ?? "—"}`}</div>
                  <div>{`Runtime: ${threadIdentityCurrent.latestRuntimeHash ?? "—"}`}</div>
                  <div>{`Turns: ${threadIdentityCurrent.totalTurns}`}</div>
                  <div>
                    {`Entry time: ${
                      threadIdentityCurrent.latestEntryTime
                        ? new Date(
                            threadIdentityCurrent.latestEntryTime,
                          ).toLocaleString()
                        : "—"
                    }`}
                  </div>
                </div>
              ) : (
                "Record or select a thread id to inspect the current projection."
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolution</CardTitle>
              <CardDescription>
                Ordered facts and history entries emitted by the temporal slice.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {(threadIdentityEvolution?.turns ?? []).length === 0 ? (
                <div className="text-muted-foreground">
                  No projected turns yet for this thread.
                </div>
              ) : (
                threadIdentityEvolution?.turns.map((turn) => (
                  <div
                    key={turn.entity}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <div className="font-medium">{turn.entity}</div>
                    <div className="text-muted-foreground">
                      {turn.attrs?.codeId ?? "unknown code"} ·{" "}
                      {turn.state ?? "unknown state"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {turn.attrs?.entryTime
                        ? new Date(turn.attrs.entryTime).toLocaleString()
                        : "no timestamp"}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {hasSearchedThreadKnowledge && threadResults.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No temporal knowledge results yet for this thread and query.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {threadResults.map((result) => (
            <SearchResultCard key={`thread:${result.entryId}`} result={result} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
