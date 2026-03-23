import type { InputChunk, RAG } from "@convex-dev/rag";
import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import { createContextRag } from "../internal/rag";

type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction"> &
  RunMutationCtx;
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;

const TEXT_PREVIEW_LENGTH = 280;

type RagAddArgs = Parameters<RAG["add"]>[1];
type RagEntryFields = Omit<
  RagAddArgs,
  "text" | "chunks" | "namespace" | "namespaceId"
>;
type RagSearchArgs = Parameters<RAG["search"]>[1];

export type AddArgs = RagEntryFields & {
  namespace: string;
  namespaceId?: string;
  text: string;
  chunks?: Iterable<InputChunk> | AsyncIterable<InputChunk>;
};
export type AddResult = Awaited<ReturnType<RAG["add"]>>;
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
    const { text, chunks: providedChunks, ...rest } = args;
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
}
