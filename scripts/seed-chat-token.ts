#!/usr/bin/env bun

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readRootEnv, writeRootEnvVar } from "./_lib/chatEnv";

async function seedChatToken() {
  const { vars } = await readRootEnv();
  const convexUrl = vars.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL is missing from the package root .env.local");
  }

  const client = new ConvexHttpClient(convexUrl);
  const seedMutation = (
    api as unknown as {
      seeds: {
        seedRootAccountToken: Parameters<typeof client.mutation>[0];
      };
    }
  ).seeds.seedRootAccountToken;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const token = await client.mutation(seedMutation, {});
      await writeRootEnvVar("ACCOUNT_TOKEN", token);
      console.log("Seeded root account token into .env.local");
      return token;
    } catch {
      await Bun.sleep(500);
    }
  }

  throw new Error("Timed out waiting to seed root account token");
}

await seedChatToken();
