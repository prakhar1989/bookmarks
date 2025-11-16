import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/app/schema/schema";
import { stackServerApp } from "@/app/stack";

/**
 * POST /api/bookmarks/[id]/tags - Add a tag to a bookmark
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookmarkId } = await params;
    const { tagName } = await request.json();

    if (!tagName || typeof tagName !== "string" || tagName.trim() === "") {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 },
      );
    }

    const trimmedTagName = tagName.trim();

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Verify bookmark exists and belongs to user
    const existingBookmark = await db
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.id, bookmarkId),
          eq(schema.bookmarks.userId, user.id),
        ),
      )
      .limit(1);

    if (existingBookmark.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    // Find or create tag (case-insensitive)
    let tag = await db
      .select()
      .from(schema.tags)
      .where(
        and(
          eq(schema.tags.userId, user.id),
          sql`lower(${schema.tags.name}) = lower(${trimmedTagName})`,
        ),
      )
      .limit(1);

    if (tag.length === 0) {
      // Create new tag
      const newTags = await db
        .insert(schema.tags)
        .values({
          userId: user.id,
          name: trimmedTagName,
        })
        .returning();
      tag = newTags;
    }

    const tagId = tag[0].id;

    // Check if bookmark already has this tag
    const existingBookmarkTag = await db
      .select()
      .from(schema.bookmarkTags)
      .where(
        and(
          eq(schema.bookmarkTags.bookmarkId, bookmarkId),
          eq(schema.bookmarkTags.tagId, tagId),
        ),
      )
      .limit(1);

    if (existingBookmarkTag.length > 0) {
      return NextResponse.json(
        { error: "Tag already exists on this bookmark" },
        { status: 409 },
      );
    }

    // Add tag to bookmark
    await db.insert(schema.bookmarkTags).values({
      bookmarkId,
      tagId,
    });

    return NextResponse.json({
      success: true,
      tag: {
        id: tag[0].id,
        name: tag[0].name,
      },
    });
  } catch (error) {
    console.error("Error adding tag to bookmark:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
