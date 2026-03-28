import type * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Placeholder: machine-agent scope and thread list will return when telemetry APIs are restored. */
export function ScopeThreadSidebar({
  selectedCodeId,
  setSelectedCodeId,
  selectedThreadId: _selectedThreadId,
  onSelectedThreadChange: _onSelectedThreadChange,
}: {
  selectedCodeId: string;
  setSelectedCodeId: React.Dispatch<React.SetStateAction<string>>;
  selectedThreadId: string | null;
  onSelectedThreadChange: (threadId: string | null) => void;
}) {
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
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
          Registration and thread activity lists are not available in this
          build.
        </div>
      </CardContent>
    </Card>
  );
}
