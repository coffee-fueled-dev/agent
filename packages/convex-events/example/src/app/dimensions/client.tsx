import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { renderApp } from "../../render-root";

function Dimensions() {
  const streamTypes = useQuery(api.functions.listBusDimensions, {
    kind: "streamType",
  });
  const eventTypes = useQuery(api.functions.listBusDimensions, {
    kind: "eventType",
  });

  const [filterStreamTypeId, setFilterStreamTypeId] = useState<string | null>(
    null,
  );
  const [filterEventTypeId, setFilterEventTypeId] = useState<string | null>(
    null,
  );

  const entries = useQuery(api.functions.listBusEntries, {
    ...(filterStreamTypeId
      ? { streamTypeId: filterStreamTypeId as Id<"eventBusDimensions"> }
      : {}),
    ...(filterEventTypeId
      ? { eventTypeId: filterEventTypeId as Id<"eventBusDimensions"> }
      : {}),
    limit: 50,
  });

  return (
    <div>
      <h1>Dimensions</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>Browse known dimensions and filter bus entries by clicking one.</p>

      <div style={{ display: "flex", gap: "2rem" }}>
        <div>
          <h2>Stream types</h2>
          {streamTypes?.length === 0 && (
            <p>None yet — append events on other pages first.</p>
          )}
          <ul>
            {streamTypes?.map((d) => (
              <li key={d._id}>
                <button
                  type="button"
                  onClick={() =>
                    setFilterStreamTypeId(
                      filterStreamTypeId === d._id ? null : d._id,
                    )
                  }
                  style={{
                    fontWeight:
                      filterStreamTypeId === d._id ? "bold" : "normal",
                  }}
                >
                  {d.value}
                </button>{" "}
                (seen {new Date(d.firstSeenAt).toLocaleTimeString()}–
                {new Date(d.lastSeenAt).toLocaleTimeString()})
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Event types</h2>
          {eventTypes?.length === 0 && <p>None yet.</p>}
          <ul>
            {eventTypes?.map((d) => (
              <li key={d._id}>
                <button
                  type="button"
                  onClick={() =>
                    setFilterEventTypeId(
                      filterEventTypeId === d._id ? null : d._id,
                    )
                  }
                  style={{
                    fontWeight: filterEventTypeId === d._id ? "bold" : "normal",
                  }}
                >
                  {d.value}
                </button>{" "}
                (seen {new Date(d.firstSeenAt).toLocaleTimeString()}–
                {new Date(d.lastSeenAt).toLocaleTimeString()})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2>
        Filtered entries ({entries?.length ?? "…"})
        {(filterStreamTypeId || filterEventTypeId) && (
          <button
            type="button"
            onClick={() => {
              setFilterStreamTypeId(null);
              setFilterEventTypeId(null);
            }}
          >
            clear filters
          </button>
        )}
      </h2>
      <table>
        <thead>
          <tr>
            <th>streamType</th>
            <th>eventType</th>
            <th>streamId</th>
            <th>eventTime</th>
          </tr>
        </thead>
        <tbody>
          {entries?.map((e) => (
            <tr key={e._id}>
              <td>{e.streamType}</td>
              <td>{e.eventType}</td>
              <td>{e.streamId}</td>
              <td>{new Date(e.eventTime).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

renderApp(<Dimensions />);
