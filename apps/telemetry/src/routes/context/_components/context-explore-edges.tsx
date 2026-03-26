import { Line } from "@react-three/drei";

export function ContextExploreEdges({
  hoveredId,
  neighbors,
  posMap,
}: {
  hoveredId: string;
  neighbors: Array<{ id: string; score: number }>;
  posMap: Map<string, [number, number, number]>;
}) {
  const origin = posMap.get(hoveredId);
  if (!origin) return null;

  const scores = neighbors.map((n) => n.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 1);
  const range = maxScore - minScore || 1;

  return (
    <>
      {neighbors.map((n) => {
        const target = posMap.get(n.id);
        if (!target) return null;
        const normalized = (n.score - minScore) / range;
        const opacity = 0.15 + normalized * 0.85;
        const lineWidth = 0.5 + normalized * 1.5;
        return (
          <Line
            key={n.id}
            points={[origin, target]}
            color="var(--color-primary)"
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
          />
        );
      })}
    </>
  );
}
