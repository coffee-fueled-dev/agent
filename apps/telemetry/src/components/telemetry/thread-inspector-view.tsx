import type { TelemetryDetailItem } from "@/components/telemetry/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Placeholder until thread identity is wired to the event stream again. */
export function ThreadInspectorView({
  selectedThreadId: _selectedThreadId,
  onSelectDetail: _onSelectDetail,
}: {
  selectedThreadId: string | null;
  onSelectDetail: (item: TelemetryDetailItem) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Thread identity</CardTitle>
          <CardDescription>
            Detailed thread identity telemetry is not available in this build.
            It can be restored against the threadIdentity event stream later.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
