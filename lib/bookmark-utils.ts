import { eq, and, sql, inArray } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/app/schema/schema";
import crypto from "crypto";

/**
 * Normalizes a URL for consistent storage and deduplication
 * - Converts to lowercase
 * - Removes www. prefix
 * - Removes trailing slashes
 * - Removes common tracking parameters
 * - Standardizes protocol
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Convert hostname to lowercase and remove www.
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
    ];
    trackingParams.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    // Remove trailing slash from pathname
    let pathname = urlObj.pathname;
    if (pathname.endsWith("/") && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    // Rebuild URL
    return `${urlObj.protocol}//${hostname}${pathname}${urlObj.search}${urlObj.hash}`;
  } catch (error) {
    // If URL parsing fails, just return lowercase version
    return url.toLowerCase().trim();
  }
}

/**
 * Generates a content hash for idempotency checking
 */
export function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Ensures tags exist in the database and returns their IDs
 * Creates new tags if they don't exist
 * Tag names are normalized to lowercase
 */
export async function ensureTags(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  tagNames: string[],
): Promise<string[]> {
  if (tagNames.length === 0) return [];

  // Normalize tag names (trim, lowercase)
  const normalizedNames = tagNames
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0);

  if (normalizedNames.length === 0) return [];

  const tagIds: string[] = [];

  for (const tagName of normalizedNames) {
    // Try to find existing tag
    const existingTag = await db
      .select()
      .from(schema.tags)
      .where(
        and(
          eq(schema.tags.userId, userId),
          sql`lower(${schema.tags.name}) = ${tagName}`,
        ),
      )
      .limit(1);

    if (existingTag.length > 0) {
      tagIds.push(existingTag[0].id);
    } else {
      // Create new tag
      const newTag = await db
        .insert(schema.tags)
        .values({
          userId,
          name: tagName,
        })
        .returning();

      tagIds.push(newTag[0].id);
    }
  }

  return tagIds;
}

/**
 * Links tags to a bookmark
 * Merges new tags with existing ones, preserving user-provided tags
 */
export async function updateBookmarkTags(
  db: NeonHttpDatabase<typeof schema>,
  bookmarkId: string,
  tagIds: string[],
): Promise<void> {
  // Get existing tag associations for this bookmark
  const existingAssociations = await db
    .select({ tagId: schema.bookmarkTags.tagId })
    .from(schema.bookmarkTags)
    .where(eq(schema.bookmarkTags.bookmarkId, bookmarkId));

  const existingTagIds = existingAssociations.map((assoc) => assoc.tagId);

  // Merge existing tags with new tags, removing duplicates
  const allTagIds = [...new Set([...existingTagIds, ...tagIds])];

  // Replace all associations with the merged set
  await db
    .delete(schema.bookmarkTags)
    .where(eq(schema.bookmarkTags.bookmarkId, bookmarkId));

  // Create merged associations
  if (allTagIds.length > 0) {
    await db.insert(schema.bookmarkTags).values(
      allTagIds.map((tagId) => ({
        bookmarkId,
        tagId,
      })),
    );
  }
}

/**
 * Updates the full-text search vector for a bookmark
 * Combines title, description, and summary fields with different weights
 */
export async function updateSearchVector(
  db: NeonHttpDatabase<typeof schema>,
  bookmarkId: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE ${schema.bookmarkContents} bc
    SET search_vector = (
      setweight(to_tsvector('simple', coalesce(b.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(b.description, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(bc.summary_short, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(bc.summary_long, '')), 'C')
    )
    FROM ${schema.bookmarks} b
    WHERE bc.bookmark_id = ${bookmarkId}
      AND b.id = bc.bookmark_id
  `);
}

/**
 * Truncates content to a maximum length (for LLM processing)
 * Tries to truncate at word boundaries
 */
export function truncateContent(
  content: string,
  maxChars: number = 15000,
): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Try to truncate at a word boundary
  const truncated = content.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxChars * 0.8) {
    // If we find a space in the last 20% of the content, use it
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}
