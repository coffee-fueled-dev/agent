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

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer I) => void
  ? I
  : never;

export type ExtractComposableTools<T> = T extends Composable<
  infer _,
  infer TOOLS
>
  ? TOOLS
  : never;

type ExactToolMap<T> = {
  [K in keyof T]: Extract<T[K], ToolSpec>;
};

type MergeToolMaps<T> = [T] extends [never]
  ? Record<never, never>
  : Simplify<ExactToolMap<UnionToIntersection<T>>>;

export type ToolMapFromMembers<MEMBERS extends readonly Composable[]> =
  MergeToolMaps<ExtractComposableTools<MEMBERS[number]>>;

type KeyedStaticProps<MEMBERS extends readonly Composable[]> = {
  [M in MEMBERS[number] as M["staticProps"] extends { name: infer N extends string }
    ? N
    : never]: M["staticProps"];
};

export type ToolkitStaticProps<
  NAME extends string,
  MEMBERS extends readonly Composable[],
> = {
  kind: "toolkit";
  name: NAME;
  instructions: string[] | undefined;
  members: KeyedStaticProps<MEMBERS>;
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
  const MEMBERS extends readonly Composable[],
  Env = unknown,
>(
  members: MEMBERS,
  options: { name: NAME; instructions?: string[] },
): Composable<
  ToolkitStaticProps<NAME, MEMBERS>,
  ToolMapFromMembers<MEMBERS>,
  Env
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

  async function evaluate(
    ctx: ToolkitContext<Env>,
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

export function dynamicToolkit<
  const NAME extends string,
  Env = unknown,
>({
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

  const staticProps = {
    kind: "dynamicToolkit" as const,
    name,
    instructions,
    policies,
  };

  async function evaluate(
    ctx: ToolkitContext<Env>,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<Record<string, ToolSpec>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    for (const policy of policies) {
      const ok =
        resolved.get(policy) ?? (await policy.evaluate(ctx.env));
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
