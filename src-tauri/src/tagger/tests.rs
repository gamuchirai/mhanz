//! Tests for audio tag probing, base64 decoding, image caching, and writer mechanics.

use std::fs;
use std::path::Path;

use lofty::picture::{MimeType, Picture, PictureType};
use lofty::tag::{Accessor, ItemKey, Tag, TagType};

use super::writer::{cache_cover_image, decode_base64};

#[test]
fn test_decode_base64_valid_and_invalid() {
    let original = b"Hello Mutinhimira Music Player";
    // base64 encoded: SGVsbG8gTXV0aW5oaW1pcmEgTXVzaWMgUGxheWVy
    let encoded = "SGVsbG8gTXV0aW5oaW1pcmEgTXVzaWMgUGxheWVy";
    let decoded = decode_base64(encoded).expect("Should decode cleanly");
    expect_equal(&decoded, original);

    // Invalid character
    assert!(decode_base64("Invalid!@#$").is_err());
}

fn expect_equal(a: &[u8], b: &[u8]) {
    assert_eq!(a, b);
}

#[test]
fn test_cache_cover_image_size_cap() {
    let temp_dir = std::env::temp_dir().join(format!("test_cover_cap_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_dir);

    // 16 megabytes exceeds 15MB cap (AC-5)
    let large_buffer = vec![0u8; 16 * 1024 * 1024];
    let res = cache_cover_image(&large_buffer, Some("image/jpeg"), &temp_dir);
    assert!(res.is_err());
    assert!(res.unwrap_err().contains("15 megabyte"));

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_cache_cover_image_png_deduplication() {
    let temp_dir = std::env::temp_dir().join(format!("test_cover_dedup_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_dir);

    // Sample PNG header magic bytes
    let png_bytes = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01];
    let path1 = cache_cover_image(&png_bytes, None, &temp_dir).expect("Should cache PNG");
    assert!(path1.ends_with(".png"));
    assert!(Path::new(&path1).exists());

    // Second write should deduplicate to same path without error
    let path2 = cache_cover_image(&png_bytes, None, &temp_dir).expect("Should return cached");
    assert_eq!(path1, path2);

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_lofty_tag_operations() {
    let mut tag = Tag::new(TagType::Id3v2);
    tag.set_title("Test Title".to_string());
    tag.set_artist("Test Artist".to_string());
    tag.set_album("Test Album".to_string());
    tag.set_genre("Rock".to_string());
    tag.set_year(2024);
    tag.set_track(2);
    tag.set_disk(1);
    tag.insert_text(ItemKey::AlbumArtist, "Test Album Artist".to_string());

    assert_eq!(tag.title().as_deref(), Some("Test Title"));
    assert_eq!(tag.artist().as_deref(), Some("Test Artist"));
    assert_eq!(tag.album().as_deref(), Some("Test Album"));
    assert_eq!(tag.genre().as_deref(), Some("Rock"));
    assert_eq!(tag.year(), Some(2024));
    assert_eq!(tag.track(), Some(2));
    assert_eq!(tag.disk(), Some(1));

    // Pictures
    let data = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    let pic = Picture::new_unchecked(PictureType::CoverFront, Some(MimeType::Png), None, data);
    tag.push_picture(pic);
    assert_eq!(tag.pictures().len(), 1);

    // Remove pictures
    tag.remove_picture_type(PictureType::CoverFront);
    assert_eq!(tag.pictures().len(), 0);
}

#[test]
fn test_track_metadata_transaction_and_orphan_cleanup() {
    use crate::db::search_repo;
    use crate::db::DatabaseManager;
    use crate::tagger::models::{BatchTrackUpdates, CoverArtAction, SaveTrackTagsDto};
    use crate::tagger::repo::{
        save_batch_metadata_transaction, save_track_metadata_transaction,
        validate_path_in_library_folders,
    };
    use crate::tagger::writer::PhysicalWriteResult;

    let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");

    let temp_folder = std::env::temp_dir().join(format!("test_music_lib_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_folder);
    let sample_file = temp_folder.join("song1.mp3");
    let _ = fs::write(&sample_file, b"test audio content");

    let folder_str = temp_folder.to_string_lossy().to_string();
    let file_str = sample_file.to_string_lossy().to_string();

    // 1. Seed database with folder, old artist, old album, and track
    mgr.with_conn(|conn| {
        conn.execute(
            "INSERT INTO folders (id, path, added_at, is_active) VALUES ('f-1', ?1, 1000, 1)",
            rusqlite::params![folder_str],
        )?;

        conn.execute(
            "INSERT INTO artists (id, name, created_at, updated_at) VALUES ('art-old', 'Old Artist', 1000, 1000)",
            [],
        )?;

        conn.execute(
            r#"
            INSERT INTO albums (
                id, title, artist_id, artist_name, year, genre, total_discs, is_favorite, created_at, updated_at
            ) VALUES (
                'alb-1', 'Old Album', 'art-old', 'Old Artist', 2020, 'Pop', 1, 1, 1000, 1000
            )
            "#,
            [],
        )?;

        conn.execute(
            r#"
            INSERT INTO tracks (
                id, file_path, title, artist_id, artist_name, album_id, album_name, album_artist,
                duration, year, genre, disc_number, track_number, bitrate, format,
                is_favorite, play_count, folder_id, file_modified_at, file_size_bytes, created_at, updated_at
            ) VALUES (
                'trk-1', ?1, 'Old Song', 'art-old', 'Old Artist', 'alb-1', 'Old Album', 'Old Artist',
                180.0, 2020, 'Pop', 1, 1, 320, 'mp3',
                0, 0, 'f-1', 1000, 2048, 1000, 1000
            )
            "#,
            rusqlite::params![file_str],
        )?;

        Ok(())
    })
    .expect("Seeding succeeds");

    // 2. Validate path in library folder
    mgr.with_conn(|conn| {
        let valid = validate_path_in_library_folders(conn, &sample_file);
        assert!(valid.is_ok());

        let invalid_file = std::env::temp_dir().join("outside_library.mp3");
        let invalid = validate_path_in_library_folders(conn, &invalid_file);
        assert!(invalid.is_err());
        Ok(())
    })
    .expect("Path validation succeeds");

    // 3. Save single track metadata update
    let payload = SaveTrackTagsDto {
        track_id: "trk-1".to_string(),
        file_path: Some(file_str.clone()),
        title: "Brand New Title".to_string(),
        artist_name: "Fresh Artist".to_string(),
        album_name: Some("Fresh Album".to_string()),
        album_artist: Some("Fresh Artist".to_string()),
        genre: Some("Synthwave".to_string()),
        year: Some(2025),
        track_number: Some(7),
        disc_number: 1,
        cover_art_action: CoverArtAction::Keep,
    };

    let write_res = PhysicalWriteResult {
        cover_art_path: Some("/cache/covers/art123.jpg".to_string()),
        file_size_bytes: 4096,
        file_modified_at: 2000,
    };

    let updated_track = mgr
        .with_conn(|conn| {
            save_track_metadata_transaction(conn, &payload, &write_res)
                .map_err(|e| crate::db::DatabaseError::write_failed(e))
        })
        .expect("Save track succeeds");

    assert_eq!(updated_track.title, "Brand New Title");
    assert_eq!(updated_track.artist_name, "Fresh Artist");
    assert_eq!(updated_track.album_name.as_deref(), Some("Fresh Album"));
    assert_eq!(updated_track.genre.as_deref(), Some("Synthwave"));
    assert_eq!(updated_track.year, Some(2025));
    assert_eq!(updated_track.track_number, Some(7));
    assert_eq!(
        updated_track.cover_art_path.as_deref(),
        Some("/cache/covers/art123.jpg")
    );

    // 4. Check orphan purge: Old Artist and Old Album should be purged!
    mgr.with_conn(|conn| {
        let old_art_cnt: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM artists WHERE id = 'art-old'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(old_art_cnt, 0, "Old artist without tracks must be purged");

        let old_alb_cnt: i64 = conn
            .query_row("SELECT COUNT(*) FROM albums WHERE id = 'alb-1'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(old_alb_cnt, 0, "Old album without tracks must be purged");

        // FTS search index verification
        let search_results =
            search_repo::search_library(conn, "Brand New Title", None, None).unwrap();
        assert_eq!(search_results.tracks.len(), 1);
        assert_eq!(search_results.tracks[0].title, "Brand New Title");

        Ok(())
    })
    .expect("Orphan and search check succeeds");

    // 5. Test in place album update via save_batch_metadata_transaction
    let album_id = updated_track.album_id.expect("Album id exists");

    // Mark album as favorite to verify preservation
    mgr.with_conn(|conn| {
        conn.execute(
            "UPDATE albums SET is_favorite = 1 WHERE id = ?1",
            rusqlite::params![album_id],
        )?;
        Ok(())
    })
    .expect("Album favorite set");

    let batch_updates = BatchTrackUpdates {
        artist_name: Some("Renamed Artist".to_string()),
        album_name: Some("Renamed Album".to_string()),
        album_artist: Some("Renamed Artist".to_string()),
        genre: Some("Cyberpunk".to_string()),
        year: Some(2026),
        disc_number: Some(2),
        cover_art_action: None,
    };

    let batch_track_payload = SaveTrackTagsDto {
        track_id: "trk-1".to_string(),
        file_path: Some(file_str),
        title: "Brand New Title".to_string(),
        artist_name: "Renamed Artist".to_string(),
        album_name: Some("Renamed Album".to_string()),
        album_artist: Some("Renamed Artist".to_string()),
        genre: Some("Cyberpunk".to_string()),
        year: Some(2026),
        track_number: Some(7),
        disc_number: 2,
        cover_art_action: CoverArtAction::Keep,
    };

    let (album_dto, batch_tracks) = mgr
        .with_conn(|conn| {
            save_batch_metadata_transaction(
                conn,
                Some(&album_id),
                &batch_updates,
                &[(batch_track_payload, write_res)],
            )
            .map_err(|e| crate::db::DatabaseError::write_failed(e))
        })
        .expect("Batch save succeeds");

    assert_eq!(batch_tracks.len(), 1);
    assert_eq!(batch_tracks[0].artist_name, "Renamed Artist");
    assert_eq!(batch_tracks[0].disc_number, 2);

    let alb = album_dto.expect("Updated album DTO exists");
    assert_eq!(alb.id, album_id, "Album id must be preserved in place");
    assert_eq!(alb.title, "Renamed Album");
    assert_eq!(alb.artist_name, "Renamed Artist");
    assert_eq!(alb.year, Some(2026));
    assert_eq!(alb.genre.as_deref(), Some("Cyberpunk"));
    assert!(alb.is_favorite, "Album favorite status must be preserved");

    let _ = fs::remove_dir_all(&temp_folder);
}
