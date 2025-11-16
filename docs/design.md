## 1. Product overview

**Goal:**
Personal bookmarking app where you can:

- Save links with optional note.
- Automatically:
  - Fetch & extract page content from a URL.
  - Generate summary + tags via an LLM.

- Search bookmarks by:
  - Title / URL
  - Tags
  - Content / summary

**Constraints / assumptions**

- Single-user (you) to start, but we’ll design multi-tenant-friendly.
- Stack:
  - **Next.js** (App Router, server components)
  - **Neon** (Postgres + Neon Auth)
  - **Tailwind CSS + shadcn/ui**
  - **LLM:** OpenAI `gpt-4o-mini` (cheap + good) for extraction & tagging; optionally `gpt-5-mini`/`o3-mini` later if you want more reasoning. ([OpenAI Platform][1])

- Scaffolding (Next/Tailwind/Neon/Auth) is already done.

---

## 2. High-level architecture

**Frontend (Next.js app router)**

- Pages:
  - `/` – main bookmarks list + search + tag filters
  - `/new` – add new bookmark (URL + optional note)
  - `/b/[id]` – bookmark detail (full summary, tags, raw content snippet)
  - `/settings` – configure small stuff (maybe extraction mode, show API key status, etc.)

**Backend**

- Neon Postgres for:
  - Users
  - Bookmarks
  - Tags & bookmark-tag join
  - LLM extraction metadata

- Neon Auth for:
  - Sessions & user identification

- LLM & extractor:
  - Route handler or server action calling:
    - `fetch()` to pull page HTML
    - Local readability parser (e.g., Mozilla Readability in a Node DOM environment) or external “readability”/link-preview API.
    - LLM call to summarize + tag.

**Processing model**

- When a bookmark is created:
  1. Save record with `status = 'pending'`.
  2. Trigger content-extraction & LLM summarization on the server.
  3. Update bookmark with `status = 'processed'`, summary, tags, `search_vector`, etc.

- V1: do this inline (the POST endpoint waits for the LLM call).
- V2: move to background job (job table + cron/queue).

---

## 3. Data model / schema design

### 3.1 Users

Assuming Neon Auth gives you a `user_id` (UUID-ish) and email.

```sql
CREATE TABLE users (
  id          uuid PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

You might only need this if you want extra metadata; otherwise you can purely rely on auth’s `user_id` and not store a separate `users` row yet.

---

### 3.2 Bookmarks

Core entity.

```sql
CREATE TYPE bookmark_status AS ENUM ('pending', 'processed', 'failed');

CREATE TABLE bookmarks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  url                text NOT NULL,
  normalized_url     text NOT NULL, -- e.g., lowercase, stripped www, etc, for uniqueness
  title              text,
  description        text,          -- your note
  source_type        text,          -- 'article', 'video', 'tweet', etc (optional)
  favicon_url        text,          -- optional, from metadata

  status             bookmark_status NOT NULL DEFAULT 'pending',
  error_message      text,          -- populated on failed extraction

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  last_processed_at  timestamptz
);

CREATE UNIQUE INDEX idx_bookmarks_user_url
  ON bookmarks(user_id, normalized_url);
```

> You can derive `normalized_url` in your server action (strip protocol, `www.`, trailing slash).

---

### 3.3 Bookmark content

Separate table to keep big fields away from main row.

```sql
CREATE TABLE bookmark_contents (
  bookmark_id        uuid PRIMARY KEY REFERENCES bookmarks(id) ON DELETE CASCADE,
  raw_content        text,          -- potentially truncated, e.g., first 20–50k chars
  content_hash       text,          -- hash of raw_content for idempotency / reprocessing

  summary_short      text,          -- 1–2 sentence summary
  summary_long       text,          -- optional multi-paragraph summary
  language           text,          -- detected language (e.g. 'en', 'ja')

  llm_model          text,          -- which model was used
  llm_version        text,          -- optional, to track when you upgrade models
  meta               jsonb,         -- arbitrary metadata from LLM (category, etc.)

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
```

---

### 3.4 Tags

```sql
CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, lower(name))
);

CREATE TABLE bookmark_tags (
  bookmark_id uuid NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);
```

You can create tags from LLM-suggested labels (normalized to lowercase, slug-like) and also let user add/edit tags manually.

---

### 3.5 Search / full-text

Use Postgres full-text search for “search by content/summary/title/description/tags.”

```sql
ALTER TABLE bookmark_contents
ADD COLUMN search_vector tsvector;

-- Or you can put this column on bookmarks if you only search summaries + titles.

CREATE INDEX idx_bookmark_contents_search_vector
  ON bookmark_contents USING GIN (search_vector);
```

Populate with:

```sql
UPDATE bookmark_contents bc
SET search_vector =
  setweight(to_tsvector('simple', coalesce(b.title,'')), 'A') ||
  setweight(to_tsvector('simple', coalesce(b.description,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(bc.summary_short,'')), 'B') ||
  setweight(to_tsvector('simple', coalesce(bc.summary_long,'')), 'C')
FROM bookmarks b
WHERE bc.bookmark_id = b.id;
```

And keep it in sync via triggers or update it from app code after you update summary.

**Optional:** Add `pgvector` column for semantic search later.

---

## 4. LLM & content extraction design

### 4.1 Link content extraction pipeline

**Step 1: Fetch HTML**

- Server-side `fetch(url)` from your route handler / server action.
- Handle:
  - Redirects (follow automatically).
  - Timeout (~5–10s).
  - Size limit (e.g. only first 1–2MB).

**Step 2: Parse + clean text**

Options:

1. **Local readability**:
   - Use `jsdom` + `mozilla/readability` to get a cleaned article body and title.
   - Extract:
     - `readableTitle`
     - `content` as HTML, then strip tags to plain text.

2. **Third-party “reader” API**:
   - If you want to avoid running DOM parsing yourself, you can call a Readability/preview API that gives you:
     - `title`, `description`, `content`, `image`, etc.

For V1, I’d go with local readability to keep everything in your stack.

**Step 3: Truncate content for LLM**

- LLM doesn’t need full article if huge.
- Keep e.g. first 10–15k characters / ~5–8k tokens.
- You can also extract:
  - `<meta>` tags (title, description).
  - `og:title`, `og:description`.
  - `keywords` meta if present.

**Step 4: Call LLM**

**Model choice:**

- `gpt-4o-mini` (cheap, strong enough for summarization + tagging). ([OpenAI Platform][1])
- If later you want more reasoning for categorization, you can switch to a reasoning model like `gpt-5-mini` or `o3-mini`. ([OpenAI Platform][2])

**Prompt structure (system message):**

> You are a bookmark organizer. Given the plain text content of a web page and its URL, extract a short summary and a set of tags that describe the topic, domain, and use-case. Output strictly in the requested JSON schema.

**User message:**

```text
URL: https://example.com/some-article
Title (if any): <title from HTML>
Meta description: <description from HTML>

Content:
<TRUNCATED_CONTENT_HERE>
```

Use the `response_format` with JSON schema in the OpenAI API so you get typed output. ([OpenAI Platform][3])

Example schema:

```jsonc
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Human-friendly title for the bookmark",
    },
    "summary_short": { "type": "string" },
    "summary_long": { "type": "string" },
    "language": { "type": "string" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
    },
    "category": { "type": "string" },
  },
  "required": ["title", "summary_short", "tags"],
}
```

**Step 5: Persist results**

- Upsert into `bookmark_contents`.
- If `title` was missing, update `bookmarks.title` with LLM title.
- For tags:
  - For each tag name:
    - Normalize (trim, lowercase).
    - `INSERT ... ON CONFLICT DO NOTHING` into `tags`.
    - Insert into `bookmark_tags`.

- Set:
  - `status = 'processed'`
  - `last_processed_at = now()`
  - `llm_model`, `llm_version`.

**Step 6: Error handling**

- On any failure:
  - Set `status = 'failed'`, `error_message = '...'`.
  - UI can show a “retry extraction” button.

---

## 5. API design (Next.js route handlers / server actions)

Assuming **App Router**.

### 5.1 Create bookmark: `POST /api/bookmarks`

**Request body:**

```json
{
  "url": "https://example.com",
  "description": "Cool article on distributed systems",
  "tags": ["distributed systems", "infra"] // optional manual tags
}
```

**Steps:**

1. Auth guard (require logged-in user).
2. Normalize URL.
3. Insert `bookmarks` row.
4. If `tags` provided:
   - Ensure tags exist in `tags` table and link via `bookmark_tags`.

5. Call extraction pipeline:
   - Either inline or `void` call to background route.

6. Return bookmark data:
   - `status: 'processed' | 'pending'` depending on inline vs async.

### 5.2 Get bookmarks list: `GET /api/bookmarks`

Query params:

- `q` – search text
- `tag` – tag filter (single or multiple)
- `status` – optional (`processed`, etc.)
- `page`, `pageSize`

Backend:

- If `q` present, use full-text search on `bookmark_contents.search_vector`.
- Join `bookmarks` + `bookmark_contents` + simplified `tags` (array_agg).

### 5.3 Get single bookmark: `GET /api/bookmarks/[id]`

Returns:

- Bookmark core
- Full summary, long text (maybe truncated for UI)
- Tags
- Status & error if any

### 5.4 Retry extraction: `POST /api/bookmarks/[id]/reprocess`

- Only allow if owner.
- Re-run extraction pipeline.

### 5.5 Tags list: `GET /api/tags`

Return all tags for user with counts.

---

## 6. UI / UX design (Tailwind + shadcn)

### 6.1 Main list page (`/`)

- Top bar:
  - Search input (free text).
  - Tag filter (multi-select or horizontal chips).
  - “Add bookmark” button.

- Bookmark cards (shadcn `Card`):
  - Title (clickable, opens detail page).
  - URL (small, muted).
  - Short summary.
  - Tags as badges.
  - Status pill (`pending`, `failed`, etc.).

- Pagination / infinite scroll.

### 6.2 Add bookmark form (`/new`)

- Inputs:
  - URL (required).
  - Description (optional).
  - Tags (optional, maybe simple comma-separated or tag selector).

- “Auto-extract on save” is default.
- Show spinner / toast “Analyzing link with AI…”.

### 6.3 Bookmark detail (`/b/[id]`)

- Show:
  - Title + URL
  - Description
  - Tags (editable)
  - Short + long summary
  - “Open original” button
  - Status + “Retry extraction” button if failed.

### 6.4 Search UX

- Debounced search (client state).
- Hit `/api/bookmarks?q=...&tag=...`.
- Show results; highlight search terms in summary/title (optional).

---

## 7. Security, auth, and multi-tenancy

- Every query filters by `user_id`.
- Use Neon Auth middleware to get session user:
  - Attach `userId` to `NextRequest`.

- In all API handlers, **never** trust client-sent `user_id`.
- For now, single workspace per user — simple.
- Later, you can add “collections” or “folders” table if needed.

---

## 8. Detailed task breakdown

Here’s a task list you can more or less paste into Linear/Jira.

### 8.1 Data layer & migrations

1. **Create DB schema**
   - [ ] Add `users` table (if not already).
   - [ ] Add `bookmark_status` enum.
   - [ ] Add `bookmarks` table.
   - [ ] Add `bookmark_contents` table.
   - [ ] Add `tags` and `bookmark_tags` tables.
   - [ ] Add `search_vector` column + GIN index.
   - [ ] Add unique index on `(user_id, normalized_url)`.

2. **Drizzle / ORM models (if using)**
   - [ ] Define schema for all tables.
   - [ ] Generate migrations.
   - [ ] Run migrations against Neon.

3. **Utility functions**
   - [ ] `normalizeUrl(url: string): string`
   - [ ] `ensureTags(userId, tagNames[]): Promise<tagIds[]>`
   - [ ] `updateSearchVector(bookmarkId)` helper (or put into same transaction as content update).

---

### 8.2 LLM & extraction layer

4. **HTML fetching & readability**
   - [ ] Implement `fetchPageHtml(url: string): Promise<string | null>` with timeout and size limit.
   - [ ] Set up `jsdom` + `readability` (or external API) to parse HTML.
   - [ ] Implement `extractReadableContent(html, url)` returning `{title, metaDescription, textContent}`.

5. **LLM client**
   - [ ] Add OpenAI client wrapper using your API key from env.
   - [ ] Write `summarizeAndTag({ url, title, metaDescription, contentText }): Promise<LLMResult>`.
   - [ ] Use JSON schema/response_format for stricter output.
   - [ ] Implement retry (e.g., up to 2 times on transient errors).

6. **Content processing pipeline**
   - [ ] Implement `processBookmark(bookmarkId, {forceReprocess?: boolean})`.
   - [ ] Inside:
     - [ ] Fetch bookmark + user.
     - [ ] Fetch HTML, parse, truncate content.
     - [ ] Call LLM, parse result.
     - [ ] Upsert into `bookmark_contents`.
     - [ ] Ensure tags from LLM; add `bookmark_tags`.
     - [ ] Update bookmark title/status/last_processed_at.
     - [ ] Update `search_vector`.

7. **Error handling**
   - [ ] Catch parse or LLM errors, set `status='failed'` and `error_message`.
   - [ ] Add logging (console or proper logging).

---

### 8.3 API routes / server actions

8. **Create bookmark route**
   - [ ] `POST /api/bookmarks`
   - [ ] Validate input (Zod).
   - [ ] Get current user from auth.
   - [ ] Normalize URL.
   - [ ] Insert bookmark row.
   - [ ] Handle optional user tags.
   - [ ] Call `processBookmark` _inline_ for v1.
   - [ ] Return processed bookmark + tags.

9. **List bookmarks route**
   - [ ] `GET /api/bookmarks`
   - [ ] Query params: `q`, `tag`, `status`, `page`, `pageSize`.
   - [ ] If `q` provided:
     - [ ] Build full-text query using `to_tsquery` / `plainto_tsquery`.
     - [ ] Join bookmarks + contents + tags.

   - [ ] Return paginated list.

10. **Get bookmark by id**
    - [ ] `GET /api/bookmarks/[id]`
    - [ ] Auth check (must belong to user).
    - [ ] Return details, contents, tags.

11. **Retry extraction endpoint**
    - [ ] `POST /api/bookmarks/[id]/reprocess`
    - [ ] Auth check.
    - [ ] Call `processBookmark` with `forceReprocess: true`.

12. **Tags endpoint**
    - [ ] `GET /api/tags`
    - [ ] Return tags + bookmark counts.

---

### 8.4 Frontend pages & components

13. **Shell & layout**
    - [ ] App layout with navbar (“Bookmarks”, “New”, maybe “Settings”).
    - [ ] Dark/light mode (optional).

14. **Bookmarks list page (`/`)**
    - [ ] Search bar hooked to query param `q`.
    - [ ] Tag filter component (chips or multi-select using shadcn `Badge`/`Command`).
    - [ ] Bookmark card component:
      - [ ] Title (link to `/b/[id]`).
      - [ ] URL (truncated).
      - [ ] Short summary.
      - [ ] Tags.
      - [ ] Status pill.

    - [ ] Pagination UI (Next/Prev).

15. **New bookmark page (`/new`)**
    - [ ] Form using shadcn `Form` + `Input` + `Textarea`.
    - [ ] POST to `/api/bookmarks`.
    - [ ] Show loading state & toast (e.g., `sonner`).
    - [ ] On success: redirect to `/` or `/b/[id]`.

16. **Bookmark detail page (`/b/[id]`)**
    - [ ] Fetch bookmark via `fetch` or server component.
    - [ ] Render full details:
      - [ ] Title, URL, description.
      - [ ] Tags with ability to add/remove (optional for v1).
      - [ ] Short and long summary.
      - [ ] Status + error message if failed.
      - [ ] “Retry extraction” button hooked to API.

17. **Settings page (`/settings`)** (optional for v1)
    - [ ] Display which LLM model is in use (read from env).
    - [ ] Toggle: “Auto-extract on save” (per-user config) – optional, requires `user_settings` table.

---

### 8.5 Background jobs (v2 enhancement)

18. **Job table (optional)**

- [ ] `jobs` table with `id`, `user_id`, `payload`, `type`, `status`, `run_at`, etc.
- [ ] When bookmark created, create `job` instead of processing inline.
- [ ] Cron/worker (e.g., serverless cron hitting `/api/jobs/run`) picks up pending jobs.

19. **Rate limiting & quotas**

- [ ] Simple per-user daily limit on new bookmarks (for your own protection vs LLM cost).
- [ ] `user_limits` table or just env-guard with some checks.

---

### 8.6 Polish

20. **UX polish**

- [ ] Empty state (“No bookmarks yet. Add your first one!”).
- [ ] Loading skeletons for cards.
- [ ] Tag colors, icon for external link, favicon thumbnail.

21. **Logging & monitoring**

- [ ] Log LLM failures with URL & error type.
- [ ] Optional: dashboard page showing recent extractions & statuses.

22. **Tests**

- [ ] Unit tests for:
  - URL normalization.
  - Tag upsert logic.

- [ ] Integration tests for:
  - Create bookmark -> LLM pipeline (mock LLM).
  - Search endpoint.
