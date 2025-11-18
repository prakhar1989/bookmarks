# Stashly

A personal bookmarking application with AI-powered analysis, summarization, and tagging. Save links and let Gemini automatically analyze content to generate intelligent summaries and tags.

<img width="382" alt="localhost_3000_b_4c0ef6b2-c62a-4b02-992c-c7d5d63365d9(Pixel 7)" src="https://github.com/user-attachments/assets/dd426e8b-aa20-46f3-a392-ce41f5ea7fa7" />

## Features

- **Smart Bookmarking**: Save any URL with an optional personal note
- **AI-Powered Analysis**: Gemini automatically fetches and analyzes web pages using URL Context and Google Search Grounding
- **Intelligent Summaries**: Generates both concise and detailed summaries of content
- **Auto-Tagging**: Automatically categorizes bookmarks with relevant tags
- **Full-Text Search**: Search bookmarks by title, URL, content, or tags
- **Tag Filtering**: Browse bookmarks by specific tags
- **User Authentication**: Powered by Stack Auth (formerly Neon Auth)
- **Database**: Neon Postgres with Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components

## Prerequisites

- [Neon](https://neon.com) account
- [Stack Auth](https://stack-auth.com) account (or use Neon Auth)
- [Google AI Studio](https://aistudio.google.com/apikey) API key for Gemini
- Node.js 18+ installed locally

## Local Development Setup

### 1. Set up Stack Auth

1. Create or open a [Neon project](https://console.neon.tech/app/projects)
2. Go to **Neon Auth** → **Setup instructions**
3. Click **Set up Auth** to generate your configuration
4. Copy these environment variables to `.env.local`:
   - `NEXT_PUBLIC_STACK_PROJECT_ID`
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
   - `STACK_SECRET_SERVER_KEY`
   - `DATABASE_URL`

### 2. Set up Google AI API

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env.local`:
   - `GEMINI_API_KEY`

### 3. Install dependencies and run migrations

```bash
# Install all dependencies
npm install

# Generate database migrations
npm run drizzle:generate

# Apply migrations to your database
npm run drizzle:migrate
```

### 4. Start the development server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application running. Sign in and start adding bookmarks!

## How It Works

### Bookmark Processing Pipeline

1. **User submits a URL** with optional note and tags
2. **URL normalization** - Removes tracking parameters, www prefix, etc.
3. **AI Analysis** - Google Gemini 2.5 Flash uses URL Context and Grounding to:
   - Fetch and analyze the web page content
   - Generate a human-friendly title
   - Create short summary (1-2 sentences)
   - Create detailed multi-paragraph summary
   - Detect content language
   - Generate 3-5 relevant tags
   - Identify content category
4. **Database storage** - Saves all data with full-text search indexing
5. **Status update** - Marks as `processed` or `failed`

### Technology Details

**URL Context + Grounding**: Instead of manually extracting HTML content, the app uses Gemini's built-in capabilities:

- **URL Context Tool**: Directly fetches and processes content from the provided URL
- **Google Search Grounding**: Provides additional web context when needed
- Supports multiple formats: HTML, PDF, images, JSON, and more
- Uses cached content when available for cost optimization

### Database Schema

- **users** - User accounts
- **bookmarks** - Core bookmark data (URL, title, description, status)
- **bookmark_contents** - Extracted content and AI summaries
- **tags** - User-specific tags (normalized)
- **bookmark_tags** - Many-to-many relationship

### API Routes

- `POST /api/bookmarks` - Create new bookmark
- `GET /api/bookmarks` - List with search/filter
- `GET /api/bookmarks/[id]` - Get single bookmark
- `POST /api/bookmarks/[id]/reprocess` - Retry failed processing
- `GET /api/tags` - Get all tags with counts

## Project Structure

```
app/
├── api/
│   ├── bookmarks/
│   │   ├── [id]/
│   │   │   ├── route.ts           # GET single bookmark
│   │   │   └── reprocess/
│   │   │       └── route.ts       # POST retry processing
│   │   └── route.ts               # POST create, GET list bookmarks
│   └── tags/
│       └── route.ts               # GET all tags with counts
├── b/
│   └── [id]/
│       └── page.tsx               # Bookmark detail page
├── handler/
│   └── [...stack]/
│       └── page.tsx               # Stack Auth handler
├── schema/
│   └── schema.ts                  # Drizzle ORM schema (all tables)
├── bookmarks-list.tsx             # Main bookmarks list component
├── bookmarks-page.tsx             # Bookmarks page wrapper
├── add-bookmark.tsx               # Add bookmark form component
├── db.tsx                         # Database helper with auth
├── header.tsx                     # App header component
├── layout.tsx                     # Root layout
├── page.tsx                       # Home page
└── stack.tsx                      # Stack Auth configuration

components/
├── bookmarks/
│   ├── bookmark-card.tsx          # Bookmark card UI component
│   ├── favicon.tsx                # Favicon display component
│   └── search-filter.tsx          # Search and tag filter UI
└── ui/
    ├── button.tsx                 # shadcn/ui button
    ├── card.tsx                   # shadcn/ui card
    └── input.tsx                  # shadcn/ui input

lib/
├── bookmark-utils.ts              # URL normalization, tag management
├── bookmark-processor.ts          # Main bookmark processing pipeline
├── llm-client.ts                  # Google Gemini AI integration (URL Context + Grounding)
└── utils.ts                       # General utilities (cn helper)

drizzle/
├── 0000_lean_dragon_man.sql       # Initial migration
├── 0001_dry_caretaker.sql         # Bookmarks schema migration
├── 0002_add_gin_index.sql         # Full-text search index
└── meta/                          # Drizzle metadata
    ├── _journal.json
    ├── 0000_snapshot.json
    └── 0001_snapshot.json
```

## Production Setup

- Neon DB lives here: https://console.neon.tech/app/projects/shiny-sunset-02500855
- Deployed on Vercel: https://vercel.com/prakhars-projects-76dc8cec/bookmarks

## Future Enhancements

- Background job processing for bookmark analysis
- Semantic search with pgvector embeddings
- Export/import functionality
