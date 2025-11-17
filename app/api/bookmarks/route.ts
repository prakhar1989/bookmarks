import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, ilike, or, sql, inArray } from "drizzle-orm";
import * as schema from "@/app/schema/schema";
import { stackServerApp } from "@/app/stack";
import {
  normalizeUrl,
  ensureTags,
  updateBookmarkTags,
} from "@/lib/bookmark-utils";
import { processBookmark } from "@/lib/bookmark-processor";

const CreateBookmarkSchema = z.object({
  url: z.string().url("Invalid URL"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * POST /api/bookmarks - Create a new bookmark
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateBookmarkSchema.parse(body);

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Ensure user exists in our database
    await db
      .insert(schema.users)
      .values({
        id: user.id,
        email: user.primaryEmail || "unknown@example.com",
      })
      .onConflictDoNothing();

    // Normalize URL
    const normalized = normalizeUrl(validatedData.url);

    // Check if bookmark already exists
    const existing = await db
      .select()
      .from(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.userId, user.id),
          eq(schema.bookmarks.normalizedUrl, normalized),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Bookmark already exists", bookmark: existing[0] },
        { status: 409 },
      );
    }

    // Create bookmark
    const newBookmark = await db
      .insert(schema.bookmarks)
      .values({
        userId: user.id,
        url: validatedData.url,
        normalizedUrl: normalized,
        description: validatedData.description || null,
        status: "pending",
      })
      .returning();

    const bookmarkId = newBookmark[0].id;

    // Handle user-provided tags
    if (validatedData.tags && validatedData.tags.length > 0) {
      const tagIds = await ensureTags(db, user.id, validatedData.tags);
      await updateBookmarkTags(db, bookmarkId, tagIds);
    }

    // Process bookmark (inline for v1)
    try {
      await processBookmark(db, bookmarkId, user.id);

      // Fetch updated bookmark with tags
      const updatedBookmark = await db
        .select({
          id: schema.bookmarks.id,
          url: schema.bookmarks.url,
          title: schema.bookmarks.title,
          description: schema.bookmarks.description,
          status: schema.bookmarks.status,
          createdAt: schema.bookmarks.createdAt,
          summaryShort: schema.bookmarkContents.summaryShort,
        })
        .from(schema.bookmarks)
        .leftJoin(
          schema.bookmarkContents,
          eq(schema.bookmarks.id, schema.bookmarkContents.bookmarkId),
        )
        .where(eq(schema.bookmarks.id, bookmarkId))
        .limit(1);

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
        .where(eq(schema.bookmarkTags.bookmarkId, bookmarkId));

      return NextResponse.json(
        {
          bookmark: {
            ...updatedBookmark[0],
            tags,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      // Processing failed, but bookmark was created
      return NextResponse.json(
        {
          bookmark: newBookmark[0],
          warning: "Bookmark created but processing failed",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Error creating bookmark:", error);
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
 * GET /api/bookmarks - List bookmarks with optional filters
 * Query params:
 * - q: search query (full-text search)
 * - tag: filter by tag name
 * - status: filter by status
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const tag = searchParams.get("tag");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Initialize database
    const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

    // Build query
    let query = db
      .select({
        id: schema.bookmarks.id,
        url: schema.bookmarks.url,
        title: schema.bookmarks.title,
        description: schema.bookmarks.description,
        status: schema.bookmarks.status,
        createdAt: schema.bookmarks.createdAt,
        summaryShort: schema.bookmarkContents.summaryShort,
        faviconUrl: schema.bookmarks.faviconUrl,
      })
      .from(schema.bookmarks)
      .leftJoin(
        schema.bookmarkContents,
        eq(schema.bookmarks.id, schema.bookmarkContents.bookmarkId),
      )
      .where(eq(schema.bookmarks.userId, user.id))
      .$dynamic();

    // Apply filters
    const conditions = [eq(schema.bookmarks.userId, user.id)];

    if (status) {
      conditions.push(eq(schema.bookmarks.status, status as any));
    }

    if (tag) {
      // Filter by tag (requires subquery or join)
      const taggedBookmarkIds = await db
        .select({ bookmarkId: schema.bookmarkTags.bookmarkId })
        .from(schema.tags)
        .innerJoin(
          schema.bookmarkTags,
          eq(schema.tags.id, schema.bookmarkTags.tagId),
        )
        .where(
          and(eq(schema.tags.userId, user.id), ilike(schema.tags.name, tag)),
        );

      if (taggedBookmarkIds.length > 0) {
        conditions.push(
          sql`${schema.bookmarks.id} IN ${sql.raw(`(${taggedBookmarkIds.map((t) => `'${t.bookmarkId}'`).join(",")})`)}`,
        );
      } else {
        // No matching tags, return empty
        return NextResponse.json({ bookmarks: [], total: 0, page, pageSize });
      }
    }

    if (q && q.trim().length > 0) {
      // Full-text search
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${schema.bookmarkContents}
          WHERE ${schema.bookmarkContents.bookmarkId} = ${schema.bookmarks.id}
          AND ${schema.bookmarkContents.searchVector} @@ plainto_tsquery('simple', ${q})
        )`,
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bookmarks)
      .where(and(...conditions));

    const total = Number(countResult[0].count);

    // Get paginated results
    const bookmarks = await db
      .select({
        id: schema.bookmarks.id,
        url: schema.bookmarks.url,
        title: schema.bookmarks.title,
        description: schema.bookmarks.description,
        status: schema.bookmarks.status,
        createdAt: schema.bookmarks.createdAt,
        summaryShort: schema.bookmarkContents.summaryShort,
        faviconUrl: schema.bookmarks.faviconUrl,
      })
      .from(schema.bookmarks)
      .leftJoin(
        schema.bookmarkContents,
        eq(schema.bookmarks.id, schema.bookmarkContents.bookmarkId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.bookmarks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Fetch tags for all bookmarks in a single query (fixes N+1 problem)
    const bookmarkIds = bookmarks.map((b) => b.id);
    const allTags =
      bookmarkIds.length > 0
        ? await db
            .select({
              bookmarkId: schema.bookmarkTags.bookmarkId,
              tagId: schema.tags.id,
              tagName: schema.tags.name,
            })
            .from(schema.tags)
            .innerJoin(
              schema.bookmarkTags,
              eq(schema.tags.id, schema.bookmarkTags.tagId),
            )
            .where(inArray(schema.bookmarkTags.bookmarkId, bookmarkIds))
        : [];

    // Group tags by bookmark ID in memory
    const tagsByBookmark = allTags.reduce(
      (acc, tag) => {
        if (!acc[tag.bookmarkId]) {
          acc[tag.bookmarkId] = [];
        }
        acc[tag.bookmarkId].push({
          id: tag.tagId,
          name: tag.tagName,
        });
        return acc;
      },
      {} as Record<string, { id: string; name: string }[]>,
    );

    // Attach tags to bookmarks
    const bookmarksWithTags = bookmarks.map((bookmark) => ({
      ...bookmark,
      tags: tagsByBookmark[bookmark.id] || [],
    }));

    return NextResponse.json({
      bookmarks: bookmarksWithTags,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
