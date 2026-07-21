-- =============================================================
-- Storage Row-Level Security (RLS) Policies for photobooth-media bucket
-- =============================================================
-- Run this ENTIRE script in your Supabase Dashboard > SQL Editor.
-- This is a STANDALONE script: it creates the bucket if missing,
-- grants public/anonymous access, and is safe to re-run multiple times.
-- Each step uses exception handling to avoid permission errors
-- for non-owner roles (e.g., when you are not the table owner).
-- =============================================================

-- 0. Ensure the storage bucket exists (does nothing if already present)
--    Wrap in DO block to gracefully handle permission edge cases.
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('photobooth-media', 'photobooth-media', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Step 0 (bucket creation) skipped: %', SQLERRM;
END $$;

-- 1. Ensure RLS is enabled on storage.objects.
--    In Supabase, RLS is already enabled on storage.objects by default.
--    This step is wrapped to avoid "must be owner of table objects" errors.
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Step 1 (RLS enable) skipped (already enabled?): %', SQLERRM;
END $$;

-- 2. Drop any existing policies for this bucket (to avoid duplicates on re-run)
DROP POLICY IF EXISTS "Public SELECT photobooth-media" ON storage.objects;
DROP POLICY IF EXISTS "Public INSERT photobooth-media" ON storage.objects;
DROP POLICY IF EXISTS "Public UPDATE photobooth-media" ON storage.objects;
DROP POLICY IF EXISTS "Public DELETE photobooth-media" ON storage.objects;

-- 3. SELECT policy: Allow anyone (including anonymous users) to view/download files
CREATE POLICY "Public SELECT photobooth-media" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'photobooth-media');

-- 4. INSERT policy: Allow anyone to upload files (used by FrameDesigner and photo capture)
CREATE POLICY "Public INSERT photobooth-media" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'photobooth-media');

-- 5. UPDATE policy: Allow anyone to update files (e.g., upsert existing files)
CREATE POLICY "Public UPDATE photobooth-media" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'photobooth-media')
    WITH CHECK (bucket_id = 'photobooth-media');

-- 6. DELETE policy: Allow anyone to delete files (admin operations)
CREATE POLICY "Public DELETE photobooth-media" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'photobooth-media');

-- =============================================================
-- Verification Queries (run separately to confirm)
-- =============================================================
-- SELECT * FROM storage.buckets WHERE id = 'photobooth-media';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%photobooth-media%';

