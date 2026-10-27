//! Full text search repository leveraging SQLite FTS5 virtual tables and dynamic genre aggregation.

use std::time::Instant;

use rusqlite::{params, Connection};

use super::error::DatabaseError;
use super::models::{AlbumDto, ArtistDto, PlaylistDto, SearchGenreDto, SearchResultsDto};
use super::track_repo::map_track_row;

/// Procedural gradient palette options used for deterministic genre card rendering.
const GENRE_GRADIENTS: &[&str] = &[
    "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
    "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
];

/// Computes a deterministic CSS gradient string from a genre title name.
pub fn compute_genre_gradient(genre: &str) -> String {
    let mut hash: u32 = 0;
    for b in genre.as_bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(*b as u32);
    }
    let idx = (hash as usize) % GENRE_GRADIENTS.len();
    GENRE_GRADIENTS[idx].to_string()
}

/// Sanitizes a raw input search term into SQLite FTS5 prefix match tokens.
/// Trims whitespace, cleans punctuation, and appends prefix wildcards.
pub fn sanitize_fts5_query(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut tokens = Vec::new();
    for part in trimmed.split(|c: char| !c.is_alphanumeric()) {
        let clean: String = part.chars().filter(|c| c.is_alphanumeric()).collect();
        if !clean.is_empty() {
            tokens.push(format!("{}*", clean));
        }
    }

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" "))
    }
}

/// Executes unified full text search across tracks, albums, artists, playlists, and genres.
pub fn search_library(
    conn: &Connection,
    raw_query: &str,
    category: Option<&str>,
    limit: Option<u32>,
) -> Result<SearchResultsDto, DatabaseError> {
    let start_time = Instant::now();
    let trimmed_query = raw_query.trim();

    let fts_query = match sanitize_fts5_query(trimmed_query) {
        Some(q) => q,
        None => {
            return Ok(SearchResultsDto {
                query: trimmed_query.to_string(),
                tracks: Vec::new(),
                albums: Vec::new(),
                artists: Vec::new(),
                playlists: Vec::new(),
                genres: Vec::new(),
                total_matches: 0,
                execution_time_ms: 0.0,
            });
        }
    };

    let prefix_like = format!("{}%", trimmed_query);
    let category_norm = category.unwrap_or("all").to_lowercase();

    let (track_cap, album_cap, artist_cap, playlist_cap, genre_cap) = match category_norm.as_str() {
        "songs" | "tracks" => (limit.unwrap_or(50), 0, 0, 0, 0),
        "albums" => (0, limit.unwrap_or(50), 0, 0, 0),
        "artists" => (0, 0, limit.unwrap_or(50), 0, 0),
        "playlists" => (0, 0, 0, limit.unwrap_or(50), 0),
        "genres" => (0, 0, 0, 0, limit.unwrap_or(20)),
        _ => (limit.unwrap_or(20), 8, 8, 6, 6),
    };

    // 1. Matched Tracks
    let mut tracks = Vec::new();
    if track_cap > 0 {
        let mut track_stmt = conn
            .prepare(
                r#"
                WITH fts AS (
                    SELECT rowid, bm25(library_search_index) AS score
                    FROM library_search_index
                    WHERE library_search_index MATCH ?1
                    LIMIT -1
                )
                SELECT
                    t.id, t.file_path, t.title, t.artist_id, t.artist_name, t.album_id, t.album_name, t.album_artist,
                    t.duration, t.year, t.genre, t.disc_number, t.track_number, t.bitrate, t.format,
                    t.is_favorite, t.liked_at, t.play_count, t.cover_art_path, t.last_played_at, t.file_modified_at,
                    t.file_size_bytes, t.folder_id, t.created_at, t.updated_at
                FROM fts
                JOIN search_index_entries e ON e.rowid = fts.rowid AND e.entity_type = 'track'
                JOIN tracks t ON t.id = e.entity_id
                ORDER BY
                    CASE
                        WHEN LOWER(t.title) = LOWER(?2) THEN 0
                        WHEN LOWER(t.title) LIKE LOWER(?3) THEN 1
                        ELSE 2
                    END ASC,
                    fts.score - (t.play_count * 0.05) ASC
                LIMIT ?4
                "#,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let track_iter = track_stmt
            .query_map(
                params![fts_query, trimmed_query, prefix_like, track_cap],
                map_track_row,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for item in track_iter {
            tracks.push(item?);
        }
    }

    // 2. Matched Albums
    let mut albums = Vec::new();
    if album_cap > 0 {
        let mut album_stmt = conn
            .prepare(
                r#"
                WITH fts AS (
                    SELECT rowid, bm25(library_search_index) AS score
                    FROM library_search_index
                    WHERE library_search_index MATCH ?1
                    LIMIT -1
                )
                SELECT
                    a.id, a.title, a.artist_id, a.artist_name, a.year, a.genre,
                    a.cover_art_path, a.total_discs,
                    COUNT(t.id) as track_count,
                    a.created_at, a.updated_at
                FROM fts
                JOIN search_index_entries e ON e.rowid = fts.rowid AND e.entity_type = 'album'
                JOIN albums a ON a.id = e.entity_id
                LEFT JOIN tracks t ON t.album_id = a.id
                GROUP BY a.id
                ORDER BY
                    CASE
                        WHEN LOWER(a.title) = LOWER(?2) THEN 0
                        WHEN LOWER(a.title) LIKE LOWER(?3) THEN 1
                        ELSE 2
                    END ASC,
                    MIN(fts.score) ASC
                LIMIT ?4
                "#,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let album_iter = album_stmt
            .query_map(
                params![fts_query, trimmed_query, prefix_like, album_cap],
                |row| {
                    let trk_cnt: i64 = row.get(8)?;
                    Ok(AlbumDto {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        artist_id: row.get(2)?,
                        artist_name: row.get(3)?,
                        year: row.get(4)?,
                        genre: row.get(5)?,
                        cover_art_path: row.get(6)?,
                        total_discs: row.get(7)?,
                        track_count: trk_cnt as u32,
                        created_at: row.get(9)?,
                        updated_at: row.get(10)?,
                    })
                },
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for item in album_iter {
            albums.push(item?);
        }
    }

    // 3. Matched Artists
    let mut artists = Vec::new();
    if artist_cap > 0 {
        let mut artist_stmt = conn
            .prepare(
                r#"
                WITH fts AS (
                    SELECT rowid, bm25(library_search_index) AS score
                    FROM library_search_index
                    WHERE library_search_index MATCH ?1
                    LIMIT -1
                )
                SELECT
                    ar.id, ar.name, ar.bio, ar.avatar_path,
                    COUNT(DISTINCT t.id) as track_count,
                    COUNT(DISTINCT al.id) as album_count,
                    ar.created_at, ar.updated_at
                FROM fts
                JOIN search_index_entries e ON e.rowid = fts.rowid AND e.entity_type = 'artist'
                JOIN artists ar ON ar.id = e.entity_id
                LEFT JOIN tracks t ON t.artist_id = ar.id
                LEFT JOIN albums al ON al.artist_id = ar.id
                GROUP BY ar.id
                ORDER BY
                    CASE
                        WHEN LOWER(ar.name) = LOWER(?2) THEN 0
                        WHEN LOWER(ar.name) LIKE LOWER(?3) THEN 1
                        ELSE 2
                    END ASC,
                    MIN(fts.score) ASC
                LIMIT ?4
                "#,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let artist_iter = artist_stmt
            .query_map(
                params![fts_query, trimmed_query, prefix_like, artist_cap],
                |row| {
                    let trk_cnt: i64 = row.get(4)?;
                    let alb_cnt: i64 = row.get(5)?;
                    Ok(ArtistDto {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        bio: row.get(2)?,
                        avatar_path: row.get(3)?,
                        track_count: trk_cnt as u32,
                        album_count: alb_cnt as u32,
                        created_at: row.get(6)?,
                        updated_at: row.get(7)?,
                    })
                },
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for item in artist_iter {
            artists.push(item?);
        }
    }

    // 4. Matched Playlists
    let mut playlists = Vec::new();
    if playlist_cap > 0 {
        let mut playlist_stmt = conn
            .prepare(
                r#"
                WITH fts AS (
                    SELECT rowid, bm25(library_search_index) AS score
                    FROM library_search_index
                    WHERE library_search_index MATCH ?1
                    LIMIT -1
                )
                SELECT
                    p.id, p.name, p.description, p.cover_art_path, p.gradient_preset,
                    p.is_favorite, p.is_curated,
                    COUNT(pt.id) as track_count,
                    p.created_at, p.updated_at
                FROM fts
                JOIN search_index_entries e ON e.rowid = fts.rowid AND e.entity_type = 'playlist'
                JOIN playlists p ON p.id = e.entity_id
                LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
                GROUP BY p.id
                ORDER BY
                    CASE
                        WHEN LOWER(p.name) = LOWER(?2) THEN 0
                        WHEN LOWER(p.name) LIKE LOWER(?3) THEN 1
                        ELSE 2
                    END ASC,
                    MIN(fts.score) ASC
                LIMIT ?4
                "#,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let playlist_iter = playlist_stmt
            .query_map(
                params![fts_query, trimmed_query, prefix_like, playlist_cap],
                |row| {
                    let is_fav_int: i32 = row.get(5)?;
                    let is_curated_int: i32 = row.get(6)?;
                    let trk_cnt: i64 = row.get(7)?;
                    Ok(PlaylistDto {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: row.get(2)?,
                        cover_art_path: row.get(3)?,
                        gradient_preset: row.get(4)?,
                        is_favorite: is_fav_int == 1,
                        is_curated: is_curated_int == 1,
                        track_count: trk_cnt as u32,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                },
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for item in playlist_iter {
            playlists.push(item?);
        }
    }

    // 5. Dynamic Genre Aggregation
    let mut genres = Vec::new();
    if genre_cap > 0 {
        let genre_pattern = format!("%{}%", trimmed_query);
        let mut genre_stmt = conn
            .prepare(
                r#"
                SELECT genre, COUNT(*) as track_count
                FROM tracks
                WHERE genre IS NOT NULL AND TRIM(genre) != '' AND genre LIKE ?1
                GROUP BY genre
                ORDER BY
                    CASE
                        WHEN LOWER(genre) = LOWER(?2) THEN 0
                        WHEN LOWER(genre) LIKE LOWER(?3) THEN 1
                        ELSE 2
                    END ASC,
                    track_count DESC
                LIMIT ?4
                "#,
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let genre_iter = genre_stmt
            .query_map(
                params![genre_pattern, trimmed_query, prefix_like, genre_cap],
                |row| {
                    let name: String = row.get(0)?;
                    let count_int: i64 = row.get(1)?;
                    let gradient = compute_genre_gradient(&name);
                    Ok(SearchGenreDto {
                        name,
                        track_count: count_int as u32,
                        gradient,
                    })
                },
            )
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for item in genre_iter {
            genres.push(item?);
        }
    }

    let total_matches = (tracks.len() + albums.len() + artists.len() + playlists.len() + genres.len()) as u32;
    let execution_time_ms = start_time.elapsed().as_secs_f64() * 1000.0;

    Ok(SearchResultsDto {
        query: trimmed_query.to_string(),
        tracks,
        albums,
        artists,
        playlists,
        genres,
        total_matches,
        execution_time_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::{configure_pragmas, create_migrations};
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        configure_pragmas(&mut conn).unwrap();
        let migrations = create_migrations();
        migrations.to_latest(&mut conn).unwrap();
        conn
    }

    #[test]
    fn test_query_sanitizer() {
        assert_eq!(sanitize_fts5_query(""), None);
        assert_eq!(sanitize_fts5_query("   "), None);
        assert_eq!(sanitize_fts5_query("***---///"), None);
        assert_eq!(
            sanitize_fts5_query("Hello World"),
            Some("Hello* World*".to_string())
        );
        assert_eq!(
            sanitize_fts5_query("Midnight - City (Remix)"),
            Some("Midnight* City* Remix*".to_string())
        );
    }

    #[test]
    fn test_search_and_triggers_end_to_end() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO artists (id, name, bio, created_at, updated_at) VALUES ('art1', 'Daft Punk', 'Electronic duo', 100, 100)",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO albums (id, title, artist_id, artist_name, year, genre, created_at, updated_at) VALUES ('alb1', 'Discovery', 'art1', 'Daft Punk', 2001, 'Electronic', 100, 100)",
            [],
        ).unwrap();

        conn.execute(
            r#"INSERT INTO tracks (
                id, file_path, title, artist_id, artist_name, album_id, album_name, duration,
                genre, disc_number, format, file_modified_at, file_size_bytes, created_at, updated_at, play_count
            ) VALUES (
                'trk1', '/music/one_more_time.mp3', 'One More Time', 'art1', 'Daft Punk', 'alb1', 'Discovery', 320.0,
                'Electronic', 1, 'mp3', 1000, 5000000, 100, 100, 42
            )"#,
            [],
        ).unwrap();

        conn.execute(
            r#"INSERT INTO tracks (
                id, file_path, title, artist_id, artist_name, album_id, album_name, duration,
                genre, disc_number, format, file_modified_at, file_size_bytes, created_at, updated_at, play_count
            ) VALUES (
                'trk2', '/music/aerodynamic.mp3', 'Aerodynamic', 'art1', 'Daft Punk', 'alb1', 'Discovery', 210.0,
                'Electronic', 1, 'mp3', 1000, 4000000, 100, 100, 10
            )"#,
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO playlists (id, name, description, created_at, updated_at) VALUES ('ply1', 'Daft Workout', 'Upbeat french house', 100, 100)",
            [],
        ).unwrap();

        // 1. Search for "Daft" - matches artist, track, album, playlist
        let res = search_library(&conn, "Daft", None, None).unwrap();
        assert!(res.total_matches > 0);
        assert_eq!(res.artists.len(), 1);
        assert_eq!(res.artists[0].name, "Daft Punk");
        assert_eq!(res.playlists.len(), 1);
        assert_eq!(res.playlists[0].name, "Daft Workout");

        // 2. Search for exact track "One More Time"
        let track_res = search_library(&conn, "One More Time", Some("songs"), None).unwrap();
        assert_eq!(track_res.tracks.len(), 1);
        assert_eq!(track_res.tracks[0].title, "One More Time");
        assert!(track_res.execution_time_ms < 50.0);

        // 3. Dynamic genre search
        let genre_res = search_library(&conn, "Elect", Some("genres"), None).unwrap();
        assert_eq!(genre_res.genres.len(), 1);
        assert_eq!(genre_res.genres[0].name, "Electronic");
        assert_eq!(genre_res.genres[0].track_count, 2);
        assert!(!genre_res.genres[0].gradient.is_empty());

        // 4. Update track title trigger test
        conn.execute(
            "UPDATE tracks SET title = 'One More Time (2026 Remaster)' WHERE id = 'trk1'",
            [],
        ).unwrap();

        let updated_res = search_library(&conn, "Remaster", Some("songs"), None).unwrap();
        assert_eq!(updated_res.tracks.len(), 1);
        assert_eq!(updated_res.tracks[0].id, "trk1");

        // 5. Playback count isolation test (AC-4)
        // Updating only play_count or is_favorite must not fail or break search
        conn.execute(
            "UPDATE tracks SET play_count = 100, is_favorite = 1 WHERE id = 'trk1'",
            [],
        ).unwrap();
        let after_play_res = search_library(&conn, "Remaster", Some("songs"), None).unwrap();
        assert_eq!(after_play_res.tracks.len(), 1);
        assert_eq!(after_play_res.tracks[0].play_count, 100);
        assert!(after_play_res.tracks[0].is_favorite);

        // 6. Delete track trigger test
        conn.execute("DELETE FROM tracks WHERE id = 'trk2'", []).unwrap();
        let deleted_res = search_library(&conn, "Aerodynamic", Some("songs"), None).unwrap();
        assert_eq!(deleted_res.tracks.len(), 0);
    }
}
