#!/usr/bin/env node

/**
 * Backfills search vectors for bookmarks to include URLs in search
 *
 * Usage: npx tsx scripts/backfill-search-vectors.ts
 *
 * This script updates the search vectors for all bookmarks that have
 * processed content, adding the full URL to the searchable fields.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/app/schema/schema";

async function backfillSearchVectors() {
  console.log("Starting search vector backfill...");

  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

  // Get all bookmarks that have bookmark_contents
  const bookmarks = await db
    .select({
      id: schema.bookmarks.id,
      url: schema.bookmarks.url,
    })
    .from(schema.bookmarks)
    .innerJoin(
      schema.bookmarkContents,
      eq(schema.bookmarks.id, schema.bookmarkContents.bookmarkId),
    );

  console.log(`Found ${bookmarks.length} bookmarks to backfill`);

  let successCount = 0;
  let errorCount = 0;

  for (const [index, bookmark] of bookmarks.entries()) {
    try {
      // Update search vector to include URL
      await db.execute(sql`
        UPDATE ${schema.bookmarkContents} bc
        SET search_vector = (
          setweight(to_tsvector('simple', coalesce(b.title, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(b.description, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(bc.summary_short, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(bc.summary_long, '')), 'C') ||
          setweight(to_tsvector('simple', coalesce(b.url, '')), 'C')
        )
        FROM ${schema.bookmarks} b
        WHERE bc.bookmark_id = ${bookmark.id}
          AND b.id = bc.bookmark_id
      `);

      successCount++;
      console.log(
        `[${index + 1}/${bookmarks.length}] Updated search vector for: ${bookmark.url}`,
      );
    } catch (error) {
      errorCount++;
      console.error(
        `[${index + 1}/${bookmarks.length}] Error updating search vector for: ${bookmark.url}`,
        error,
      );
    }
  }

  console.log("\nBackfill complete!");
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

// Run backfill
backfillSearchVectors().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
