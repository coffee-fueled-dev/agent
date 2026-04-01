import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { renderApp } from "../../render-root";

function DimensionList({
  title,
  dimensions,
  selectedId,
  onSelect,
}: {
  title: string;
  dimensions:
    | Array<{
        _id: string;
        value: string;
        firstSeenAt: number;
        lastSeenAt: number;
      }>
    | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div>
      <h3>{title}</h3>
      {dimensions?.length === 0 && <p>None yet — append events first.</p>}
      <ul>
        {dimensions?.map((d) => (
          <li key={d._id}>
            <button
              type="button"
              onClick={() => onSelect(selectedId === d._id ? null : d._id)}
              style={{ fontWeight: selectedId === d._id ? "bold" : "normal" }}
            >
              {d.value}
            </button>{" "}
            (seen {new Date(d.firstSeenAt).toLocaleTimeString()}–
            {new Date(d.lastSeenAt).toLocaleTimeString()})
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComponentDimensions() {
  const streamTypes = useQuery(api.functions.listDimensions, {
    kind: "streamType",
  });
  const eventTypes = useQuery(api.functions.listDimensions, {
    kind: "eventType",
  });

  return (
    <div>
      <p>
        These dimensions come from the component's <code>dimensions</code> table
        — no bus required.
      </p>
      <div style={{ display: "flex", gap: "2rem" }}>
        <DimensionList
          title="Stream types"
          dimensions={streamTypes as any}
          selectedId={null}
          onSelect={() => {}}
        />
        <DimensionList
          title="Event types"
          dimensions={eventTypes as any}
          selectedId={null}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}

function BusDimensions() {
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
      ? { streamTypeId: filterStreamTypeId as Id<"dimensions"> }
      : {}),
    ...(filterEventTypeId
      ? { eventTypeId: filterEventTypeId as Id<"dimensions"> }
      : {}),
    limit: 50,
  });

  return (
    <div>
      <p>
        These dimensions come from the bus's <code>dimensions</code> table.
        Click one to filter bus entries.
      </p>
      <div style={{ display: "flex", gap: "2rem" }}>
        <DimensionList
          title="Stream types"
          dimensions={streamTypes}
          selectedId={filterStreamTypeId}
          onSelect={setFilterStreamTypeId}
        />
        <DimensionList
          title="Event types"
          dimensions={eventTypes}
          selectedId={filterEventTypeId}
          onSelect={setFilterEventTypeId}
        />
      </div>

      <h3>
        Filtered bus entries ({entries?.length ?? "…"})
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
      </h3>
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

function Dimensions() {
  const [tab, setTab] = useState<"component" | "bus">("component");

  return (
    <div>
      <h1>Dimensions</h1>
      <p>
        <a href="/">← Home</a>
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => setTab("component")}
          style={{
            fontWeight: tab === "component" ? "bold" : "normal",
            marginRight: "0.5rem",
          }}
        >
          Component dimensions
        </button>
        <button
          type="button"
          onClick={() => setTab("bus")}
          style={{ fontWeight: tab === "bus" ? "bold" : "normal" }}
        >
          Bus dimensions
        </button>
      </div>

      {tab === "component" ? <ComponentDimensions /> : <BusDimensions />}
    </div>
  );
}

renderApp(<Dimensions />);
