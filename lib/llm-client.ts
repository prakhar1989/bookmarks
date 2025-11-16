import { GoogleGenAI } from "@google/genai";
import { truncateContent } from "./bookmark-utils";
import { z } from "zod";

// Zod schema for LLM response validation
const LLMResultSchema = z.object({
  title: z.string().describe("Human-friendly title for the bookmark"),
  summary_short: z
    .string()
    .describe("1-2 sentence summary of the content")
    .optional(),
  summary_long: z
    .string()
    .describe("Multi-paragraph detailed summary")
    .optional(),
  language: z.string().describe("Detected language code (e.g., 'en', 'ja')"),
  tags: z
    .array(z.string())
    .describe(
      "Array of relevant tags (max 5) describing topic, domain, and use-case",
    ),
  category: z.string().describe("Primary category of the content").optional(),
});

export type LLMResult = z.infer<typeof LLMResultSchema>;

export interface SummarizeInput {
  url: string;
  title: string | null;
  metaDescription: string | null;
  contentText: string | null;
}

/**
 * Initialize Google GenAI client
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Calls Gemini to summarize and tag bookmark content
 * Uses structured output with JSON schema for reliable parsing
 */
export async function summarizeAndTag(
  input: SummarizeInput,
  model: string = "gemini-2.5-flash",
  maxRetries: number = 2,
): Promise<LLMResult> {
  const client = getGeminiClient();

  // Truncate content if too long (keep ~10-15k chars for LLM context)
  const truncatedContent = input.contentText
    ? truncateContent(input.contentText, 15000)
    : "";

  // Build the prompt
  const prompt = `You are a bookmark organizer. Given the plain text content of a web page and its URL, extract a short summary and a set of tags that describe the topic, domain, and use-case. Be concise but informative.

URL: ${input.url}
${input.title ? `Title: ${input.title}` : ""}
${input.metaDescription ? `Meta Description: ${input.metaDescription}` : ""}

Content:
${truncatedContent || "(No content available)"}

Analyze this content and provide a JSON response with the following fields:
- title: A human-friendly title for the bookmark
- summary_short: A 1-2 sentence summary of the content (optional)
- summary_long: A multi-paragraph detailed summary (optional)
- language: Detected language code (e.g., 'en', 'ja')
- tags: Array of relevant tags describing topic, domain, and use-case
- category: Primary category of the content (optional)`;

  // Define JSON schema for structured output
  const responseSchema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Human-friendly title for the bookmark",
      },
      summary_short: {
        type: "string",
        description: "1-2 sentence summary of the content",
      },
      summary_long: {
        type: "string",
        description: "Multi-paragraph detailed summary",
      },
      language: {
        type: "string",
        description: "Detected language code (e.g., 'en', 'ja')",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of relevant tags describing topic, domain, and use-case",
      },
      category: {
        type: "string",
        description: "Primary category of the content",
      },
    },
    required: ["title", "language", "tags"],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          maxOutputTokens: 4000,
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error("No content in LLM response");
      }

      // Parse and validate response
      const parsed = JSON.parse(text);
      const validated = LLMResultSchema.parse(parsed);

      return validated;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown LLM error");

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  throw new Error(
    `Failed to get LLM response after ${maxRetries + 1} attempts: ${lastError?.message}`,
  );
}

/**
 * Get the current LLM model being used
 */
export function getCurrentLLMModel(): string {
  return "gemini-2.5-flash";
}

/**
 * Get the current LLM version (for tracking)
 */
export function getCurrentLLMVersion(): string {
  return "1.0";
}
