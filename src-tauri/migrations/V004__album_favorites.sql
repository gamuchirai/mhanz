-- Migration V004: Albums favorites and duration support
-- Adds is_favorite and favorited_at to albums table with composite index for sorting and filtering.

ALTER TABLE albums ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE albums ADD COLUMN favorited_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_albums_favorite_date ON albums(is_favorite, favorited_at DESC);
