import { Html } from "@react-three/drei";
import { Button } from "../../../components/ui/button.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip.js";
import { MimeTypeIcon } from "./mime-type-icon.js";
import { type ProjectionPoint, SCALE } from "./context-explore-types.js";

export function ContextExploreMarker({
  point,
  dimmed,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: {
  point: ProjectionPoint;
  dimmed: boolean;
  onSelect: (point: ProjectionPoint) => void;
  onHoverStart: (entryId: string) => void;
  onHoverEnd: (entryId: string) => void;
}) {
  return (
    <group position={[point.x * SCALE, point.y * SCALE, point.z * SCALE]}>
      <Html center zIndexRange={[250, -250]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                className="rounded-full transition-opacity duration-200"
                style={{ opacity: dimmed ? 0.15 : 1 }}
                onClick={() => onSelect(point)}
                onPointerEnter={() => onHoverStart(point.entryId)}
                onPointerLeave={() => onHoverEnd(point.entryId)}
              >
                <MimeTypeIcon mimeType={point.mimeType} className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>{point.title || point.key}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Html>
    </group>
  );
}
