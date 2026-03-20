import { useQuery } from "convex/react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { CountValue, TimeValue, TruncatedValue } from "@/components/formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../../convex/_generated/api.js";

export function ScopeThreadSidebar({
  selectedCodeId,
  setSelectedCodeId,
  selectedThreadId,
  onSelectedThreadChange,
}: {
  selectedCodeId: string;
  setSelectedCodeId: React.Dispatch<React.SetStateAction<string>>;
  selectedThreadId: string | null;
  onSelectedThreadChange: (threadId: string | null) => void;
}) {
  const registrations = useQuery(
    api.llms.identityTelemetry.listMachineAgentRegistrations,
    {},
  );
  const recentThreads = useQuery(
    api.llms.identityTelemetry.listRecentThreadIdentityActivity,
    { limit: 50 },
  );
  const [threadSearch, setThreadSearch] = useState("");

  const filteredThreads = useMemo(() => {
    const normalized = threadSearch.trim().toLowerCase();

    return (recentThreads ?? []).filter((thread) => {
      const inScope =
        selectedCodeId === "all" || thread.codeIds.includes(selectedCodeId);
      const matchesSearch =
        normalized.length === 0 ||
        thread.threadId.toLowerCase().includes(normalized) ||
        thread.codeIds.some((codeId) =>
          codeId.toLowerCase().includes(normalized),
        );

      return inScope && matchesSearch;
    });
  }, [recentThreads, selectedCodeId, threadSearch]);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      if (selectedThreadId !== null) {
        onSelectedThreadChange(null);
      }
      return;
    }

    if (
      !filteredThreads.some((thread) => thread.threadId === selectedThreadId)
    ) {
      onSelectedThreadChange(filteredThreads[0]?.threadId ?? null);
    }
  }, [filteredThreads, onSelectedThreadChange, selectedThreadId]);

  const activeRegistration =
    selectedCodeId === "all"
      ? null
      : ((registrations ?? []).find((item) => item.codeId === selectedCodeId) ??
        null);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Scope</CardTitle>
        <CardDescription>
          Filter counts and thread activity by machine agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Machine agent</span>
          <Select value={selectedCodeId} onValueChange={setSelectedCodeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a machine agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All machine agents</SelectItem>
                {(registrations ?? []).map((registration) => (
                  <SelectItem
                    key={registration.codeId}
                    value={registration.codeId}
                  >
                    {registration.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {activeRegistration ? (
          <div className="rounded-lg border bg-background px-4 py-3 text-sm">
            <div className="font-medium">{activeRegistration.name}</div>
            <div className="mt-1 text-muted-foreground">
              {activeRegistration.codeId}
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div>
                Static:{" "}
                <TruncatedValue value={activeRegistration.latestStaticHash} />
              </div>
              <div>
                Runtime:{" "}
                <TruncatedValue value={activeRegistration.latestRuntimeHash} />
              </div>
              <div>
                Last seen: <TimeValue value={activeRegistration.lastSeenAt} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
            Viewing the full system.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Search threads</span>
          <Input
            placeholder="thread id or code id"
            value={threadSearch}
            onChange={(event) => setThreadSearch(event.currentTarget.value)}
          />
        </div>

        <div className="flex max-h-[28rem] flex-col gap-2 overflow-auto">
          {recentThreads === undefined ? (
            <div className="text-sm text-muted-foreground">
              Loading threads...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
              No matching thread activity yet.
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => onSelectedThreadChange(thread.threadId)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  thread.threadId === selectedThreadId
                    ? "border-primary bg-primary/5"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <div className="truncate text-sm font-medium">
                  {thread.threadId}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <TimeValue value={thread.lastRecordedAt} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <CountValue value={thread.bindingCount} /> bindings ·{" "}
                  <CountValue value={thread.messageCount} /> messages
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
