import type { InputChunk } from "@convex-dev/rag";
import type {
  FunctionArgs,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
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

export type AddArgs = Omit<
  Parameters<ContextRag["add"]>[1],
  "text" | "chunks" | "namespace" | "namespaceId"
> & {
  namespace: string;
  namespaceId?: string;
  text: string;
  chunks?: Iterable<InputChunk> | AsyncIterable<InputChunk>;
  legacyEntryId?: string;
};

export type ContextClientConfig = {
  googleApiKey?: string;
};

export type ContextSearchFeature = {
  namespace: string;
  featureId: string;
  sourceSystem: string;
  source:
    | {
        kind: "document";
        document: string;
        documentId: string;
        entryId: string;
        key: string;
        sourceType: "text" | "binary";
      }
    | {
        kind: "content";
        contentId: string;
        sourceType: "text" | "binary";
      };
  title?: string;
  text: string;
  status: "current" | "historical";
  updatedAt: number;
};

export class ContextClient {
  constructor(
    public component: ComponentApi,
    public config: ContextClientConfig = {},
  ) {}

  private rag() {
    return createContextRag(this.config.googleApiKey);
  }

  add = async (
    ctx: RunActionCtx,
    args: AddArgs,
  ): Promise<Awaited<ReturnType<ContextRag["add"]>>> => {
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
    args: Parameters<ContextRag["search"]>[1],
  ) => {
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

  list = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.list.listEntries>,
  ) => {
    return await ctx.runQuery(this.component.public.list.listEntries, args);
  };

  getEntryByLegacyId = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.list.getEntryByLegacyId>,
  ) => {
    return await ctx.runQuery(
      this.component.public.list.getEntryByLegacyId,
      args,
    );
  };

  upsertSearchFeature = async (
    ctx: RunMutationCtx,
    args: {
      namespace: string;
      featureId: string;
      sourceSystem: string;
      source:
        | {
            kind: "document";
            document: string;
            documentId: string;
            entryId: string;
            key: string;
            sourceType: "text" | "binary";
          }
        | {
            kind: "content";
            contentId: string;
            sourceType: "text" | "binary";
          };
      title?: string;
      text: string;
      status: "current" | "historical";
      updatedAt?: number;
    },
  ) => {
    return await ctx.runMutation(
      this.component.public.search.upsertSearchFeature,
      args as never,
    );
  };

  deleteSearchFeature = async (
    ctx: RunMutationCtx,
    args: FunctionArgs<typeof this.component.public.search.deleteSearchFeature>,
  ) => {
    return await ctx.runMutation(
      this.component.public.search.deleteSearchFeature,
      args,
    );
  };

  searchFeatures = async (
    ctx: RunQueryCtx,
    args: FunctionArgs<typeof this.component.public.search.searchFeatures>,
  ): Promise<ContextSearchFeature[]> => {
    return await ctx.runQuery(
      this.component.public.search.searchFeatures,
      args,
    ) as ContextSearchFeature[];
  };

  appendHistory = async (
    ctx: RunMutationCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.history.appendHistoryEntry>,
      "streamType"
    >,
  ) => {
    return await ctx.runMutation(
      this.component.public.history.appendHistoryEntry,
      { streamType: "contextEntry", ...args },
    );
  };

  getVersionChain = async (
    ctx: RunQueryCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.history.getVersionChain>,
      "streamType"
    >,
  ) => {
    return await ctx.runQuery(this.component.public.history.getVersionChain, {
      streamType: "contextEntry",
      ...args,
    });
  };

  listHistoryHeads = async (
    ctx: RunQueryCtx,
    args: Omit<
      FunctionArgs<typeof this.component.public.history.listHistoryHeads>,
      "streamType"
    >,
  ) => {
    return await ctx.runQuery(this.component.public.history.listHistoryHeads, {
      streamType: "contextEntry",
      ...args,
    });
  };
}
