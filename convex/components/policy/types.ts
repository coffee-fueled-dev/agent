export type AccessTemplate = {
  resourceType: string;
  actions: readonly string[];
};

export type FeatureTemplate = {
  namespace: string;
  actions: readonly string[];
};

export type RelationTemplate = {
  relation: string;
  from: string;
  to: string;
  traversable?: boolean;
};

export type PolicyConfig<
  AccessTemplates extends readonly AccessTemplate[] = readonly AccessTemplate[],
  FeatureTemplates extends
    readonly FeatureTemplate[] = readonly FeatureTemplate[],
  ScopeTypes extends readonly string[] = readonly string[],
  RelationTemplates extends
    readonly RelationTemplate[] = readonly RelationTemplate[],
> = {
  accessTemplates: AccessTemplates;
  featureTemplates: FeatureTemplates;
  scopeTypes: ScopeTypes;
  relationTemplates: RelationTemplates;
};
