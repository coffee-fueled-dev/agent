import { z } from "zod/v4";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

type IdentityRunner = Pick<ActionCtx, "runMutation" | "runQuery">;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type RegisteredMachineAgent<STATIC_PROPS = unknown> = {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
  getStaticIdentityInput: () => STATIC_PROPS;
  getRuntimeIdentityInput: (runtimeStaticProps?: unknown) => unknown;
};

const identityRegistryApi = internal.llms.identityRegistry;

export function defineRegisteredMachineAgent<STATIC_PROPS>(args: {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
}) {
  return {
    agentId: args.agentId,
    name: args.name,
    staticProps: args.staticProps,
    getStaticIdentityInput: () => args.staticProps,
    getRuntimeIdentityInput: (runtimeStaticProps?: unknown) =>
      runtimeStaticProps ?? args.staticProps,
  } satisfies RegisteredMachineAgent<STATIC_PROPS>;
}

function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value;
}

function normalizeValue(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (isZodSchema(value)) {
    return normalizeValue(z.toJSONSchema(value));
  }
  if (typeof value === "function") {
    return `[function:${value.name || "anonymous"}]`;
  }
  if (typeof value === "object") {
    if ("id" in value && "query" in value) {
      return String(value.id);
    }
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeValue(entryValue)] as const);
    return Object.fromEntries(entries);
  }
  return String(value);
}

export function normalizeStaticProps(value: unknown) {
  return normalizeValue(value);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) =>
    part.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashIdentityInput(value: unknown) {
  return await sha256Hex(JSON.stringify(normalizeStaticProps(value)));
}

export async function recordRegisteredMachineAgentTurn(
  ctx: IdentityRunner,
  args: {
    definition: RegisteredMachineAgent;
    runtimeStaticProps?: unknown;
    threadId: string;
    messageId: string;
    sessionId?: string;
  },
) {
  const staticSnapshot = normalizeStaticProps(
    args.definition.getStaticIdentityInput(),
  );
  const runtimeSnapshot = normalizeStaticProps(
    args.definition.getRuntimeIdentityInput(args.runtimeStaticProps),
  );
  const staticHash = await hashIdentityInput(staticSnapshot);
  const runtimeHash = await hashIdentityInput(runtimeSnapshot);

  const recorded = await ctx.runMutation(
    identityRegistryApi.recordTurnIdentity,
    {
      codeId: args.definition.agentId,
      name: args.definition.name,
      staticHash,
      staticSnapshot,
      runtimeHash,
      runtimeSnapshot,
      threadId: args.threadId,
      messageId: args.messageId,
      sessionId: args.sessionId,
    },
  );

  return {
    ...recorded,
    staticHash,
    runtimeHash,
    staticSnapshot,
    runtimeSnapshot,
  };
}
