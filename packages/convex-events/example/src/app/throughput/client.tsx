import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { renderApp } from "../../render-root";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_NAMESPACES = 64;

function parseBucketKey(bucketKey: string): {
  ruleIndex: number;
  groupKey: string;
} {
  const i = bucketKey.indexOf("\0");
  if (i === -1) return { ruleIndex: -1, groupKey: bucketKey };
  return {
    ruleIndex: Number(bucketKey.slice(0, i)),
    groupKey: bucketKey.slice(i + 1),
  };
}

function Throughput() {
  const append = useMutation(api.functions.appendEvent);
  const fifoBuckets = useQuery(api.functions.listBusFifoBuckets);
  const evictionRules = useQuery(api.functions.getFifoEvictionRules);

  const [namespaceCount, setNamespaceCount] = useState(4);
  const [eventsPerSec, setEventsPerSec] = useState(5);
  const [streamKind, setStreamKind] = useState<"todo" | "counter">("todo");
  const [running, setRunning] = useState(false);

  const [display, setDisplay] = useState({
    targetEps: 0,
    ackEps: 0,
    inFlight: 0,
    errors: 0,
  });

  const groupKeys = useMemo(() => {
    const n = Math.min(Math.max(1, namespaceCount), MAX_NAMESPACES);
    return Array.from({ length: n }, (_, i) =>
      streamKind === "todo" ? `ns-${i}` : `stream-${i}`,
    );
  }, [namespaceCount, streamKind]);

  const namespaceMetrics = useQuery(
    api.functions.getMetrics,
    namespaceCount > 0 && streamKind === "todo"
      ? { name: "todo_by_namespace", groupKeys }
      : "skip",
  );

  const counterStreamMetrics = useQuery(
    api.functions.getMetrics,
    namespaceCount > 0 && streamKind === "counter"
      ? { name: "counter_total", groupKeys }
      : "skip",
  );

  const ackWindow = useRef({
    acks: 0,
    errors: 0,
    startedAt: performance.now(),
    inFlight: 0,
  });

  const rotate = useRef(0);

  const appendOne = useCallback(async () => {
    const n = Math.min(Math.max(1, namespaceCount), MAX_NAMESPACES);
    const i = rotate.current % n;
    rotate.current += 1;
    const ns = `ns-${i}`;
    const sid = `stream-${i}`;
    ackWindow.current.inFlight++;
    try {
      if (streamKind === "todo") {
        await append({
          name: "todo",
          streamId: sid,
          eventId: crypto.randomUUID(),
          eventType: "created",
          namespace: ns,
          payload: { title: "throughput" },
        });
      } else {
        await append({
          name: "counter",
          streamId: sid,
          eventId: crypto.randomUUID(),
          eventType: "incremented",
          namespace: ns,
        });
      }
      ackWindow.current.acks++;
    } catch {
      ackWindow.current.errors++;
    } finally {
      ackWindow.current.inFlight--;
    }
  }, [append, namespaceCount, streamKind]);

  useEffect(() => {
    if (!running) return;

    let cancelled = false;
    const target = Math.min(Math.max(0.1, eventsPerSec), 500);
    const periodMs = 1000 / target;

    const loop = async () => {
      while (!cancelled) {
        const t0 = performance.now();
        await appendOne();
        const elapsed = performance.now() - t0;
        const wait = Math.max(0, periodMs - elapsed);
        await new Promise((r) => setTimeout(r, wait));
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [running, eventsPerSec, appendOne]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const w = ackWindow.current;
      const elapsed = (performance.now() - w.startedAt) / 1000;
      if (elapsed < 0.25) return;
      setDisplay({
        targetEps: running ? Math.min(Math.max(0.1, eventsPerSec), 500) : 0,
        ackEps: w.acks / elapsed,
        inFlight: w.inFlight,
        errors: w.errors,
      });
      w.acks = 0;
      w.errors = 0;
      w.startedAt = performance.now();
    }, 250);
    return () => window.clearInterval(id);
  }, [running, eventsPerSec]);

  const ruleSizeByIndex = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of evictionRules ?? []) {
      m.set(r.ruleIndex, r.size);
    }
    return m;
  }, [evictionRules]);

  return (
    <div style={{ maxWidth: "min(1100px, 100vw)", padding: "1rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginTop: 0 }}>Throughput demo</h1>
      <p style={{ fontSize: "0.9rem", opacity: 0.85 }}>
        <a href="/">← Home</a> · Round-robin across namespaces{" "}
        <code>ns-0 …</code> with stream ids <code>stream-0 …</code>. Bus rows are
        capped per FIFO rule (predicate buckets).
      </p>
      <aside
        style={{
          fontSize: "0.85rem",
          lineHeight: 1.45,
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          borderLeft: "3px solid #646cff",
          background: "rgba(100, 108, 255, 0.08)",
          maxWidth: "52rem",
        }}
      >
        <strong>What this measures.</strong> This UI drives load from a{" "}
        <strong>single browser loop</strong> that <strong>awaits each mutation</strong>{" "}
        before starting the next. “Measured delivery” is{" "}
        <strong>successful mutation completions per second</strong> from this tab
        (end-to-end: network + Convex). It is useful for comparing target vs
        observed pacing and for watching metrics / FIFO buckets—not for
        claiming maximum Convex throughput.
        <br />
        <br />
        <strong>What it does not prove.</strong> Backend throughput and cost
        scaling should be judged with the <strong>Convex dashboard</strong> and{" "}
        <strong>convex insights</strong> under <strong>parallel</strong> load (many
        overlapping mutations from scripts or multiple clients), not serial
        browser awaits alone.
      </aside>

      <section
        style={{
          display: "grid",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          maxWidth: "32rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Namespaces / streams (1–{MAX_NAMESPACES})</span>
          <input
            type="number"
            min={1}
            max={MAX_NAMESPACES}
            value={namespaceCount}
            onChange={(e) =>
              setNamespaceCount(
                Math.min(
                  MAX_NAMESPACES,
                  Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                ),
              )
            }
            disabled={running}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Target events (mutations) per second</span>
          <input
            type="number"
            min={0.5}
            max={500}
            step={0.5}
            value={eventsPerSec}
            onChange={(e) =>
              setEventsPerSec(
                Math.min(500, Math.max(0.5, Number.parseFloat(e.target.value) || 1)),
              )
            }
            disabled={running}
          />
        </label>
        <fieldset disabled={running} style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: "0.35rem" }}>Stream</legend>
          <label style={{ marginRight: "1rem" }}>
            <input
              type="radio"
              name="sk"
              checked={streamKind === "todo"}
              onChange={() => setStreamKind("todo")}
            />{" "}
            todo:created (metrics: <code>todo_by_namespace</code>)
          </label>
          <label>
            <input
              type="radio"
              name="sk"
              checked={streamKind === "counter"}
              onChange={() => setStreamKind("counter")}
            />{" "}
            counter:incremented (metrics: <code>counter_total</code> by streamId)
          </label>
        </fieldset>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button type="button" onClick={() => setRunning((r) => !r)}>
            {running ? "Stop" : "Start"}
          </button>
          {running ? (
            <span style={{ color: "#8b8" }}>Running</span>
          ) : (
            <span style={{ opacity: 0.7 }}>Stopped</span>
          )}
        </div>
      </section>

      <h2 style={{ fontSize: "1.15rem" }}>Live rates (this browser tab)</h2>
      <p style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: "-0.25rem" }}>
        One mutation in flight at a time; delivery cannot exceed ~1 / (seconds per
        round-trip) regardless of target.
      </p>
      <table style={{ borderCollapse: "collapse", marginBottom: "1.25rem" }}>
        <tbody>
          <tr>
            <td style={{ padding: "0.25rem 1rem 0.25rem 0", opacity: 0.8 }}>
              Target schedule
            </td>
            <td style={{ fontVariantNumeric: "tabular-nums" }}>
              {display.targetEps.toFixed(1)} /s
            </td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 1rem 0.25rem 0", opacity: 0.8 }}>
              Measured completions (mutations / s)
            </td>
            <td style={{ fontVariantNumeric: "tabular-nums" }}>
              {display.ackEps.toFixed(1)} /s
            </td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 1rem 0.25rem 0", opacity: 0.8 }}>
              In-flight mutations
            </td>
            <td>{display.inFlight}</td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 1rem 0.25rem 0", opacity: 0.8 }}>
              Client errors
            </td>
            <td>{display.errors}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.15rem" }}>Counters by namespace / stream</h2>
      <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        Component metrics (append-side); group keys match the load generator.
      </p>
      {streamKind === "todo" && namespaceMetrics && (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>namespace</th>
              <th style={{ textAlign: "right", padding: "0.35rem" }}>count</th>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>lastEventTime</th>
            </tr>
          </thead>
          <tbody>
            {groupKeys.map((gk) => {
              const row = namespaceMetrics[gk];
              return (
                <tr key={gk}>
                  <td style={{ padding: "0.25rem" }}>{gk}</td>
                  <td style={{ textAlign: "right" }}>{row?.count ?? "—"}</td>
                  <td>
                    {row?.lastEventTime
                      ? new Date(row.lastEventTime).toLocaleTimeString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {streamKind === "counter" && counterStreamMetrics && (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>streamId</th>
              <th style={{ textAlign: "right", padding: "0.35rem" }}>count</th>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>lastEventTime</th>
            </tr>
          </thead>
          <tbody>
            {groupKeys.map((gk) => {
              const row = counterStreamMetrics[gk];
              return (
                <tr key={gk}>
                  <td style={{ padding: "0.25rem" }}>{gk}</td>
                  <td style={{ textAlign: "right" }}>{row?.count ?? "—"}</td>
                  <td>
                    {row?.lastEventTime
                      ? new Date(row.lastEventTime).toLocaleTimeString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: "1.15rem", marginTop: "1.5rem" }}>
        Event bus FIFO buckets (host <code>eventBusCount</code>)
      </h2>
      <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        <code>currentSize</code> vs eviction <code>size</code>. Prefix before the
        first NUL is <strong>rule index</strong> (first matching rule in{" "}
        <code>fifoEvictionRules</code>). Todo/counter hit rules 0–1; the
        catch-all (last rule) only applies to other stream names.
      </p>
      {fifoBuckets && evictionRules && (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: "0.85rem",
            wordBreak: "break-all",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>rule</th>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>match / scope</th>
              <th style={{ textAlign: "left", padding: "0.35rem" }}>group key</th>
              <th style={{ textAlign: "right", padding: "0.35rem" }}>current</th>
              <th style={{ textAlign: "right", padding: "0.35rem" }}>max</th>
            </tr>
          </thead>
          <tbody>
            {fifoBuckets.map((b) => {
              const { ruleIndex, groupKey } = parseBucketKey(b.bucketKey);
              const max = ruleSizeByIndex.get(ruleIndex) ?? "—";
              const meta = evictionRules.find((r) => r.ruleIndex === ruleIndex);
              const scope = meta
                ? `${JSON.stringify(meta.match)} · ${JSON.stringify(meta.groupBy)}`
                : "—";
              return (
                <tr key={b.bucketKey}>
                  <td style={{ padding: "0.25rem" }}>{ruleIndex}</td>
                  <td style={{ opacity: 0.9 }}>{scope}</td>
                  <td>
                    <span style={{ opacity: 0.85 }}>{groupKey}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>{b.currentSize}</td>
                  <td style={{ textAlign: "right" }}>{max}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

renderApp(<Throughput />);
