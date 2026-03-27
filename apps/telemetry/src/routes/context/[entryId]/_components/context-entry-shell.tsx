import { api } from "@backend/api.js";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageSection } from "@/components/layout/page-section";
import { RequiredResult } from "@/components/layout/required-result.js";
import { Button } from "@/components/ui/button";
import { ContextLayout } from "../../_components/context-layout.js";
import { NamespaceProvider, useNamespace } from "../../_hooks/use-namespace.js";
import { ContextEntryProvider } from "./context-entry-provider";
import type { EntrySegment } from "./entry-path.js";
import { EntrySegmentNav } from "./entry-segment-nav.js";
import { NotFoundBoundary } from "./not-found-boundary.js";

export function ContextEntryShellInner({
  entryId,
  segment,
  children,
}: {
  entryId: string;
  segment: EntrySegment;
  children: ReactNode;
}) {
  const { namespace } = useNamespace();
  const backHref = `/context?namespace=${encodeURIComponent(namespace)}`;

  return (
    <ContextLayout
      current="context"
      segmentLead={
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <a href={backHref}>
            <ArrowLeftIcon className="size-4" />
            All Context
          </a>
        </Button>
      }
      segmentTrail={
        <EntrySegmentNav
          entryId={entryId}
          namespace={namespace}
          current={segment}
        />
      }
    >
      <PageSection className="px-4 py-6 md:px-6">
        <NotFoundBoundary fallbackHref={backHref}>
          <RequiredResult
            query={api.context.entryQueries.getContextDetail}
            args={{ namespace, entryId }}
          >
            {(detail) => (
              <ContextEntryProvider
                detail={detail}
                entryId={entryId}
                namespace={namespace}
              >
                <PageSection.Content>{children}</PageSection.Content>
              </ContextEntryProvider>
            )}
          </RequiredResult>
        </NotFoundBoundary>
      </PageSection>
    </ContextLayout>
  );
}

export function ContextEntryShell({
  entryId,
  segment,
  children,
}: {
  entryId: string;
  segment: EntrySegment;
  children: ReactNode;
}) {
  return (
    <NamespaceProvider>
      <ContextEntryShellInner entryId={entryId} segment={segment}>
        {children}
      </ContextEntryShellInner>
    </NamespaceProvider>
  );
}
