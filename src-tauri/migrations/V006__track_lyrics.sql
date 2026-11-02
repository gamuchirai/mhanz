-- Migration V006: Track lyrics schema with companion and embedded support

CREATE TABLE IF NOT EXISTS track_lyrics (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL UNIQUE,
    has_lyrics INTEGER NOT NULL DEFAULT 0,
    is_synced INTEGER NOT NULL DEFAULT 0,
    plain_text TEXT,
    lines_json TEXT,
    source_type TEXT NOT NULL,
    source_file_path TEXT,
    source_modified_at INTEGER,
    user_offset_ms INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_track_lyrics_track_id ON track_lyrics(track_id);
