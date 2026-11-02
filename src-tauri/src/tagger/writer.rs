//! Physical audio tag writing implementation using Lofty with atomic temporary file swapping,
//! Windows retry loops, and embedded cover art extraction/caching.

use std::fs;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use lofty::config::WriteOptions;
use lofty::file::TaggedFileExt;
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey, Tag, TagExt};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use super::models::{CoverArtAction, SaveTrackTagsDto};
use crate::scanner::metadata::{
    detect_image_extension_from_magic, mime_to_extension, MAX_COVER_ART_SIZE_BYTES,
};

/// Result of a physical file tag write operation.
#[derive(Debug, Clone)]
pub struct PhysicalWriteResult {
    pub file_modified_at: i64,
    pub file_size_bytes: i64,
    pub cover_art_path: Option<String>,
}

/// Simple RFC 4648 Base64 decoder.
pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut decode_map = [0xFFu8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        decode_map[b as usize] = i as u8;
    }

    let clean: Vec<u8> = input
        .bytes()
        .filter(|&b| !b.is_ascii_whitespace() && b != b'=')
        .collect();

    let mut out = Vec::with_capacity((clean.len() * 3) / 4);
    let mut buf = 0u32;
    let mut bits = 0;

    for &b in &clean {
        let val = decode_map[b as usize];
        if val == 0xFF {
            return Err("Invalid base64 character".to_string());
        }
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }

    Ok(out)
}

/// Caches raw image data into covers/{sha256}.{ext} and returns the cached path string.
pub fn cache_cover_image(
    image_bytes: &[u8],
    mime_hint: Option<&str>,
    cache_covers_dir: &Path,
) -> Result<String, String> {
    if image_bytes.is_empty() {
        return Err("Image byte buffer is empty".to_string());
    }
    if image_bytes.len() > MAX_COVER_ART_SIZE_BYTES {
        return Err("Image exceeds 15 megabyte size limit".to_string());
    }

    let ext = match mime_hint {
        Some(m) if !m.is_empty() => mime_to_extension(m),
        _ => detect_image_extension_from_magic(image_bytes),
    };

    let mut hasher = Sha256::new();
    hasher.update(image_bytes);
    let hash_hex = format!("{:x}", hasher.finalize());

    if !cache_covers_dir.exists() {
        let _ = fs::create_dir_all(cache_covers_dir);
    }

    let filename = format!("{}.{}", hash_hex, ext);
    let dest_path = cache_covers_dir.join(filename);

    if !dest_path.exists() {
        fs::write(&dest_path, image_bytes)
            .map_err(|err| format!("Failed to write cached cover art: {}", err))?;
    }

    Ok(dest_path.to_string_lossy().to_string())
}

/// Creates a Lofty Picture from raw bytes and optional MIME string.
fn create_lofty_picture(data: Vec<u8>, mime_hint: Option<&str>) -> Picture {
    let ext = match mime_hint {
        Some(m) => mime_to_extension(m),
        None => detect_image_extension_from_magic(&data),
    };

    let mime = match ext {
        "png" => Some(MimeType::Png),
        "webp" => Some(MimeType::Unknown("image/webp".to_string())),
        "gif" => Some(MimeType::Gif),
        _ => Some(MimeType::Jpeg),
    };

    Picture::new_unchecked(PictureType::CoverFront, mime, None, data)
}

/// Writes updated tags to a physical audio file on disk atomically.
pub fn write_tags_to_file(
    file_path: &Path,
    payload: &SaveTrackTagsDto,
    cache_covers_dir: &Path,
) -> Result<PhysicalWriteResult, String> {
    if !file_path.exists() {
        return Err(format!("Audio file not found: {}", file_path.display()));
    }

    // Read original tagged file to detect container format and preserve existing tags
    let tagged_file = Probe::open(file_path)
        .map_err(|err| format!("Failed to probe audio file: {}", err))?
        .read()
        .map_err(|err| format!("Failed to read audio file tags: {}", err))?;

    let tag_type = tagged_file.primary_tag_type();
    let mut tag = tagged_file
        .primary_tag()
        .cloned()
        .or_else(|| tagged_file.first_tag().cloned())
        .unwrap_or_else(|| Tag::new(tag_type));

    // Update text metadata tags
    tag.set_title(payload.title.trim().to_string());
    tag.set_artist(payload.artist_name.trim().to_string());

    if let Some(ref alb) = payload.album_name {
        let trimmed = alb.trim();
        if !trimmed.is_empty() {
            tag.set_album(trimmed.to_string());
        } else {
            tag.remove_album();
        }
    } else {
        tag.remove_album();
    }

    if let Some(ref alb_art) = payload.album_artist {
        let trimmed = alb_art.trim();
        if !trimmed.is_empty() {
            tag.insert_text(ItemKey::AlbumArtist, trimmed.to_string());
        } else {
            tag.remove_key(&ItemKey::AlbumArtist);
        }
    } else {
        tag.remove_key(&ItemKey::AlbumArtist);
    }

    if let Some(ref g) = payload.genre {
        let trimmed = g.trim();
        if !trimmed.is_empty() {
            tag.set_genre(trimmed.to_string());
        } else {
            tag.remove_genre();
        }
    } else {
        tag.remove_genre();
    }

    if let Some(y) = payload.year {
        if y > 0 {
            tag.set_year(y as u32);
        } else {
            tag.remove_year();
        }
    } else {
        tag.remove_year();
    }

    if let Some(trk) = payload.track_number {
        if trk > 0 {
            tag.set_track(trk as u32);
        } else {
            tag.remove_track();
        }
    } else {
        tag.remove_track();
    }

    if payload.disc_number > 0 {
        tag.set_disk(payload.disc_number as u32);
    }

    let resolved_cover_art_path: Option<String> = match &payload.cover_art_action {
        CoverArtAction::Keep => {
            crate::scanner::metadata::extract_cover_art(&tagged_file, cache_covers_dir)
        }
        CoverArtAction::Remove => {
            tag.remove_picture_type(PictureType::CoverFront);
            while !tag.pictures().is_empty() {
                tag.remove_picture(0);
            }
            None
        }
        CoverArtAction::ReplacePath { source_file_path } => {
            let src = Path::new(source_file_path);
            if !src.exists() {
                return Err(format!(
                    "Replacement cover image file not found: {}",
                    source_file_path
                ));
            }
            let data = fs::read(src).map_err(|e| format!("Failed to read cover image: {}", e))?;
            let cached_path = cache_cover_image(&data, None, cache_covers_dir)?;
            let picture = create_lofty_picture(data, None);
            tag.remove_picture_type(PictureType::CoverFront);
            tag.push_picture(picture);
            Some(cached_path)
        }
        CoverArtAction::ReplaceBytes {
            image_bytes_base64,
            mime_type,
        } => {
            let data = decode_base64(image_bytes_base64)?;
            let cached_path = cache_cover_image(&data, Some(mime_type), cache_covers_dir)?;
            let picture = create_lofty_picture(data, Some(mime_type));
            tag.remove_picture_type(PictureType::CoverFront);
            tag.push_picture(picture);
            Some(cached_path)
        }
    };

    // AC-6: Atomic temporary sibling file write
    let parent_dir = file_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("track");
    let temp_name = format!(".{}.{}.tmp", stem, Uuid::new_v4());
    let temp_path = parent_dir.join(&temp_name);

    // Copy original file to temp sibling
    fs::copy(file_path, &temp_path)
        .map_err(|err| format!("Failed to copy file to temporary location: {}", err))?;

    // Save tags to temp file using Lofty
    if let Err(err) = tag.save_to_path(&temp_path, WriteOptions::default()) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Lofty failed to write tags: {}", err));
    }

    // AC-6: Bounded Windows retry loop for atomic file swap (5 attempts, 30ms backoff)
    let mut replaced = false;
    let mut last_error: Option<std::io::Error> = None;

    for attempt in 0..5 {
        if attempt > 0 {
            std::thread::sleep(Duration::from_millis(30));
        }

        match fs::rename(&temp_path, file_path) {
            Ok(_) => {
                replaced = true;
                break;
            }
            Err(err) => {
                last_error = Some(err);
            }
        }
    }

    if !replaced {
        let _ = fs::remove_file(&temp_path);
        return Err(format!(
            "Failed to atomically swap file after 5 attempts: {}",
            last_error
                .map(|e| e.to_string())
                .unwrap_or_else(|| "Unknown filesystem error".to_string())
        ));
    }

    // Extract post-write filesystem metadata
    let post_meta = fs::metadata(file_path)
        .map_err(|err| format!("Failed to read post write file metadata: {}", err))?;

    let file_modified_at = post_meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0)
        });

    let file_size_bytes = post_meta.len() as i64;

    Ok(PhysicalWriteResult {
        file_modified_at,
        file_size_bytes,
        cover_art_path: resolved_cover_art_path,
    })
}
