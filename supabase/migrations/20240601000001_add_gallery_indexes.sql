-- Migration: Add performance indexes for gallery queries
-- This resolves the "canceling statement due to statement timeout" (code 57014)
-- when loading the public gallery photos.

-- 1. Index on is_public for filtering public photos
CREATE INDEX IF NOT EXISTS idx_photos_is_public ON photos (is_public);

-- 2. Index on timestamp for ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_photos_timestamp_desc ON photos ("timestamp" DESC);

-- 3. Composite index for the gallery query: WHERE is_public = true ORDER BY timestamp DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_photos_public_timestamp_desc 
  ON photos (is_public, "timestamp" DESC);

-- 4. Index on event_id if frequently used for filtering by event
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos (event_id);

-- Note: If the photos table has grown very large (>100k rows), consider also:
-- - VACUUM ANALYZE photos; (to update statistics for the query planner)
-- - Increasing statement_timeout temporarily for the migration:
--   SET statement_timeout = '120s';

