-- SQL Schema for Snapazzhot (Supabase / PostgreSQL)

-- 1. Create ENUM Types (if matching strict React Types)
DO $$ BEGIN
    CREATE TYPE layout_type_enum AS ENUM ('strip', 'grid', 'single');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE media_type_enum AS ENUM ('photo', 'gif', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE log_type_enum AS ENUM ('system', 'camera', 'printer', 'gallery', 'event', 'email', 'auth');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create templates table (FrameTemplate)
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    preview TEXT,
    canvas_width INTEGER DEFAULT 600,
    canvas_height INTEGER DEFAULT 1800,
    photo_count INTEGER NOT NULL DEFAULT 4,
    elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    frame_png TEXT,
    background_image TEXT,
    print_size VARCHAR(50) NOT NULL DEFAULT 'Strips',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create events table (AppEvent)
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(255) NOT NULL,
    frame_id VARCHAR(100), -- References templates.id or custom
    countdown INTEGER NOT NULL DEFAULT 5,
    photo_count INTEGER NOT NULL DEFAULT 4,
    layout_type layout_type_enum NOT NULL DEFAULT 'strip',
    theme_color VARCHAR(50) DEFAULT '#db2777',
    qr_expired_minutes INTEGER DEFAULT 60,
    email_template TEXT,
    background_image TEXT,
    layout_positions JSONB DEFAULT '[]'::jsonb,
    template_id VARCHAR(100), -- Optional direct reference
    enable_video BOOLEAN DEFAULT FALSE,
    video_quality VARCHAR(50) DEFAULT 'medium',
    enable_audio BOOLEAN DEFAULT FALSE,
    enable_gif BOOLEAN DEFAULT FALSE,
    gif_resolution INTEGER DEFAULT 360,
    gif_delay INTEGER DEFAULT 500,
    mirror_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create photos table (PhotoRecord)
CREATE TABLE IF NOT EXISTS photos (
    id VARCHAR(100) PRIMARY KEY,
    url TEXT NOT NULL,
    type media_type_enum NOT NULL DEFAULT 'photo',
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    prints_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    username VARCHAR(100) DEFAULT 'Guest',
    template_name VARCHAR(255),
    like_count INTEGER DEFAULT 0,
    mirror_enabled BOOLEAN DEFAULT FALSE,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 5. Create activity_logs table (ActivityLog)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type log_type_enum NOT NULL DEFAULT 'system',
    message TEXT NOT NULL
);

-- 6. Create print_job_logs table (PrintJobLog)
CREATE TABLE IF NOT EXISTS print_job_logs (
    id VARCHAR(100) PRIMARY KEY,
    photo_id VARCHAR(100) REFERENCES photos(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    size VARCHAR(50) NOT NULL,
    copies INTEGER DEFAULT 1,
    status VARCHAR(100) NOT NULL,
    printer_name VARCHAR(255) NOT NULL
);

-- 7. Create email_logs table (EmailLog)
CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    photo_id VARCHAR(100) REFERENCES photos(id) ON DELETE CASCADE,
    download_url TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(100) NOT NULL
);

-- 8. Create system_settings table (SystemSettings)
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'default',
    theme VARCHAR(50) DEFAULT 'dark',
    logo TEXT,
    primary_color VARCHAR(50) DEFAULT '#db2777',
    smtp_host VARCHAR(255),
    smtp_user VARCHAR(255),
    cloud_storage_enabled BOOLEAN DEFAULT FALSE,
    auto_delete_days INTEGER DEFAULT 30,
    timezone VARCHAR(100) DEFAULT 'Asia/Jakarta',
    language VARCHAR(5) DEFAULT 'id'
);

-- Device simulator state is persisted in Supabase too; there is no local JSON
-- fallback for printer/camera configuration.
ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS printer_state JSONB,
    ADD COLUMN IF NOT EXISTS camera_state JSONB;

-- 9. Create Indexing for performance
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_is_public ON photos(is_public);
CREATE INDEX IF NOT EXISTS idx_print_logs_photo_id ON print_job_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_photo_id ON email_logs(photo_id);

-- 10. Seed Initial System Settings
INSERT INTO system_settings (id, theme, primary_color, timezone, language) 
VALUES ('default', 'dark', '#db2777', 'Asia/Jakarta', 'id')
ON CONFLICT (id) DO NOTHING;

-- 11. Storage bucket for all photo-booth media. This bucket is public so the
-- URLs stored in photos.url and photos.meta can be displayed/downloaded directly.
INSERT INTO storage.buckets (id, name, public)
VALUES ('photobooth-media', 'photobooth-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 12. Storage Row-Level Security (RLS) Policies for photobooth-media bucket
-- Required for anonymous/public uploads from FrameDesigner and photo capture.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- SELECT policy: Allow anyone to view/download files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public SELECT photobooth-media'
    ) THEN
        CREATE POLICY "Public SELECT photobooth-media" ON storage.objects
            FOR SELECT USING (bucket_id = 'photobooth-media');
    END IF;

    -- INSERT policy: Allow anyone to upload files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public INSERT photobooth-media'
    ) THEN
        CREATE POLICY "Public INSERT photobooth-media" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'photobooth-media');
    END IF;

    -- UPDATE policy: Allow anyone to update files (e.g., upsert)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public UPDATE photobooth-media'
    ) THEN
        CREATE POLICY "Public UPDATE photobooth-media" ON storage.objects
            FOR UPDATE USING (bucket_id = 'photobooth-media') WITH CHECK (bucket_id = 'photobooth-media');
    END IF;

    -- DELETE policy: Allow anyone to delete files (admin operations)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public DELETE photobooth-media'
    ) THEN
        CREATE POLICY "Public DELETE photobooth-media" ON storage.objects
            FOR DELETE USING (bucket_id = 'photobooth-media');
    END IF;
END $$;
