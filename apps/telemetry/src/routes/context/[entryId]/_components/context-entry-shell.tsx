"use client";

import { api } from "@backend/api.js";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageSection } from "@/components/layout/page-section";
import { RequiredResult } from "@/components/layout/required-result.js";
import { Button } from "@/components/ui/button";
import { contextList, Link } from "@/navigation/index.js";
import { AppLayout } from "../../../_components/app-layout.js";
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
  const { namespace, sessionNamespaceResolved } = useNamespace();
  const backHref = contextList({ namespace });

  return (
    <AppLayout
      current="context"
      segmentLead={
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href={backHref}>
            <ArrowLeftIcon className="size-4" />
            All Context
          </Link>
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
      <PageSection>
        <NotFoundBoundary fallbackHref={backHref}>
          <RequiredResult
            query={api.context.entryQueries.getContextDetail}
            args={
              sessionNamespaceResolved ? { namespace, entryId } : "skip"
            }
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
    </AppLayout>
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
