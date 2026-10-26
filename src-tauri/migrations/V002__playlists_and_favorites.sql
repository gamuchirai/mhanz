-- Migration V002: Add liked_at timestamp and playlist metadata enhancements

ALTER TABLE tracks ADD COLUMN liked_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_tracks_favorite_liked ON tracks(is_favorite, liked_at DESC);

ALTER TABLE playlists ADD COLUMN is_curated INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_playlists_favorite ON playlists(is_favorite);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_composite ON playlist_tracks(playlist_id, position);
