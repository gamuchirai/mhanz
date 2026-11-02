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
