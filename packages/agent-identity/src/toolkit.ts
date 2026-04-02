import { hashPlainObject } from "./hash.js";
import type {
  Composable,
  PolicyResultMap,
  SharedPolicy,
  ToolkitContext,
  ToolkitResult,
  ToolSpec,
} from "./types.js";

export type AnyComposable<Env = unknown> = Composable<
  { kind: string; name: string },
  Record<string, ToolSpec>,
  Env
>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};
// biome-ignore lint/suspicious/noExplicitAny: required to express "any env" while preserving member inference
type AnyEnv = any;

type UnionToIntersection<T> = (
  T extends unknown
    ? (value: T) => void
    : never
) extends (value: infer I) => void
  ? I
  : never;

export type ExtractComposableTools<T> =
  T extends Composable<infer _, infer TOOLS> ? TOOLS : never;

export type ExtractComposableEnv<T> =
  T extends Composable<infer _, infer __, infer Env> ? Env : never;

type ExactToolMap<T> = {
  [K in keyof T]: Extract<T[K], ToolSpec>;
};

type MergeToolMaps<T> = [T] extends [never]
  ? Record<never, never>
  : Simplify<ExactToolMap<UnionToIntersection<T>>>;

export type ToolMapFromMembers<
  MEMBERS extends readonly AnyComposable<AnyEnv>[],
> = MergeToolMaps<ExtractComposableTools<MEMBERS[number]>>;

export type EnvFromMembers<MEMBERS extends readonly AnyComposable<AnyEnv>[]> =
  ExtractComposableEnv<MEMBERS[number]>;

type KeyedStaticProps<MEMBERS extends readonly AnyComposable<AnyEnv>[]> = {
  [M in MEMBERS[number] as M["staticProps"] extends {
    name: infer N extends string;
  }
    ? N
    : never]: M["staticProps"];
};

export type ToolkitStaticProps<
  NAME extends string,
  MEMBERS extends readonly AnyComposable<AnyEnv>[],
> = {
  kind: "toolkit";
  name: NAME;
  instructions: string[] | undefined;
  members: KeyedStaticProps<MEMBERS>;
};

/** Toolkit / nested composable nodes expose child composables for static hash collection. */
export type ComposableWithChildren<Env = unknown> = AnyComposable<Env> & {
  childComposables?: readonly AnyComposable<Env>[];
};

async function resolvePolicies<Env>(
  policies: SharedPolicy[],
  ctx: ToolkitContext<Env>,
  resolved: PolicyResultMap,
): Promise<void> {
  const unresolved = policies.filter((p) => !resolved.has(p));
  const unique = [...new Set(unresolved)];
  await Promise.all(
    unique.map(async (p) => {
      const ok = await p.evaluate(ctx.env);
      resolved.set(p, ok);
    }),
  );
}

export function toolkit<
  const NAME extends string,
  const MEMBERS extends readonly AnyComposable<AnyEnv>[],
>(
  members: MEMBERS,
  options: { name: NAME; instructions?: string[] },
): ComposableWithChildren<EnvFromMembers<MEMBERS>> &
  Composable<
    ToolkitStaticProps<NAME, MEMBERS>,
    ToolMapFromMembers<MEMBERS>,
    EnvFromMembers<MEMBERS>
  > {
  const policies = members.flatMap((m) => m.policies);

  const staticProps = {
    kind: "toolkit" as const,
    name: options.name as NAME,
    instructions: options.instructions,
    members: Object.fromEntries(
      members.map((m) => [m.staticProps.name, m.staticProps]),
    ) as KeyedStaticProps<MEMBERS>,
  };

  async function computeStaticHash(): Promise<string> {
    const memberPairs = await Promise.all(
      members.map(async (m) => ({
        name: m.staticProps.name,
        hash: await m.computeStaticHash(),
      })),
    );
    memberPairs.sort((a, b) => a.name.localeCompare(b.name));
    return hashPlainObject({
      kind: "toolkit",
      name: options.name,
      instructions: options.instructions ?? null,
      members: memberPairs.map((p) => ({ name: p.name, hash: p.hash })),
    });
  }

  async function evaluate(
    ctx: ToolkitContext<EnvFromMembers<MEMBERS>>,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<ToolMapFromMembers<MEMBERS>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    await resolvePolicies(policies, ctx, resolved);

    const results = await Promise.all(
      members.map((m) => m.evaluate(ctx, resolved)),
    );
    const mergedTools = Object.assign(
      {} as ToolMapFromMembers<MEMBERS>,
      ...results.map((r) => r.tools),
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
    };
  }

  return {
    staticProps,
    policies,
    evaluate,
    computeStaticHash,
    childComposables: members,
  };
}

export function dynamicToolkit<const NAME extends string, Env = unknown>({
  name,
  policies: policiesConfig,
  instructions,
  create,
}: {
  name: NAME;
  policies?: SharedPolicy[];
  instructions?: string[];
  create: (ctx: ToolkitContext<Env>) => Promise<AnyComposable<Env>[]>;
}): Composable<
  {
    kind: "dynamicToolkit";
    name: NAME;
    instructions: string[] | undefined;
    policies: SharedPolicy[];
  },
  Record<string, ToolSpec>,
  Env
> {
  const policies = policiesConfig ?? [];
  const policyIds = [...policies.map((p) => p.id)].sort((a, b) =>
    a.localeCompare(b),
  );

  const staticProps = {
    kind: "dynamicToolkit" as const,
    name,
    instructions,
    policies,
  };

  async function computeStaticHash(): Promise<string> {
    return hashPlainObject({
      kind: "dynamicToolkit",
      name,
      instructions: instructions ?? null,
      policies: policyIds,
    });
  }

  async function evaluate(
    ctx: ToolkitContext<Env>,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<Record<string, ToolSpec>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    for (const policy of policies) {
      const ok = resolved.get(policy) ?? (await policy.evaluate(ctx.env));
      resolved.set(policy, ok);
      if (!ok) {
        return { tools: {}, instructions: "" };
      }
    }

    const members = await create(ctx);

    const memberPolicies = members.flatMap((m) => m.policies);
    await resolvePolicies(memberPolicies, ctx, resolved);

    const results = await Promise.all(
      members.map((m) => m.evaluate(ctx, resolved)),
    );
    const mergedTools = Object.assign(
      {} as Record<string, ToolSpec>,
      ...results.map((r) => r.tools),
    );
    const hasAnyTool = results.some((r) => Object.keys(r.tools).length > 0);
    return {
      tools: mergedTools,
      instructions: hasAnyTool
        ? [...(instructions ?? []), ...results.map((r) => r.instructions)]
            .filter(Boolean)
            .join("\n\n")
        : "",
    };
  }

  return { staticProps, policies, evaluate, computeStaticHash };
}

export async function evaluateComposable<Env>(
  composable: Composable<
    { kind: string; name: string },
    Record<string, ToolSpec>,
    Env
  >,
  ctx: ToolkitContext<Env>,
): Promise<ToolkitResult<Record<string, ToolSpec>>> {
  return composable.evaluate(ctx);
}
