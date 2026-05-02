-- Add photos array to buildings for multi-image gallery support
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT '{}';
