-- Add index on (grail_id, found) for fast found-item counts
CREATE INDEX IF NOT EXISTS "grail_entries_grail_id_found_idx" ON "grail_entries"("grail_id", "found");

-- Add index on (is_active, category) for fast item filtering
CREATE INDEX IF NOT EXISTS "items_is_active_category_idx" ON "items"("is_active", "category");
