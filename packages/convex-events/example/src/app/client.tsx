import { renderApp } from "../render-root";

function Client() {
  return (
    <div>
      <h1>Convex events examples</h1>
      <nav>
        <ul>
          <li><a href="/streams">Streams</a> — append + paginated live list</li>
          <li><a href="/version">Version</a> — stream state + optimistic concurrency</li>
          <li><a href="/metrics">Metrics</a> — counters and group-by metrics</li>
          <li><a href="/bus">Bus</a> — cross-stream event bus feed</li>
          <li><a href="/dimensions">Dimensions</a> — dimension lists + filtering</li>
          <li><a href="/projectors">Projectors</a> — checkpoint-based processing</li>
        </ul>
      </nav>
    </div>
  );
}

renderApp(<Client />);
