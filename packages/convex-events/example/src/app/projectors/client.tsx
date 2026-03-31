import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";

const PROJECTOR = "demo-projector";
const STREAM_NAME = "todo";
const STREAM_ID = "demo-projector-stream";

function Projectors() {
  const checkpoint = useQuery(api.functions.readCheckpoint, {
    projector: PROJECTOR,
    name: STREAM_NAME,
  });
  const unprocessed = useQuery(api.functions.listUnprocessed, {
    projector: PROJECTOR,
    name: STREAM_NAME,
    limit: 10,
  });

  const append = useMutation(api.functions.appendEvent);
  const claim = useMutation(api.functions.claimCheckpoint);
  const advance = useMutation(api.functions.advanceCheckpoint);
  const [status, setStatus] = useState("");

  const addEvent = async () => {
    await append({
      name: STREAM_NAME,
      streamId: STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "created",
      payload: { title: `item-${Date.now()}` },
    });
  };

  const processBatch = async () => {
    setStatus("Claiming…");
    await claim({ projector: PROJECTOR, name: STREAM_NAME });

    const batch = unprocessed ?? [];
    if (batch.length === 0) {
      setStatus("Nothing to process.");
      return;
    }

    let maxSeq = 0;
    for (const ev of batch) {
      maxSeq = Math.max(maxSeq, ev.globalSequence);
    }

    setStatus(`Advancing to sequence ${maxSeq}…`);
    await advance({
      projector: PROJECTOR,
      name: STREAM_NAME,
      lastSequence: maxSeq,
    });
    setStatus(`Processed ${batch.length} events (up to seq ${maxSeq}).`);
  };

  return (
    <div>
      <h1>Projectors</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>
        Checkpoint-based event processing. Append events, then process them in
        batches.
      </p>

      <div>
        <button type="button" onClick={addEvent}>
          + Append event
        </button>
        <button type="button" onClick={processBatch}>
          Process batch
        </button>
      </div>
      {status && (
        <p>
          <em>{status}</em>
        </p>
      )}

      <h2>Checkpoint</h2>
      {checkpoint === undefined ? (
        <p>Loading…</p>
      ) : checkpoint === null ? (
        <p>No checkpoint yet — process a batch to create one.</p>
      ) : (
        <dl>
          <dt>projector</dt>
          <dd>{checkpoint.projector}</dd>
          <dt>name</dt>
          <dd>{checkpoint.name}</dd>
          <dt>lastSequence</dt>
          <dd>{checkpoint.lastSequence}</dd>
          <dt>updatedTime</dt>
          <dd>{new Date(checkpoint.updatedTime).toLocaleString()}</dd>
        </dl>
      )}

      <h2>Unprocessed events ({unprocessed?.length ?? "…"})</h2>
      <table>
        <thead>
          <tr>
            <th>seq</th>
            <th>eventType</th>
            <th>payload</th>
            <th>eventTime</th>
          </tr>
        </thead>
        <tbody>
          {unprocessed?.map((e) => (
            <tr key={e.eventId}>
              <td>{e.globalSequence}</td>
              <td>{e.eventType}</td>
              <td>
                <code>{JSON.stringify(e.payload)}</code>
              </td>
              <td>{new Date(e.eventTime).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

renderApp(<Projectors />);
