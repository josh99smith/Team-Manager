import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPreset } from "@/lib/ratings/presets";

// Deliberately excludes anthropicApiKey — this result flows through many
// server components, and a narrow select makes it structurally impossible
// for the key to end up in props passed to a client component. Server code
// that specifically needs the key must go through getEffectiveAnthropicApiKey
// below instead.
export const getTeam = cache(async () =>
  prisma.team.findFirst({
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      primaryColor: true,
      secondaryColor: true,
    },
  })
);

export async function getTeamPreset() {
  const team = await getTeam();
  return getPreset(team?.sport);
}

// Server-only: the team's saved Anthropic API key (from Settings), falling
// back to the ANTHROPIC_API_KEY environment variable. Never pass this
// through to a client component — only use it directly in a server action
// or route handler that calls the Anthropic API.
export async function getEffectiveAnthropicApiKey(): Promise<string | null> {
  const team = await prisma.team.findFirst({ select: { anthropicApiKey: true } });
  return team?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

// Server-only: whether an Anthropic API key is available at all right now,
// and if so, where it's coming from — for the Settings page status line.
export async function getAnthropicApiKeyStatus(): Promise<
  "saved" | "environment" | "none"
> {
  const team = await prisma.team.findFirst({ select: { anthropicApiKey: true } });
  if (team?.anthropicApiKey) return "saved";
  if (process.env.ANTHROPIC_API_KEY) return "environment";
  return "none";
}
