import { Bounds, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { useProjection } from "../_hooks/use-projection.js";
import { ContextExploreEdges } from "./context-explore-edges.js";
import { ContextExploreMarker } from "./context-explore-marker.js";
import { SCALE } from "./context-explore-types.js";

export function ContextExploreScene() {
  const {
    points,
    setSelected,
    hoveredEntryId,
    onHoverStart,
    onHoverEnd,
    hoverData,
  } = useProjection();

  const posMap = useMemo(() => {
    const m = new Map<string, [number, number, number]>();
    for (const p of points) {
      m.set(p.entryId, [p.x * SCALE, p.y * SCALE, p.z * SCALE]);
    }
    return m;
  }, [points]);

  const communitySet = useMemo(() => {
    if (!hoverData?.communityMembers.length) return null;
    return new Set(hoverData.communityMembers);
  }, [hoverData]);

  return (
    <Canvas camera={{ position: [0, 0, 4.8], fov: 50 }}>
      <color attach="background" args={["var(--card)"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[8, 8, 8]} intensity={40} />
      <pointLight position={[-8, -8, -4]} intensity={12} color="#8ab4ff" />
      <Bounds fit clip margin={2}>
        {points.map((point) => (
          <ContextExploreMarker
            key={point.entryId}
            point={point}
            dimmed={
              communitySet !== null &&
              point.entryId !== hoveredEntryId &&
              !communitySet.has(point.entryId)
            }
            onSelect={setSelected}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
        ))}
        {hoveredEntryId && hoverData && (
          <ContextExploreEdges
            hoveredId={hoveredEntryId}
            neighbors={hoverData.neighbors}
            posMap={posMap}
          />
        )}
      </Bounds>
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}
