import { notFound } from "next/navigation";
import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import * as schema from "@/app/schema/schema";
import { Header } from "@/app/header";
import { stackServerApp } from "@/app/stack";
import { Card } from "@/components/ui/card";
import { Favicon } from "@/components/bookmarks/favicon";
import { DeleteBookmarkButton } from "@/components/bookmarks/delete-bookmark-button";
import { EditNote } from "@/components/bookmarks/edit-note";
import { EditSummary } from "@/components/bookmarks/edit-summary";
import { ReprocessButton } from "@/components/bookmarks/reprocess-button";
import { ClickableTags } from "@/components/bookmarks/clickable-tags";
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react";

interface TagData {
  id: string;
  name: string;
}

interface Bookmark {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string | null;
  description: string | null;
  sourceType: string | null;
  faviconUrl: string | null;
  status: "pending" | "processed" | "failed";
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastProcessedAt: Date | null;
  summaryShort: string | null;
  summaryLong: string | null;
  language: string | null;
  llmModel: string | null;
  tags: TagData[];
}

async function getBookmark(
  id: string,
  userId: string,
): Promise<Bookmark | null> {
  try {
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
        and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, userId)),
      )
      .limit(1);

    if (bookmarks.length === 0) {
      return null;
    }

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

    return {
      ...bookmarks[0],
      tags,
    };
  } catch (error) {
    console.error("Error fetching bookmark:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await stackServerApp.getUser();
  const { id } = await params;

  if (!user) {
    return {
      title: "Sign in required - Stashly",
      description: "Sign in to view this bookmark on Stashly",
    };
  }

  const bookmark = await getBookmark(id, user.id);

  if (!bookmark) {
    return {
      title: "Bookmark not found - Stashly",
      description: "This bookmark could not be found",
    };
  }

  const title = bookmark.title || new URL(bookmark.url).hostname;
  const description =
    bookmark.summaryShort ||
    bookmark.description ||
    `Bookmark saved on Stashly from ${new URL(bookmark.url).hostname}`;

  return {
    title: `${title} - Stashly`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/b/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function BookmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await stackServerApp.getUser();

  if (!user) {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full flex-1 max-w-3xl px-4 py-16">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Please sign in to view bookmarks.
          </p>
        </main>
      </div>
    );
  }

  const { id } = await params;
  const bookmark = await getBookmark(id, user.id);

  if (!bookmark) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full flex-1 max-w-4xl px-4 py-10">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex gap-2">
            <ReprocessButton bookmarkId={bookmark.id} />
            <DeleteBookmarkButton bookmarkId={bookmark.id} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              {bookmark.faviconUrl && (
                <Favicon
                  src={bookmark.faviconUrl}
                  className="w-8 h-8 shrink-0"
                />
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2">
                  {bookmark.title || bookmark.url}
                </h1>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    {new URL(bookmark.url).hostname}
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1">
                    {bookmark.status === "processed" && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Processed</span>
                      </>
                    )}
                    {bookmark.status === "pending" && (
                      <>
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600">Processing...</span>
                      </>
                    )}
                    {bookmark.status === "failed" && (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Failed</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <ClickableTags tags={bookmark.tags} />

                {/* Personal Note */}
                <EditNote
                  bookmarkId={bookmark.id}
                  initialNote={bookmark.description}
                />
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {bookmark.status === "failed" && bookmark.errorMessage && (
            <Card className="p-4 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-300 mb-1">
                    Processing Failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {bookmark.errorMessage}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Use the &ldquo;Reprocess with AI&rdquo; button above to retry.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Summaries */}
          {bookmark.summaryShort && (
            <Card className="p-6">
              <EditSummary
                bookmarkId={bookmark.id}
                initialSummary={bookmark.summaryShort}
                type="short"
                title="Summary"
              />
            </Card>
          )}

          {bookmark.summaryLong && (
            <Card className="p-6">
              <EditSummary
                bookmarkId={bookmark.id}
                initialSummary={bookmark.summaryLong}
                type="long"
                title="Detailed Summary"
              />
            </Card>
          )}

          {/* Metadata */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Metadata</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-600 dark:text-gray-400 mb-1">
                  Created
                </dt>
                <dd className="font-medium">
                  {new Date(bookmark.createdAt).toLocaleString()}
                </dd>
              </div>
              {bookmark.lastProcessedAt && (
                <div>
                  <dt className="text-gray-600 dark:text-gray-400 mb-1">
                    Last Processed
                  </dt>
                  <dd className="font-medium">
                    {new Date(bookmark.lastProcessedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {bookmark.language && (
                <div>
                  <dt className="text-gray-600 dark:text-gray-400 mb-1">
                    Language
                  </dt>
                  <dd className="font-medium uppercase">{bookmark.language}</dd>
                </div>
              )}
              {bookmark.sourceType && (
                <div>
                  <dt className="text-gray-600 dark:text-gray-400 mb-1">
                    Type
                  </dt>
                  <dd className="font-medium capitalize">
                    {bookmark.sourceType}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </main>
    </div>
  );
}
