# Key Learnings

## Session 1: Tag Merging Issue

**Problem**: User-provided tags in POST /api/bookmarks were being overwritten by LLM-generated tags

**Root Cause Flow**:

1. User sends tags in POST request → Tags saved to DB (line 87 in route.ts)
2. `processBookmark()` runs → LLM generates tags (line 120-121 in bookmark-processor.ts)
3. `updateBookmarkTags()` DELETES all existing tags and replaces with LLM tags (line 123-125 in bookmark-utils.ts)
4. Result: User tags lost

**Key Functions Involved**:

- `app/api/bookmarks/route.ts:84-88` - Saves user-provided tags
- `lib/bookmark-processor.ts:118-122` - Calls LLM and updates tags
- `lib/bookmark-utils.ts:117-136` - **Deletes and replaces tags (problem)**

**Solution**: Modified `updateBookmarkTags()` to merge tags instead of replacing:

```typescript
// Old: Delete all → Insert new
// New: Fetch existing → Merge with new → Delete all → Insert merged
```

**Pattern to Remember**: When building APIs that combine user input with automated enrichment:

- Always check if functions downstream are destructive (delete/replace) vs additive
- Tag systems should merge by default, not replace
- Consider idempotency - what happens if the same function is called multiple times?
