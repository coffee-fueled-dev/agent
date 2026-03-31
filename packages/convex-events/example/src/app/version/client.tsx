import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";

const STREAM_ID = "demo-version";

function Version() {
  const stream = useQuery(api.functions.getStream, {
    name: "todo",
    streamId: STREAM_ID,
  });
  const append = useMutation(api.functions.appendEvent);
  const [error, setError] = useState<string | null>(null);

  const appendWithVersion = async () => {
    setError(null);
    try {
      await append({
        name: "todo",
        streamId: STREAM_ID,
        eventId: crypto.randomUUID(),
        eventType: "created",
        payload: { title: `v${(stream?.version ?? 0) + 1}` },
        expectedVersion: stream?.version ?? 0,
      });
    } catch (e) {
      setError((e as Error).message ?? String(e));
    }
  };

  const appendWithoutVersion = async () => {
    setError(null);
    await append({
      name: "todo",
      streamId: STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "completed",
      payload: { title: "no version check" },
    });
  };

  return (
    <div>
      <h1>Stream versioning</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>
        Shows stream state and optimistic concurrency via{" "}
        <code>expectedVersion</code>.
      </p>

      <h2>Stream state</h2>
      {stream === undefined ? (
        <p>Loading…</p>
      ) : stream === null ? (
        <p>No stream yet — append an event to create it.</p>
      ) : (
        <dl>
          <dt>version</dt>
          <dd>{stream.version}</dd>
          <dt>lastEventSequence</dt>
          <dd>{String(stream.lastEventSequence)}</dd>
          <dt>createdTime</dt>
          <dd>{new Date(stream.createdTime).toLocaleString()}</dd>
          <dt>updatedTime</dt>
          <dd>{new Date(stream.updatedTime).toLocaleString()}</dd>
        </dl>
      )}

      <div>
        <button type="button" onClick={appendWithVersion}>
          Append with expectedVersion={stream?.version ?? 0}
        </button>
        <button type="button" onClick={appendWithoutVersion}>
          Append without version check
        </button>
      </div>

      {error && <pre style={{ color: "red" }}>{error}</pre>}
    </div>
  );
}

renderApp(<Version />);
