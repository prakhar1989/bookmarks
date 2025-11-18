import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import * as schema from "@/app/schema/schema";
import { stackServerApp } from "@/app/stack";

/**
 * GET /api/bookmarks/[id] - Get a single bookmark by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Fetch bookmark with content
    const bookmarks = await db
      .select({
        id: schema.bookmarks.id,
        url: schema.bookmarks.url,
        normalizedUrl: schema.bookmarks.normalizedUrl,
        title: schema.bookmarks.title,
        description: schema.bookmarks.description,
        sourceType: schema.bookmarks.sourceType,
        faviconUrl: schema.bookmarks.faviconUrl,
        status: schema.bookmarks.status,
        errorMessage: schema.bookmarks.errorMessage,
        createdAt: schema.bookmarks.createdAt,
        updatedAt: schema.bookmarks.updatedAt,
        lastProcessedAt: schema.bookmarks.lastProcessedAt,
        summaryShort: schema.bookmarkContents.summaryShort,
        summaryLong: schema.bookmarkContents.summaryLong,
        language: schema.bookmarkContents.language,
        llmModel: schema.bookmarkContents.llmModel,
      })
      .from(schema.bookmarks)
      .leftJoin(
        schema.bookmarkContents,
        eq(schema.bookmarks.id, schema.bookmarkContents.bookmarkId),
      )
      .where(
        and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
      )
      .limit(1);

    if (bookmarks.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    const bookmark = bookmarks[0];

    // Fetch tags
    const tags = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
      })
      .from(schema.tags)
      .innerJoin(
        schema.bookmarkTags,
        eq(schema.tags.id, schema.bookmarkTags.tagId),
      )
      .where(eq(schema.bookmarkTags.bookmarkId, id));

    return NextResponse.json({
      bookmark: {
        ...bookmark,
        tags,
      },
    });
  } catch (error) {
    console.error("Error fetching bookmark:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/bookmarks/[id] - Update bookmark description or summaries
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description, summaryShort, summaryLong } = body;

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Verify bookmark exists and belongs to user
    const existingBookmark = await db
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(
        and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
      )
      .limit(1);

    if (existingBookmark.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    // Update description if provided
    if (description !== undefined) {
      await db
        .update(schema.bookmarks)
        .set({
          description,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.bookmarks.id, id),
            eq(schema.bookmarks.userId, user.id),
          ),
        );
    }

    // Update summaries if provided
    if (summaryShort !== undefined || summaryLong !== undefined) {
      const updateData: Record<string, string> = {};
      if (summaryShort !== undefined) updateData.summaryShort = summaryShort;
      if (summaryLong !== undefined) updateData.summaryLong = summaryLong;

      await db
        .update(schema.bookmarkContents)
        .set(updateData)
        .where(eq(schema.bookmarkContents.bookmarkId, id));
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark updated successfully",
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/bookmarks/[id] - Delete a bookmark and its related content
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Verify bookmark exists and belongs to user before deleting
    const existingBookmark = await db
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(
        and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
      )
      .limit(1);

    if (existingBookmark.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    // Delete the bookmark (CASCADE will delete bookmark_contents and bookmark_tags)
    await db
      .delete(schema.bookmarks)
      .where(
        and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
      );

    return NextResponse.json({
      success: true,
      message: "Bookmark deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
