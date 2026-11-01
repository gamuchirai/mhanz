-- Migration V005: Listening history table and popular tracks index

CREATE TABLE IF NOT EXISTS listening_history (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    played_at INTEGER NOT NULL,
    context_title TEXT,
    context_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_listening_history_played_at 
ON listening_history(played_at DESC);

CREATE INDEX IF NOT EXISTS idx_listening_history_track_id 
ON listening_history(track_id);

CREATE INDEX IF NOT EXISTS idx_tracks_play_count 
ON tracks(play_count DESC, title ASC);
