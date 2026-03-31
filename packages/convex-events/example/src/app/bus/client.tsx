import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";

function Bus() {
  const append = useMutation(api.functions.appendEvent);
  const entries = useQuery(api.functions.listBusEntries, { limit: 50 });

  const appendTodo = () =>
    append({
      name: "todo",
      streamId: "demo-bus",
      eventId: crypto.randomUUID(),
      eventType: "created",
      payload: { title: "from bus demo" },
    });

  const appendCounter = () =>
    append({
      name: "counter",
      streamId: "demo-bus",
      eventId: crypto.randomUUID(),
      eventType: "incremented",
    });

  return (
    <div>
      <h1>Event bus</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>Cross-stream unified feed. All appended events flow into the bus.</p>

      <div>
        <button type="button" onClick={appendTodo}>
          + todo:created
        </button>
        <button type="button" onClick={appendCounter}>
          + counter:incremented
        </button>
      </div>

      <h2>Bus feed ({entries?.length ?? "…"})</h2>
      <table>
        <thead>
          <tr>
            <th>sourceKey</th>
            <th>streamType</th>
            <th>eventType</th>
            <th>eventTime</th>
          </tr>
        </thead>
        <tbody>
          {entries?.map((e) => (
            <tr key={e._id}>
              <td>{e.sourceKey}</td>
              <td>{e.streamType}</td>
              <td>{e.eventType}</td>
              <td>{new Date(e.eventTime).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

renderApp(<Bus />);
