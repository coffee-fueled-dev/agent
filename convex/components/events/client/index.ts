import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type {
  AppendArgs,
  EventEntry,
  EventStreamState,
  EventStreamTemplate,
  EventsConfig,
  ProjectorCheckpoint,
  StreamTypeFor,
} from "../types";

type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

type StreamArgs<Streams extends readonly EventStreamTemplate[]> = {
  streamType: StreamTypeFor<Streams>;
  streamId: string;
};

type EventArgs<Streams extends readonly EventStreamTemplate[]> =
  StreamArgs<Streams> & {
    eventId: string;
  };

export class EventsClient<
  const Streams extends readonly EventStreamTemplate[],
> {
  constructor(
    public component: ComponentApi,
    public config: EventsConfig<Streams>,
  ) {}

  append = {
    appendToStream: async (
      ctx: RunMutationCtx,
      args: AppendArgs<Streams>,
    ): Promise<EventEntry<Streams>> => {
      return await ctx.runMutation(
        this.component.public.append.appendToStream,
        args,
      );
    },
  };

  read = {
    getEvent: async (
      ctx: RunQueryCtx,
      args: EventArgs<Streams>,
    ): Promise<EventEntry<Streams> | null> => {
      return await ctx.runQuery(this.component.public.read.getEvent, args);
    },

    listStreamEvents: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams> & {
        paginationOpts: PaginationOptions;
      },
    ): Promise<PaginationResult<EventEntry<Streams>>> => {
      return await ctx.runQuery(
        this.component.public.read.listStreamEvents,
        args,
      );
    },

    listCategoryEvents: async (
      ctx: RunQueryCtx,
      args: {
        streamType: StreamTypeFor<Streams>;
        paginationOpts: PaginationOptions;
      },
    ): Promise<PaginationResult<EventEntry<Streams>>> => {
      return await ctx.runQuery(
        this.component.public.read.listCategoryEvents,
        args,
      );
    },
  };

  streams = {
    getStream: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams>,
    ): Promise<EventStreamState<Streams> | null> => {
      return await ctx.runQuery(this.component.public.streams.getStream, args);
    },

    getVersion: async (
      ctx: RunQueryCtx,
      args: StreamArgs<Streams>,
    ): Promise<number> => {
      return await ctx.runQuery(
        this.component.public.streams.getStreamVersion,
        args,
      );
    },
  };

  projectors = {
    claimOrReadCheckpoint: async (
      ctx: RunMutationCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        leaseOwner?: string;
        leaseDurationMs?: number;
      },
    ): Promise<{
      checkpoint: ProjectorCheckpoint<StreamTypeFor<Streams>>;
      claimed: boolean;
    }> => {
      return await ctx.runMutation(
        this.component.public.projectors.claimOrReadCheckpoint,
        args,
      );
    },

    advanceCheckpoint: async (
      ctx: RunMutationCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        lastSequence: number;
        leaseOwner?: string;
        releaseClaim?: boolean;
      },
    ): Promise<ProjectorCheckpoint<StreamTypeFor<Streams>>> => {
      return await ctx.runMutation(
        this.component.public.projectors.advanceCheckpoint,
        args,
      );
    },

    readCheckpoint: async (
      ctx: RunQueryCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
      },
    ): Promise<ProjectorCheckpoint<StreamTypeFor<Streams>> | null> => {
      return await ctx.runQuery(
        this.component.public.projectors.readCheckpoint,
        args,
      );
    },

    listUnprocessed: async (
      ctx: RunQueryCtx,
      args: {
        projector: string;
        streamType: StreamTypeFor<Streams>;
        limit?: number;
      },
    ): Promise<EventEntry<Streams>[]> => {
      return await ctx.runQuery(
        this.component.public.projectors.listUnprocessedEvents,
        args,
      );
    },
  };
}
