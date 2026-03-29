import type { InferUITool, Tool } from "ai";
import { z } from "zod/v4";
import { internal } from "../../../../_generated/api";
import { machineActor } from "../../../../eventAttribution";
import { chatAgentDefinition } from "../../../agents/assistant/agent";
import {
  dynamicTool,
  toolkit,
  withFormattedResults,
} from "../../_libs/toolkit";

declare module "../../registeredToolMap" {
  interface RegisteredToolMap {
    addContext: InferUITool<Tool>;
    editContext: InferUITool<Tool>;
    deleteContext: InferUITool<Tool>;
  }
}

function addContextTool() {
  return dynamicTool({
    telemetry: true,
    instructions: [
      `Use the addContextTool tool to store memories relevant to the user or to your own experiences. 
      These memories can be retrieved later to help you answer questions or reflect on past events.
      You can store your opinions, preferences, or any other information that you think might be useful for future conversations.
      You can store facts about the user, the world, yourself, or anything else. The text you store can be as long as you want.`,
    ],
    name: "addContext" as const,
    description: "Create a new context entry with text (and optional title).",
    args: z.object({
      text: z.string().describe("Body text for the entry"),
      title: z.string().optional().describe("Short title"),
      observationTime: z
        .number()
        .optional()
        .describe("Unix ms observation time"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const { accountId } = await ctx.runMutation(
            internal.sessionResolve.ensureMachineAccountInternal,
            {
              codeId: chatAgentDefinition.agentId,
              name: chatAgentDefinition.name,
            },
          );
          const key = `chat-${crypto.randomUUID()}`;
          return await ctx.runAction(
            internal.context.mutations.addContextInternal,
            {
              namespace: ctx.namespace,
              key,
              title: args.title,
              text: args.text,
              observationTime: args.observationTime,
              actor: machineActor(accountId),
              session: ctx.sessionId,
              threadId: ctx.threadId,
            },
          );
        })(),
      );
    },
  });
}

function editContextTool() {
  return dynamicTool({
    telemetry: true,
    name: "editContext" as const,
    description: "Edit an existing context entry by entry id.",
    args: z.object({
      entryId: z.string().describe("Context entry id"),
      text: z.string().describe("New body text"),
      title: z.string().optional().describe("New title"),
      observationTime: z.number().optional(),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const { accountId } = await ctx.runMutation(
            internal.sessionResolve.ensureMachineAccountInternal,
            {
              codeId: chatAgentDefinition.agentId,
              name: chatAgentDefinition.name,
            },
          );
          return await ctx.runAction(
            internal.context.mutations.editContextInternal,
            {
              namespace: ctx.namespace,
              entryId: args.entryId,
              title: args.title,
              text: args.text,
              observationTime: args.observationTime,
              actor: machineActor(accountId),
              session: ctx.sessionId,
              threadId: ctx.threadId,
            },
          );
        })(),
      );
    },
  });
}

function deleteContextTool() {
  return dynamicTool({
    telemetry: true,
    name: "deleteContext" as const,
    description: "Delete a context entry by entry id.",
    args: z.object({
      entryId: z.string().describe("Context entry id to delete"),
    }),
    handler: async (ctx, args) => {
      return await withFormattedResults(
        (async () => {
          const { accountId } = await ctx.runMutation(
            internal.sessionResolve.ensureMachineAccountInternal,
            {
              codeId: chatAgentDefinition.agentId,
              name: chatAgentDefinition.name,
            },
          );
          await ctx.runAction(
            internal.context.mutations.deleteContextInternal,
            {
              namespace: ctx.namespace,
              entryId: args.entryId,
              actor: machineActor(accountId),
              session: ctx.sessionId,
              threadId: ctx.threadId,
            },
          );
          return { deleted: true as const, entryId: args.entryId };
        })(),
      );
    },
  });
}

export function authoringToolkit() {
  return toolkit([addContextTool(), editContextTool(), deleteContextTool()], {
    name: "contextAuthoring",
    instructions: [
      "Authoring tools create, update, or delete context entries in the user's namespace only.",
    ],
  });
}
