import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { ComponentApi } from "../_generated/component";
import type {
  AccessTemplate,
  FeatureTemplate,
  PolicyConfig,
  RelationTemplate,
} from "../types";

type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type RunMutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation" | "runQuery"
>;

export type ScopeRef = {
  scopeType: string;
  scopeId: string;
};

type AccessResourceType<Templates extends readonly AccessTemplate[]> =
  Templates[number]["resourceType"];

type AccessActionFor<
  Templates extends readonly AccessTemplate[],
  ResourceType extends AccessResourceType<Templates>,
> = Extract<
  Templates[number],
  { resourceType: ResourceType }
>["actions"][number];

type FeatureNamespace<Templates extends readonly FeatureTemplate[]> =
  Templates[number]["namespace"];

type FeatureActionFor<
  Templates extends readonly FeatureTemplate[],
  Namespace extends FeatureNamespace<Templates>,
> = Extract<Templates[number], { namespace: Namespace }>["actions"][number];

export class PolicyClient<
  const AccessTemplates extends readonly AccessTemplate[],
  const FeatureTemplates extends readonly FeatureTemplate[],
  const ScopeTypes extends readonly string[],
  const RelationTemplates extends readonly RelationTemplate[],
> {
  constructor(
    public component: ComponentApi,
    public config: PolicyConfig<
      AccessTemplates,
      FeatureTemplates,
      ScopeTypes,
      RelationTemplates
    >,
  ) {}

  scopes = {
    register: async (
      ctx: RunMutationCtx,
      args: {
        scope: ScopeRef;
        attrs?: Record<string, string | number | boolean | null>;
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(this.component.public.scopes.register, args);
    },
    link: async (
      ctx: RunMutationCtx,
      args: {
        from: ScopeRef;
        to: ScopeRef;
        relation: RelationTemplates[number]["relation"];
        attrs?: Record<string, string | number | boolean | null>;
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(this.component.public.scopes.link, args);
    },
    unlink: async (
      ctx: RunMutationCtx,
      args: {
        from: ScopeRef;
        to: ScopeRef;
        relation: RelationTemplates[number]["relation"];
      },
    ) => {
      return await ctx.runMutation(this.component.public.scopes.unlink, args);
    },
    resolve: async (
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        relations?: RelationTemplates[number]["relation"][];
      },
    ) => {
      return await ctx.runQuery(this.component.public.scopes.resolve, args);
    },
    listNodes: async (
      ctx: RunQueryCtx,
      args?: { scopeType?: ScopeTypes[number] },
    ) => {
      return await ctx.runQuery(
        this.component.public.scopes.listNodes,
        args ?? {},
      );
    },
    listEdges: async (
      ctx: RunQueryCtx,
      args?: {
        subject?: ScopeRef;
        relation?: RelationTemplates[number]["relation"];
      },
    ) => {
      return await ctx.runQuery(
        this.component.public.scopes.listEdges,
        args ?? {},
      );
    },
  };

  access = {
    grant: async <ResourceType extends AccessResourceType<AccessTemplates>>(
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        resourceType: ResourceType;
        resourceId: string | null;
        action: AccessActionFor<AccessTemplates, ResourceType>;
        effect: "allow" | "deny";
        activeTime?: number | null;
        expiredTime?: number | null;
        attrs?: Record<string, string | number | boolean | null>;
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(this.component.public.access.grant, args);
    },
    revoke: async <ResourceType extends AccessResourceType<AccessTemplates>>(
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        resourceType: ResourceType;
        resourceId: string | null;
        action: AccessActionFor<AccessTemplates, ResourceType>;
        effect?: "allow" | "deny";
      },
    ) => {
      return await ctx.runMutation(this.component.public.access.revoke, args);
    },
    replaceSubjectPolicies: async (
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        policies: {
          [ResourceType in AccessResourceType<AccessTemplates>]: {
            resourceType: ResourceType;
            resourceId: string | null;
            action: AccessActionFor<AccessTemplates, ResourceType>;
            effect: "allow" | "deny";
            activeTime?: number | null;
            expiredTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
          };
        }[AccessResourceType<AccessTemplates>][];
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(
        this.component.public.access.replaceSubjectPolicies,
        args,
      );
    },
    check: async <ResourceType extends AccessResourceType<AccessTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        resourceType: ResourceType;
        resourceId: string | null;
        action: AccessActionFor<AccessTemplates, ResourceType>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(this.component.public.access.check, args);
    },
    explain: async <ResourceType extends AccessResourceType<AccessTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        resourceType: ResourceType;
        resourceId: string | null;
        action: AccessActionFor<AccessTemplates, ResourceType>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(this.component.public.access.explain, args);
    },
    require: async <ResourceType extends AccessResourceType<AccessTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        resourceType: ResourceType;
        resourceId: string | null;
        action: AccessActionFor<AccessTemplates, ResourceType>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(
        this.component.public.access.requireAccess,
        args,
      );
    },
    listBySubject: async (ctx: RunQueryCtx, args: { subject: ScopeRef }) => {
      return await ctx.runQuery(
        this.component.public.access.listBySubject,
        args,
      );
    },
    listByResource: async <
      ResourceType extends AccessResourceType<AccessTemplates>,
    >(
      ctx: RunQueryCtx,
      args: { resourceType: ResourceType; resourceId: string | null },
    ) => {
      return await ctx.runQuery(
        this.component.public.access.listByResource,
        args,
      );
    },
  };

  features = {
    entitle: async <Namespace extends FeatureNamespace<FeatureTemplates>>(
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        namespace: Namespace;
        action: FeatureActionFor<FeatureTemplates, Namespace>;
        effect: "allow" | "deny";
        activeTime?: number | null;
        expiredTime?: number | null;
        attrs?: Record<string, string | number | boolean | null>;
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(
        this.component.public.features.entitle,
        args,
      );
    },
    revoke: async <Namespace extends FeatureNamespace<FeatureTemplates>>(
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        namespace: Namespace;
        action: FeatureActionFor<FeatureTemplates, Namespace>;
        effect?: "allow" | "deny";
      },
    ) => {
      return await ctx.runMutation(this.component.public.features.revoke, args);
    },
    replaceSubjectEntitlements: async (
      ctx: RunMutationCtx,
      args: {
        subject: ScopeRef;
        policies: {
          [Namespace in FeatureNamespace<FeatureTemplates>]: {
            namespace: Namespace;
            action: FeatureActionFor<FeatureTemplates, Namespace>;
            effect: "allow" | "deny";
            activeTime?: number | null;
            expiredTime?: number | null;
            attrs?: Record<string, string | number | boolean | null>;
          };
        }[FeatureNamespace<FeatureTemplates>][];
        update?: {
          byType: string;
          byId: string;
          reason?: string;
          source?: string;
        };
      },
    ) => {
      return await ctx.runMutation(
        this.component.public.features.replaceSubjectEntitlements,
        args,
      );
    },
    check: async <Namespace extends FeatureNamespace<FeatureTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        namespace: Namespace;
        action: FeatureActionFor<FeatureTemplates, Namespace>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(this.component.public.features.check, args);
    },
    explain: async <Namespace extends FeatureNamespace<FeatureTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        namespace: Namespace;
        action: FeatureActionFor<FeatureTemplates, Namespace>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(this.component.public.features.explain, args);
    },
    require: async <Namespace extends FeatureNamespace<FeatureTemplates>>(
      ctx: RunQueryCtx,
      args: {
        subject: ScopeRef;
        namespace: Namespace;
        action: FeatureActionFor<FeatureTemplates, Namespace>;
        at?: number;
      },
    ) => {
      return await ctx.runQuery(
        this.component.public.features.requireEntitlement,
        args,
      );
    },
    listBySubject: async (ctx: RunQueryCtx, args: { subject: ScopeRef }) => {
      return await ctx.runQuery(
        this.component.public.features.listBySubject,
        args,
      );
    },
    listByNamespace: async <
      Namespace extends FeatureNamespace<FeatureTemplates>,
    >(
      ctx: RunQueryCtx,
      args: { namespace: Namespace },
    ) => {
      return await ctx.runQuery(
        this.component.public.features.listByNamespace,
        args,
      );
    },
  };
}
