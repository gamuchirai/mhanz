-- Migration V003: Fast Full Text Search Index and Synchronization Triggers

-- 1. Create B Tree locator table for fast rowid lookups on deletion and update
CREATE TABLE IF NOT EXISTS search_index_entries (
    rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_entries_lookup
ON search_index_entries(entity_type, entity_id);

-- 2. Create FTS5 virtual table using rowid mapped structure
CREATE VIRTUAL TABLE IF NOT EXISTS library_search_index USING fts5(
    title,
    subtitle,
    secondary_text,
    tokenize = 'unicode61 remove_diacritics 2'
);

-- 3. Populate initial records for existing tracks
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'track', id FROM tracks;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, t.title, t.artist_name, coalesce(t.album_name, '') || ' ' || coalesce(t.genre, '')
FROM tracks t
JOIN search_index_entries e ON e.entity_type = 'track' AND e.entity_id = t.id;

-- 4. Populate initial records for existing albums
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'album', id FROM albums;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, a.title, a.artist_name, coalesce(a.genre, '') || ' ' || coalesce(cast(a.year as text), '')
FROM albums a
JOIN search_index_entries e ON e.entity_type = 'album' AND e.entity_id = a.id;

-- 5. Populate initial records for existing artists
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'artist', id FROM artists;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, ar.name, '', coalesce(ar.bio, '')
FROM artists ar
JOIN search_index_entries e ON e.entity_type = 'artist' AND e.entity_id = ar.id;

-- 6. Populate initial records for existing playlists
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'playlist', id FROM playlists;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, p.name, coalesce(p.description, ''), ''
FROM playlists p
JOIN search_index_entries e ON e.entity_type = 'playlist' AND e.entity_id = p.id;

-- 7. Automated triggers for track synchronization (targeted to text columns only)
CREATE TRIGGER IF NOT EXISTS trg_tracks_ai AFTER INSERT ON tracks BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('track', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.title, new.artist_name, coalesce(new.album_name, '') || ' ' || coalesce(new.genre, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_ad AFTER DELETE ON tracks BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'track' AND entity_id = old.id
    );
    DELETE FROM search_index_entries WHERE entity_type = 'track' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_au AFTER UPDATE OF title, artist_name, album_name, genre ON tracks BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'track' AND entity_id = old.id
    );
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.title, new.artist_name, coalesce(new.album_name, '') || ' ' || coalesce(new.genre, '')
    FROM search_index_entries e WHERE e.entity_type = 'track' AND e.entity_id = new.id;
END;

-- 8. Automated triggers for album synchronization
CREATE TRIGGER IF NOT EXISTS trg_albums_ai AFTER INSERT ON albums BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('album', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.title, new.artist_name, coalesce(new.genre, '') || ' ' || coalesce(cast(new.year as text), ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_albums_ad AFTER DELETE ON albums BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'album' AND entity_id = old.id
    );
    DELETE FROM search_index_entries WHERE entity_type = 'album' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_albums_au AFTER UPDATE OF title, artist_name, genre, year ON albums BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'album' AND entity_id = old.id
    );
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.title, new.artist_name, coalesce(new.genre, '') || ' ' || coalesce(cast(new.year as text), '')
    FROM search_index_entries e WHERE e.entity_type = 'album' AND e.entity_id = new.id;
END;

-- 9. Automated triggers for artist synchronization
CREATE TRIGGER IF NOT EXISTS trg_artists_ai AFTER INSERT ON artists BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('artist', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.name, '', coalesce(new.bio, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_artists_ad AFTER DELETE ON artists BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'artist' AND entity_id = old.id
    );
    DELETE FROM search_index_entries WHERE entity_type = 'artist' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_artists_au AFTER UPDATE OF name, bio ON artists BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'artist' AND entity_id = old.id
    );
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.name, '', coalesce(new.bio, '')
    FROM search_index_entries e WHERE e.entity_type = 'artist' AND e.entity_id = new.id;
END;

-- 10. Automated triggers for playlist synchronization
CREATE TRIGGER IF NOT EXISTS trg_playlists_ai AFTER INSERT ON playlists BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('playlist', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.name, coalesce(new.description, ''), '');
END;

CREATE TRIGGER IF NOT EXISTS trg_playlists_ad AFTER DELETE ON playlists BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'playlist' AND entity_id = old.id
    );
    DELETE FROM search_index_entries WHERE entity_type = 'playlist' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_playlists_au AFTER UPDATE OF name, description ON playlists BEGIN
    DELETE FROM library_search_index WHERE rowid IN (
        SELECT rowid FROM search_index_entries WHERE entity_type = 'playlist' AND entity_id = old.id
    );
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.name, coalesce(new.description, ''), ''
    FROM search_index_entries e WHERE e.entity_type = 'playlist' AND e.entity_id = new.id;
END;
