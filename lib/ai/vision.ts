// Thin wrapper around the Claude API for turning a photo into structured
// data (schedule events, roster rows). Used by the AI import features.

import Anthropic from "@anthropic-ai/sdk";
import { getEffectiveAnthropicApiKey } from "@/lib/team";

async function getClient(): Promise<Anthropic> {
  const apiKey = await getEffectiveAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "AI photo import isn't configured yet — add an Anthropic API key in Settings."
    );
  }
  return new Anthropic({ apiKey });
}

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isSupportedImageType(mediaType: string): boolean {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType);
}

export async function extractFromImage<T>(opts: {
  base64: string;
  mediaType: string;
  prompt: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const anthropic = await getClient();

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 8192,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: opts.schema },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: opts.mediaType as Anthropic.Base64ImageSource["media_type"],
                data: opts.base64,
              },
            },
            { type: "text", text: opts.prompt },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new Error(
        "That Anthropic API key was rejected — check it in Settings."
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new Error("The AI is rate-limited right now — try again in a moment.");
    }
    if (e instanceof Anthropic.APIError) {
      throw new Error(`The AI request failed (${e.status ?? "network error"}) — try again.`);
    }
    throw e;
  }

  if (response.stop_reason === "refusal") {
    throw new Error(
      "The AI couldn't process that photo. Try a clearer, more direct shot."
    );
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The AI didn't return any data — try again with a clearer photo.");
  }

  try {
    return JSON.parse(textBlock.text) as T;
  } catch {
    throw new Error("The AI's response wasn't valid — try again.");
  }
}
