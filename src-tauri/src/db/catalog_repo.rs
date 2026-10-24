//! Catalog repository for querying albums, artists, discographies, and artist profiles.

use rusqlite::{params, Connection};

use super::error::DatabaseError;
use super::models::{AlbumDetailDto, AlbumDto, ArtistDto, ArtistProfileDto, TrackDto};
use super::track_repo::{map_track_row, TRACK_SELECT_FIELDS};

/// Returns total count of albums.
pub fn count_albums(conn: &Connection) -> Result<u64, DatabaseError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM albums", [], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
    Ok(count as u64)
}

/// Returns total count of artists.
pub fn count_artists(conn: &Connection) -> Result<u64, DatabaseError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM artists", [], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
    Ok(count as u64)
}

/// Retrieves all albums sorted alphabetically by title with track counts.
pub fn get_albums(conn: &Connection) -> Result<Vec<AlbumDto>, DatabaseError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                a.id, a.title, a.artist_id, a.artist_name, a.year, a.genre,
                a.cover_art_path, a.total_discs,
                COUNT(t.id) as track_count,
                a.created_at, a.updated_at
            FROM albums a
            LEFT JOIN tracks t ON t.album_id = a.id
            GROUP BY a.id
            ORDER BY a.title ASC
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let iter = stmt
        .query_map([], |row| {
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
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut list = Vec::new();
    for item_res in iter {
        list.push(item_res?);
    }
    Ok(list)
}

/// Retrieves detailed album metadata and full ordered tracklist.
pub fn get_album_details(
    conn: &Connection,
    id: &str,
) -> Result<Option<AlbumDetailDto>, DatabaseError> {
    let mut album_stmt = conn
        .prepare(
            r#"
            SELECT
                a.id, a.title, a.artist_id, a.artist_name, a.year, a.genre,
                a.cover_art_path, a.total_discs,
                COUNT(t.id) as track_count,
                a.created_at, a.updated_at
            FROM albums a
            LEFT JOIN tracks t ON t.album_id = a.id
            WHERE a.id = ?1
            GROUP BY a.id
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut album_iter = album_stmt
        .query_map(params![id], |row| {
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
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let album = match album_iter.next() {
        Some(res) => res?,
        None => return Ok(None),
    };

    let track_query = format!(
        "SELECT {} FROM tracks WHERE album_id = ?1 ORDER BY disc_number ASC, track_number ASC, title ASC",
        TRACK_SELECT_FIELDS
    );
    let mut track_stmt = conn
        .prepare(&track_query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let track_iter = track_stmt
        .query_map(params![id], map_track_row)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut tracks = Vec::new();
    for trk_res in track_iter {
        tracks.push(trk_res?);
    }

    Ok(Some(AlbumDetailDto { album, tracks }))
}

/// Retrieves all artists sorted alphabetically by name with aggregated track and album counts.
pub fn get_artists(conn: &Connection) -> Result<Vec<ArtistDto>, DatabaseError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                ar.id, ar.name, ar.bio, ar.avatar_path,
                COUNT(DISTINCT t.id) as track_count,
                COUNT(DISTINCT al.id) as album_count,
                ar.created_at, ar.updated_at
            FROM artists ar
            LEFT JOIN tracks t ON t.artist_id = ar.id
            LEFT JOIN albums al ON al.artist_id = ar.id
            GROUP BY ar.id
            ORDER BY ar.name ASC
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let iter = stmt
        .query_map([], |row| {
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
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut list = Vec::new();
    for item_res in iter {
        list.push(item_res?);
    }
    Ok(list)
}

/// Retrieves detailed artist profile with top played tracks and discography albums.
pub fn get_artist_profile(
    conn: &Connection,
    id: &str,
) -> Result<Option<ArtistProfileDto>, DatabaseError> {
    let mut artist_stmt = conn
        .prepare(
            r#"
            SELECT
                ar.id, ar.name, ar.bio, ar.avatar_path,
                COUNT(DISTINCT t.id) as track_count,
                COUNT(DISTINCT al.id) as album_count,
                ar.created_at, ar.updated_at
            FROM artists ar
            LEFT JOIN tracks t ON t.artist_id = ar.id
            LEFT JOIN albums al ON al.artist_id = ar.id
            WHERE ar.id = ?1
            GROUP BY ar.id
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut artist_iter = artist_stmt
        .query_map(params![id], |row| {
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
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let artist = match artist_iter.next() {
        Some(res) => res?,
        None => return Ok(None),
    };

    // Top tracks by play count
    let top_query = format!(
        "SELECT {} FROM tracks WHERE artist_id = ?1 ORDER BY play_count DESC, title ASC LIMIT 10",
        TRACK_SELECT_FIELDS
    );
    let mut top_stmt = conn
        .prepare(&top_query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let top_iter = top_stmt
        .query_map(params![id], map_track_row)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut top_tracks: Vec<TrackDto> = Vec::new();
    for t_res in top_iter {
        top_tracks.push(t_res?);
    }

    // Discography albums
    let mut alb_stmt = conn
        .prepare(
            r#"
            SELECT
                a.id, a.title, a.artist_id, a.artist_name, a.year, a.genre,
                a.cover_art_path, a.total_discs,
                COUNT(t.id) as track_count,
                a.created_at, a.updated_at
            FROM albums a
            LEFT JOIN tracks t ON t.album_id = a.id
            WHERE a.artist_id = ?1
            GROUP BY a.id
            ORDER BY a.year DESC, a.title ASC
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let alb_iter = alb_stmt
        .query_map(params![id], |row| {
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
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut albums = Vec::new();
    for a_res in alb_iter {
        albums.push(a_res?);
    }

    Ok(Some(ArtistProfileDto {
        artist,
        top_tracks,
        albums,
    }))
}

/// Upserts an artist record.
pub fn upsert_artist(conn: &mut Connection, artist: &ArtistDto) -> Result<(), DatabaseError> {
    conn.execute(
        r#"
        INSERT INTO artists (id, name, bio, avatar_path, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(name) DO UPDATE SET
            bio = excluded.bio,
            avatar_path = excluded.avatar_path,
            updated_at = excluded.updated_at
        "#,
        params![
            artist.id,
            artist.name,
            artist.bio,
            artist.avatar_path,
            artist.created_at,
            artist.updated_at
        ],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    Ok(())
}

/// Upserts an album record.
pub fn upsert_album(conn: &mut Connection, album: &AlbumDto) -> Result<(), DatabaseError> {
    conn.execute(
        r#"
        INSERT INTO albums (
            id, title, artist_id, artist_name, year, genre,
            cover_art_path, total_discs, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            artist_id = excluded.artist_id,
            artist_name = excluded.artist_name,
            year = excluded.year,
            genre = excluded.genre,
            cover_art_path = excluded.cover_art_path,
            total_discs = excluded.total_discs,
            updated_at = excluded.updated_at
        "#,
        params![
            album.id,
            album.title,
            album.artist_id,
            album.artist_name,
            album.year,
            album.genre,
            album.cover_art_path,
            album.total_discs,
            album.created_at,
            album.updated_at
        ],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    Ok(())
}
