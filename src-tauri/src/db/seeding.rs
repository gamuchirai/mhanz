//! Database initial seeding for default playlist containers.

use rusqlite::{params, Connection};
use std::time::{SystemTime, UNIX_EPOCH};

use super::error::DatabaseError;
use super::playlist_repo::count_playlists;

/// Default sample playlist definition.
struct SamplePlaylist {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    gradient_preset: &'static str,
    is_curated: bool,
}

const DEFAULT_SAMPLE_PLAYLISTS: &[SamplePlaylist] = &[
    SamplePlaylist {
        id: "playlist-1",
        name: "Late Night Drive",
        description: "Atmospheric beats and nocturnal melodies for midnight highway cruising.",
        gradient_preset: "late-night",
        is_curated: false,
    },
    SamplePlaylist {
        id: "playlist-2",
        name: "Acoustic Mornings",
        description: "Gentle acoustic strings, morning coffee, and warm golden hour light.",
        gradient_preset: "acoustic-wood",
        is_curated: false,
    },
    SamplePlaylist {
        id: "playlist-3",
        name: "Heartbreak Diaries",
        description: "Melancholic harmonies, introspective vocals, and rainy city nights.",
        gradient_preset: "midnight-indigo",
        is_curated: false,
    },
    SamplePlaylist {
        id: "playlist-4",
        name: "Good Vibes",
        description: "Uplifting rhythms, vibrant energy, and feel-good weekend anthems.",
        gradient_preset: "sunset-amber",
        is_curated: false,
    },
    SamplePlaylist {
        id: "playlist-5",
        name: "Midnight Essentials",
        description: "Handcrafted selections from the Mumhanzi editorial desk.",
        gradient_preset: "velvet-glow",
        is_curated: true,
    },
];

/// Seeds initial sample playlist containers transactionally if the playlists table is empty.
pub fn seed_default_playlists_if_empty(conn: &mut Connection) -> Result<usize, DatabaseError> {
    let existing_count = count_playlists(conn)?;
    if existing_count > 0 {
        return Ok(0);
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let tx = conn
        .transaction()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    let mut seeded = 0;
    for sample in DEFAULT_SAMPLE_PLAYLISTS {
        let is_curated_int = if sample.is_curated { 1 } else { 0 };
        tx.execute(
            r#"
            INSERT INTO playlists (
                id, name, description, cover_art_path, gradient_preset,
                is_favorite, is_curated, created_at, updated_at
            ) VALUES (?1, ?2, ?3, NULL, ?4, 0, ?5, ?6, ?6)
            "#,
            params![
                sample.id,
                sample.name,
                sample.description,
                sample.gradient_preset,
                is_curated_int,
                now
            ],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
        seeded += 1;
    }

    tx.commit()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(seeded)
}
