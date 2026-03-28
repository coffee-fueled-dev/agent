import { api } from "@backend/api.js";
import {
  useSessionAction,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Spinner } from "@/components/ui/spinner.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { useNamespace } from "../_hooks/use-namespace.js";

export function RebuildLinksButton({
  children,
  tooltip,
  ...buttonProps
}: React.ComponentProps<typeof Button> & { tooltip?: string }) {
  const { namespace } = useNamespace();
  const startCommunity = useSessionAction(
    api.context.communities.startContextCommunityWorkflow,
  );
  const latest = useSessionQuery(api.context.communities.getLatestCommunities, {
    namespace,
  });
  const [starting, setStarting] = useState(false);

  const isActive =
    starting || latest?.status === "pending" || latest?.status === "running";

  async function handleClick() {
    setStarting(true);
    try {
      await startCommunity({ namespace });
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  }

  const btn = (
    <Button disabled={isActive} onClick={handleClick} {...buttonProps}>
      {isActive ? <Spinner /> : null}
      {children}
    </Button>
  );

  if (!tooltip) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
