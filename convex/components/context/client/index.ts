import type { InputChunk } from "@convex-dev/rag";
import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import { createContextRag } from "../internal/rag";

type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction"> &
  RunMutationCtx;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

const TEXT_PREVIEW_LENGTH = 280;

type ContextRag = ReturnType<typeof createContextRag>;
type RagAddArgs = Parameters<ContextRag["add"]>[1];
type RagEntryFields = Omit<
  RagAddArgs,
  "text" | "chunks" | "namespace" | "namespaceId"
>;
type RagSearchArgs = Parameters<ContextRag["search"]>[1];

export type AddArgs = RagEntryFields & {
  namespace: string;
  namespaceId?: string;
  text: string;
  chunks?: Iterable<InputChunk> | AsyncIterable<InputChunk>;
  legacyEntryId?: string;
};
export type AddResult = Awaited<ReturnType<ContextRag["add"]>>;
export type SearchArgs = RagSearchArgs;

export type ListArgs = {
  namespace: string;
  paginationOpts: PaginationOptions;
};

export type ContextSearchResult = {
  entryId: string;
  key: string;
  title?: string;
  text: string;
  importance: number;
  score: number;
  metadata?: Record<string, unknown>;
};

export type ContextClientConfig = {
  googleApiKey?: string;
};

export class ContextClient {
  constructor(
    public component: ComponentApi,
    public config: ContextClientConfig = {},
  ) {}

  private rag() {
    return createContextRag(this.config.googleApiKey);
  }

  add = async (ctx: RunActionCtx, args: AddArgs): Promise<AddResult> => {
    const { text, chunks: providedChunks, legacyEntryId, ...rest } = args;
    const chunks = providedChunks ?? [
      text,
      ...(rest.title ? [rest.title] : []),
    ];

    const result = await this.rag().add(ctx, {
      ...rest,
      chunks,
    });

    await ctx.runMutation(this.component.public.add.insertEntry, {
      namespace: args.namespace,
      entryId: result.entryId,
      key: args.key ?? result.entryId,
      title: args.title,
      textPreview: text.slice(0, TEXT_PREVIEW_LENGTH),
      legacyEntryId,
      createdAt: Date.now(),
    });

    return result;
  };

  search = async (
    ctx: RunActionCtx,
    args: SearchArgs,
  ): Promise<ContextSearchResult[]> => {
    const { entries, results } = await this.rag().search(ctx, args);

    return entries.map((entry) => ({
      entryId: entry.entryId,
      key: entry.key ?? entry.entryId,
      title: entry.title,
      text: entry.text,
      importance: entry.importance,
      score: results
        .filter((r) => r.entryId === entry.entryId)
        .reduce((max, r) => Math.max(max, r.score), 0),
      metadata: entry.metadata,
    }));
  };

  list = async (ctx: RunQueryCtx, args: ListArgs) => {
    return await ctx.runQuery(this.component.public.list.listEntries, args);
  };

  getEntryByLegacyId = async (
    ctx: RunQueryCtx,
    args: { namespace: string; legacyEntryId: string },
  ) => {
    return await ctx.runQuery(
      this.component.public.list.getEntryByLegacyId,
      args,
    );
  };

  appendHistory = async (
    ctx: RunMutationCtx,
    args: {
      streamId: string;
      entryId: string;
      kind: "created" | "edited";
      payload?: unknown;
      parentEntryIds?: string[];
      entryTime?: number;
    },
  ) => {
    return await ctx.runMutation(
      this.component.public.history.appendHistoryEntry,
      { streamType: "contextEntry", ...args },
    );
  };

  getVersionChain = async (
    ctx: RunQueryCtx,
    args: { streamId: string; entryId: string },
  ) => {
    return await ctx.runQuery(
      this.component.public.history.getVersionChain,
      { streamType: "contextEntry", ...args },
    );
  };

  listHistoryHeads = async (
    ctx: RunQueryCtx,
    args: { streamId: string },
  ) => {
    return await ctx.runQuery(
      this.component.public.history.listHistoryHeads,
      { streamType: "contextEntry", ...args },
    );
  };
}
