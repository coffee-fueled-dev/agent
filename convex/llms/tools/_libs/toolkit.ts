import { createTool } from "@convex-dev/agent";
import type { Tool, ToolCallOptions } from "ai";
import type { FunctionReference } from "convex/server";
import { scheduleThreadToolTelemetry } from "../../../chat/toolTelemetry";
import type {
  ThreadToolTelemetryScheduleArgs,
  ToolExecutionContext,
  ToolkitContext,
  ToolPolicyArgs,
} from "./customFunctions";

export type ToolErrorOutput = {
  ok: false;
  error: string;
};

export type ToolSuccessOutput<
  DATA extends Record<string, unknown> | undefined = undefined,
> = {
  ok: true;
  data?: DATA;
};

export type ToolOutput<
  DATA extends Record<string, unknown> | undefined = undefined,
> = ToolErrorOutput | ToolSuccessOutput<DATA>;

export type EffectiveStaticProps = Record<string, unknown>;

export type ToolkitResult<
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> = {
  tools: TOOLS;
  instructions: string;
  effectiveStaticProps?: EffectiveStaticProps;
};

export function sharedPolicy(
  query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
  id = "unknown-policy",
) {
  return { id, query };
}

export type SharedPolicy = ReturnType<typeof sharedPolicy>;

type PolicyResultMap = Map<SharedPolicy, boolean>;

function emitPolicyLifecycle(
  ctx: ToolkitContext,
  policy: SharedPolicy,
  phase: "start" | "result",
  ok?: boolean,
) {
  const st = ctx.scheduleTelemetry;
  const tc = ctx.toolContext;
  if (!st || !tc) return;
  const base = `${tc.messageId}:${policy.id}`;
  if (phase === "start") {
    const ev: ThreadToolTelemetryScheduleArgs = {
      eventType: "policy_eval_started",
      eventId: `${base}:policy_start`,
      payload: { policyId: policy.id },
    };
    st(ev);
  } else {
    const ev: ThreadToolTelemetryScheduleArgs = {
      eventType: "policy_eval_result",
      eventId: `${base}:policy_result`,
      payload: { policyId: policy.id, ok: ok ?? false },
    };
    st(ev);
  }
}

function wrapToolHandlerWithTelemetry<INPUT, OUTPUT>(
  toolName: string,
  namespace: string,
  handler: (
    ctx: ToolExecutionContext,
    args: INPUT,
    options: ToolCallOptions,
  ) => Promise<OUTPUT> | AsyncIterable<OUTPUT>,
) {
  return async (
    ctx: ToolExecutionContext,
    args: INPUT,
    options: ToolCallOptions,
  ) => {
    const base = `${ctx.messageId}:${toolName}`;
    scheduleThreadToolTelemetry(ctx, {
      namespace,
      streamId: ctx.threadId,
      eventId: `${base}:tool_start`,
      eventType: "tool_started",
      payload: { toolName, messageId: ctx.messageId },
      metadata: {
        messageId: ctx.messageId,
        sessionId: ctx.sessionId,
      },
      session: ctx.sessionId,
    });
    try {
      const result = await handler(ctx, args, options);
      scheduleThreadToolTelemetry(ctx, {
        namespace,
        streamId: ctx.threadId,
        eventId: `${base}:tool_ok`,
        eventType: "tool_succeeded",
        payload: { toolName, messageId: ctx.messageId },
        metadata: {
          messageId: ctx.messageId,
          sessionId: ctx.sessionId,
        },
        session: ctx.sessionId,
      });
      return result;
    } catch (e) {
      scheduleThreadToolTelemetry(ctx, {
        namespace,
        streamId: ctx.threadId,
        eventId: `${base}:tool_fail`,
        eventType: "tool_failed",
        payload: {
          toolName,
          messageId: ctx.messageId,
          error: e instanceof Error ? e.message : String(e),
        },
        metadata: {
          messageId: ctx.messageId,
          sessionId: ctx.sessionId,
        },
        session: ctx.sessionId,
      });
      throw e;
    }
  };
}

export type DynamicToolDef<
  NAME extends string = string,
  ARGS = unknown,
  TOOL extends Tool = Tool,
> = {
  staticProps: {
    kind: "tool";
    name: NAME;
    description: string | undefined;
    args: ARGS;
    policies: SharedPolicy[];
    instructions: string[] | undefined;
  };
  policies: SharedPolicy[];
  evaluate: (
    ctx: ToolkitContext,
    resolvedPolicies?: PolicyResultMap,
  ) => Promise<ToolkitResult<Record<NAME, TOOL>>>;
};

export type Composable<
  STATIC_PROPS extends { kind: string; name: string } = {
    kind: string;
    name: string;
  },
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> = {
  staticProps: STATIC_PROPS;
  policies: SharedPolicy[];
  evaluate: (
    ctx: ToolkitContext,
    resolvedPolicies?: PolicyResultMap,
  ) => Promise<ToolkitResult<TOOLS>>;
};

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type UnionToIntersection<T> = (
  T extends unknown
    ? (value: T) => void
    : never
) extends (value: infer I) => void
  ? I
  : never;

export type ExtractComposableTools<T> =
  T extends Composable<infer _, infer TOOLS> ? TOOLS : never;

type ExactToolMap<T> = {
  [K in keyof T]: Extract<T[K], Tool>;
};

type MergeToolMaps<T> = [T] extends [never]
  ? Record<never, never>
  : Simplify<ExactToolMap<UnionToIntersection<T>>>;

export type ToolMapFromMembers<MEMBERS extends readonly Composable[]> =
  MergeToolMaps<ExtractComposableTools<MEMBERS[number]>>;

export type ToolMapFromRegistry<REGISTRY extends Record<string, Composable>> =
  MergeToolMaps<ExtractComposableTools<REGISTRY[keyof REGISTRY]>>;

type KeyedStaticProps<MEMBERS extends readonly Composable[]> = {
  [M in MEMBERS[number] as M["staticProps"] extends {
    name: infer N extends string;
  }
    ? N
    : never]: M["staticProps"];
};

type ToolkitStaticProps<
  NAME extends string,
  MEMBERS extends readonly Composable[],
> = {
  kind: "toolkit";
  name: NAME;
  instructions: string[] | undefined;
  members: KeyedStaticProps<MEMBERS>;
};

export function dynamicTool<NAME extends string, INPUT, OUTPUT, ARGS>({
  name,
  policies: policiesConfig,
  description,
  args,
  instructions,
  telemetry,
  telemetryNamespace,
  ...toolArgs
}: Parameters<typeof createTool<INPUT, OUTPUT, ToolExecutionContext>>[0] & {
  name: NAME;
  args: ARGS;
  policies?: SharedPolicy[];
  instructions?: string[];
  /** When true, wraps handler with tool lifecycle telemetry using `ToolkitContext.namespace` (or `telemetryNamespace` override). */
  telemetry?: boolean;
  /** Optional override; defaults to `ctx.namespace` from `createToolkitContext`. */
  telemetryNamespace?: string;
}): DynamicToolDef<NAME, ARGS, Tool<INPUT, OUTPUT>> {
  const policies = policiesConfig ?? [];
  const rawHandler = toolArgs.handler;

  async function evaluate(
    ctx: ToolkitContext,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<Record<NAME, Tool<INPUT, OUTPUT>>>> {
    const resolvedNamespace = (
      telemetryNamespace ??
      ctx.namespace ??
      ""
    ).trim();
    if (telemetry && !resolvedNamespace) {
      throw new Error(
        `dynamicTool "${name}": telemetry requires ToolkitContext.namespace (or telemetryNamespace override)`,
      );
    }
    const useToolTelemetry = Boolean(telemetry) && resolvedNamespace.length > 0;

    for (const policy of policies) {
      emitPolicyLifecycle(ctx, policy, "start");
      const ok =
        resolvedPolicies?.get(policy) ??
        (await ctx.runPolicyQuery(policy.query));
      emitPolicyLifecycle(ctx, policy, "result", ok);
      if (!ok)
        return {
          tools: {} as Record<NAME, Tool<INPUT, OUTPUT>>,
          instructions: "",
        };
    }

    const innerHandler = rawHandler as (
      ctx: ToolExecutionContext,
      args: INPUT,
      options: ToolCallOptions,
    ) => Promise<OUTPUT> | AsyncIterable<OUTPUT>;

    const withNamespace = (
      execCtx: ToolExecutionContext,
      args: INPUT,
      options: ToolCallOptions,
    ) =>
      innerHandler({ ...execCtx, namespace: resolvedNamespace }, args, options);

    const handler = (
      useToolTelemetry
        ? wrapToolHandlerWithTelemetry<INPUT, OUTPUT>(
            name,
            resolvedNamespace,
            withNamespace,
          )
        : withNamespace
    ) as typeof rawHandler;

    const tool = createTool<INPUT, OUTPUT, ToolExecutionContext>({
      description,
      args,
      ...toolArgs,
      handler,
    });

    return {
      tools: { [name]: tool } as Record<NAME, Tool<INPUT, OUTPUT>>,
      instructions: (instructions ?? []).join("\n\n"),
      effectiveStaticProps: staticProps,
    };
  }

  const staticProps = {
    kind: "tool" as const,
    name,
    description,
    args,
    policies,
    instructions,
  };

  return {
    staticProps,
    policies,
    evaluate,
  };
}

export function toolkit<
  const NAME extends string,
  const MEMBERS extends readonly Composable[],
>(
  members: MEMBERS,
  options: { name: NAME; instructions?: string[] },
): Composable<ToolkitStaticProps<NAME, MEMBERS>, ToolMapFromMembers<MEMBERS>> {
  const policies = members.flatMap((m) => m.policies);

  const staticProps = {
    kind: "toolkit" as const,
    name: options.name as NAME,
    instructions: options.instructions,
    members: Object.fromEntries(
      members.map((m) => [m.staticProps.name, m.staticProps]),
    ) as KeyedStaticProps<MEMBERS>,
  };

  async function evaluate(
    ctx: ToolkitContext,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<ToolMapFromMembers<MEMBERS>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    const unresolved = policies.filter((p) => !resolved.has(p));
    const unique = [...new Set(unresolved)];
    await Promise.all(
      unique.map(async (p) => {
        emitPolicyLifecycle(ctx, p, "start");
        const ok = await ctx.runPolicyQuery(p.query);
        emitPolicyLifecycle(ctx, p, "result", ok);
        resolved.set(p, ok);
      }),
    );

    const results = await Promise.all(
      members.map((m) => m.evaluate(ctx, resolved)),
    );
    const mergedTools = Object.assign(
      {} as ToolMapFromMembers<MEMBERS>,
      ...results.map((r) => r.tools),
    );
    const effectiveMembers = Object.fromEntries(
      results.flatMap((result) =>
        result.effectiveStaticProps
          ? [
              [
                result.effectiveStaticProps.name as string,
                result.effectiveStaticProps,
              ] as const,
            ]
          : [],
      ),
    );
    const hasAnyTool = results.some((r) => Object.keys(r.tools).length > 0);
    return {
      tools: mergedTools,
      instructions: hasAnyTool
        ? [
            ...(options?.instructions ?? []),
            ...results.map((r) => r.instructions),
          ]
            .filter(Boolean)
            .join("\n\n")
        : "",
      effectiveStaticProps: {
        kind: "toolkit",
        name: options.name,
        instructions: options.instructions,
        members: effectiveMembers,
      },
    };
  }

  return { staticProps, policies, evaluate };
}

export function dynamicToolkit<const NAME extends string>({
  name,
  policies: policiesConfig,
  instructions,
  create,
}: {
  name: NAME;
  policies?: SharedPolicy[];
  instructions?: string[];
  create: (ctx: ToolkitContext) => Promise<Composable[]>;
}) {
  const policies = policiesConfig ?? [];

  const staticProps = {
    kind: "dynamicToolkit" as const,
    name,
    instructions,
    policies,
  } as {
    kind: "dynamicToolkit";
    name: NAME;
    instructions: string[] | undefined;
    policies: SharedPolicy[];
  };

  async function evaluate(
    ctx: ToolkitContext,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<Record<string, Tool>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    for (const policy of policies) {
      emitPolicyLifecycle(ctx, policy, "start");
      const ok =
        resolved.get(policy) ?? (await ctx.runPolicyQuery(policy.query));
      emitPolicyLifecycle(ctx, policy, "result", ok);
      if (!ok) return { tools: {}, instructions: "" };
    }

    const members = await create(ctx);

    const memberPolicies = members.flatMap((m) => m.policies);
    const unresolved = memberPolicies.filter((p) => !resolved.has(p));
    const unique = [...new Set(unresolved)];
    await Promise.all(
      unique.map(async (p) => {
        emitPolicyLifecycle(ctx, p, "start");
        const ok = await ctx.runPolicyQuery(p.query);
        emitPolicyLifecycle(ctx, p, "result", ok);
        resolved.set(p, ok);
      }),
    );

    const results = await Promise.all(
      members.map((m) => m.evaluate(ctx, resolved)),
    );
    const mergedTools = Object.assign(
      {} as Record<string, Tool>,
      ...results.map((r) => r.tools),
    );
    const effectiveMembers = Object.fromEntries(
      results.flatMap((result) =>
        result.effectiveStaticProps
          ? [
              [
                result.effectiveStaticProps.name as string,
                result.effectiveStaticProps,
              ] as const,
            ]
          : [],
      ),
    );
    const hasAnyTool = results.some((r) => Object.keys(r.tools).length > 0);
    return {
      tools: mergedTools,
      instructions: hasAnyTool
        ? [...(instructions ?? []), ...results.map((r) => r.instructions)]
            .filter(Boolean)
            .join("\n\n")
        : "",
      effectiveStaticProps: {
        kind: "dynamicToolkit",
        name,
        instructions,
        policies,
        members: effectiveMembers,
      },
    };
  }

  return { staticProps, policies, evaluate };
}

export async function withFormattedResults<
  DATA extends Record<string, unknown> | undefined = undefined,
>(promise: Promise<DATA>): Promise<ToolOutput<DATA>> {
  try {
    const data = await promise;
    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
