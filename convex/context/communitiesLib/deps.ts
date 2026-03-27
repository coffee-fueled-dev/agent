import { components } from "../../_generated/api";

export const communityApi = components.context.public.community;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- staging functions are generated after codegen
export const staging = communityApi as Record<string, any>;
export const projectionApi = components.context.public.projection;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- paginated loader available after codegen
export const projApi = projectionApi as Record<string, any>;
