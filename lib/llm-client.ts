import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
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
  title?: string | null;
  metaDescription?: string | null;
  contentText?: string | null;
}

/**
 * Initialize Google GenAI client
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      "[LLM] GEMINI_API_KEY environment variable is not set. Please add it to .env.local",
    );
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  console.log("[LLM] Gemini client initialized successfully");
  return new GoogleGenAI({ apiKey });
}

/**
 * Calls Gemini to summarize and tag bookmark content
 * Uses URL Context to fetch the URL content and Grounding for additional context
 * Uses structured output with JSON schema for reliable parsing
 */
export async function summarizeAndTag(
  input: SummarizeInput,
  model: string = "gemini-2.5-flash",
  maxRetries: number = 2,
): Promise<LLMResult> {
  console.log("[LLM] Starting summarizeAndTag with URL Context + Grounding", {
    url: input.url,
    model,
    maxRetries,
  });

  const client = getGeminiClient();

  // Build the prompt - use URL context to fetch and analyze the specific URL
  const prompt = `You are a bookmark organizer. I need you to analyze the content at the following URL and extract key information for organizing it as a bookmark.

Please analyze the content from this URL: ${input.url}

After analyzing the page content, provide your response in valid JSON format with the following structure:

{
  "title": "A human-friendly title for the bookmark (based on the actual page content)",
  "summary_short": "A 1-2 sentence summary of what the page is about (optional)",
  "summary_long": "A detailed multi-paragraph summary of the content (optional)",
  "language": "Detected language code of the content (e.g., 'en', 'ja', 'es')",
  "tags": ["tag1", "tag2", "tag3"] (at most 3 to 5 relevant tags describing the topic, domain, and use-case),
  "category": "Primary category of the content (optional, e.g., Technology, News, Tutorial, Documentation)"
}

IMPORTANT:
- Provide 3-5 relevant tags describing the topic, domain, and use-case
- Return ONLY valid JSON, no markdown code blocks or extra text
- The title, language, and tags fields are required`;

  let lastError: Error | null = null;

  // Configure URL Context + Grounding with Google Search
  // https://ai.google.dev/gemini-api/docs/url-context
  // https://ai.google.dev/gemini-api/docs/google-search
  const urlContextTool = { urlContext: {} };
  const groundingTool = { googleSearch: {} };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM] Attempt ${attempt + 1}/${maxRetries + 1}`, {
        url: input.url,
      });

      const response: GenerateContentResponse =
        await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [urlContextTool, groundingTool],
            maxOutputTokens: 4000,
          },
        });

      const text = response.text;

      // Log URL context metadata if available
      if (response.candidates && response.candidates[0].urlContextMetadata) {
        console.log("[LLM] URL context metadata received", {
          url: input.url,
          urlContextMetadata: response.candidates[0].urlContextMetadata,
        });
      }

      // Log grounding metadata if available
      if (response.candidates && response.candidates[0].groundingMetadata) {
        console.log("[LLM] Grounding metadata received", {
          url: input.url,
          groundingMetadata: response.candidates[0].groundingMetadata,
        });
      }

      console.log("[LLM] Received response", {
        url: input.url,
        attempt: attempt + 1,
        responseLength: text?.length || 0,
        hasResponse: !!text,
        candidates: response.candidates,
      });

      if (!text) {
        throw new Error("No content in LLM response");
      }

      // Extract JSON from response (may be wrapped in markdown code blocks)
      let jsonText = text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Parse and validate response
      const parsed = JSON.parse(jsonText);
      console.log("[LLM] Parsed JSON response", {
        url: input.url,
        parsedKeys: Object.keys(parsed),
        tagsCount: parsed.tags?.length,
      });

      const validated = LLMResultSchema.parse(parsed);

      console.log("[LLM] Successfully validated response", {
        url: input.url,
        title: validated.title,
        language: validated.language,
        tagsCount: validated.tags.length,
        hasSummaryShort: !!validated.summary_short,
        hasSummaryLong: !!validated.summary_long,
        hasCategory: !!validated.category,
      });

      return validated;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown LLM error");

      console.error(`[LLM] Error on attempt ${attempt + 1}/${maxRetries + 1}`, {
        url: input.url,
        errorMessage: lastError.message,
        errorName: lastError.name,
        errorStack: lastError.stack,
      });

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[LLM] Retrying after ${waitTime}ms`, {
        url: input.url,
        nextAttempt: attempt + 2,
      });

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  console.error("[LLM] All retry attempts exhausted", {
    url: input.url,
    totalAttempts: maxRetries + 1,
    finalError: lastError?.message,
  });

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
