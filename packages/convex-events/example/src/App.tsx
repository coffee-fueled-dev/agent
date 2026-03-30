import "./App.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function App() {
  const ping = useQuery(api.example.ping, {});

  return (
    <>
      <h1>Convex events example</h1>
      <div className="card">
        <p>
          Example query: <code>api.example.ping</code> →{" "}
          {ping === undefined ? "…" : JSON.stringify(ping)}
        </p>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Wire <code>EventsClient</code> and <code>components.events</code> in
          your app mutations; see README in the package root.
        </p>
      </div>
    </>
  );
}

export default App;
