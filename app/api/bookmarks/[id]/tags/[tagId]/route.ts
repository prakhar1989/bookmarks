import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import * as schema from "@/app/schema/schema";
import { stackServerApp } from "@/app/stack";

/**
 * DELETE /api/bookmarks/[id]/tags/[tagId] - Remove a tag from a bookmark
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookmarkId, tagId } = await params;

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

    // Verify tag belongs to user
    const existingTag = await db
      .select()
      .from(schema.tags)
      .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, user.id)))
      .limit(1);

    if (existingTag.length === 0) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Remove tag from bookmark
    const result = await db
      .delete(schema.bookmarkTags)
      .where(
        and(
          eq(schema.bookmarkTags.bookmarkId, bookmarkId),
          eq(schema.bookmarkTags.tagId, tagId),
        ),
      );

    return NextResponse.json({
      success: true,
      message: "Tag removed from bookmark",
    });
  } catch (error) {
    console.error("Error removing tag from bookmark:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
