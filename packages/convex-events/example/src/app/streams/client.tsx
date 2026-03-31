import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";

const STREAM_ID = "demo-list";

function Streams() {
  const [title, setTitle] = useState("");
  const append = useMutation(api.functions.appendEvent);
  const { results, status, loadMore } = usePaginatedQuery(
    api.functions.listStreamEvents,
    { name: "todo", streamId: STREAM_ID, order: "desc" },
    { initialNumItems: 20 },
  );

  const submit = async () => {
    if (!title.trim()) return;
    await append({
      name: "todo",
      streamId: STREAM_ID,
      eventId: crypto.randomUUID(),
      eventType: "created",
      payload: { title: title.trim() },
    });
    setTitle("");
  };

  return (
    <div>
      <h1>Event streams</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>Append events and see a live paginated list.</p>

      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Event title…"
        />
        <button type="button" onClick={submit}>
          Append
        </button>
      </div>

      <h2>Events ({results.length})</h2>
      <table>
        <thead>
          <tr>
            <th>eventType</th>
            <th>payload</th>
            <th>eventTime</th>
          </tr>
        </thead>
        <tbody>
          {results.map((e) => (
            <tr key={e.eventId}>
              <td>{e.eventType}</td>
              <td>
                <code>{JSON.stringify(e.payload)}</code>
              </td>
              <td>{new Date(e.eventTime).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {status === "CanLoadMore" && (
        <button type="button" onClick={() => loadMore(20)}>
          Load more
        </button>
      )}
      {status === "LoadingMore" && <p>Loading…</p>}
    </div>
  );
}

renderApp(<Streams />);
