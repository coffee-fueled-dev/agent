import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";

const TODO_STREAM = "demo-metrics-todo";
const COUNTER_STREAM = "demo-metrics-counter";

function Metrics() {
  const append = useMutation(api.functions.appendEvent);

  const todoMetrics = useQuery(api.functions.getMetrics, {
    name: "todo_by_type",
    groupKeys: ["created", "completed", "deleted"],
  });

  const counterMetrics = useQuery(api.functions.getMetrics, {
    name: "counter_total",
    groupKeys: [COUNTER_STREAM],
  });

  const appendTodo = (eventType: "created" | "completed" | "deleted") =>
    append({
      name: "todo",
      streamId: TODO_STREAM,
      eventId: crypto.randomUUID(),
      eventType,
      payload: { title: eventType },
    });

  const appendCounter = (eventType: "incremented" | "decremented") =>
    append({
      name: "counter",
      streamId: COUNTER_STREAM,
      eventId: crypto.randomUUID(),
      eventType,
    });

  return (
    <div>
      <h1>Metrics</h1>
      <p>
        <a href="/">← Home</a>
      </p>
      <p>
        Metric rules count events on append. Read counts with{" "}
        <code>getBatch</code>.
      </p>

      <h2>Todo events (grouped by eventType)</h2>
      <div>
        <button type="button" onClick={() => appendTodo("created")}>
          + created
        </button>
        <button type="button" onClick={() => appendTodo("completed")}>
          + completed
        </button>
        <button type="button" onClick={() => appendTodo("deleted")}>
          + deleted
        </button>
      </div>
      {todoMetrics && (
        <table>
          <thead>
            <tr>
              <th>eventType</th>
              <th>count</th>
              <th>lastEventTime</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(todoMetrics).map(([key, val]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{val.count}</td>
                <td>
                  {val.lastEventTime
                    ? new Date(val.lastEventTime).toLocaleTimeString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Counter (grouped by streamId)</h2>
      <div>
        <button type="button" onClick={() => appendCounter("incremented")}>
          + increment
        </button>
        <button type="button" onClick={() => appendCounter("decremented")}>
          + decrement
        </button>
      </div>
      {counterMetrics && (
        <table>
          <thead>
            <tr>
              <th>streamId</th>
              <th>count</th>
              <th>lastEventTime</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(counterMetrics).map(([key, val]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{val.count}</td>
                <td>
                  {val.lastEventTime
                    ? new Date(val.lastEventTime).toLocaleTimeString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

renderApp(<Metrics />);
