//! Audio tag extraction and embedded artwork caching using Lofty and SHA256.

use std::fs;
use std::path::Path;

use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::PictureType;
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey};
use sha2::{Digest, Sha256};

use super::discovery::DiscoveredAudioFile;
use super::models::ScannedTrackData;

/// Maximum picture size allowed for embedded artwork extraction (15 megabytes, AC-5).
pub const MAX_COVER_ART_SIZE_BYTES: usize = 15 * 1024 * 1024;

/// Default fallbacks for missing metadata tags (AC-4).
pub const UNKNOWN_ARTIST: &str = "Unknown Artist";
pub const UNKNOWN_ALBUM: &str = "Unknown Album";

/// Extracts metadata from a discovered audio file, with fallback derivations and cover extraction.
pub fn parse_audio_metadata(
    file: &DiscoveredAudioFile,
    folder_id: &str,
    cache_covers_dir: &Path,
) -> Result<ScannedTrackData, String> {
    let tagged_file = Probe::open(&file.path)
        .map_err(|err| format!("Failed to probe audio file: {}", err))?
        .read()
        .map_err(|err| format!("Failed to read audio tags: {}", err))?;

    let properties = tagged_file.properties();
    let duration = properties.duration().as_secs_f64();
    let bitrate = properties.audio_bitrate().map(|b| b as i32);

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    // Title with basename fallback (AC-4)
    let raw_title = tag.as_ref().and_then(|t| t.title()).map(|s| s.trim().to_string());
    let title = match raw_title {
        Some(t) if !t.is_empty() => t,
        _ => file
            .path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown Track".to_string()),
    };

    // Artist with "Unknown Artist" fallback (AC-4)
    let raw_artist = tag.as_ref().and_then(|t| t.artist()).map(|s| s.trim().to_string());
    let artist_name = match raw_artist {
        Some(a) if !a.is_empty() => a,
        _ => UNKNOWN_ARTIST.to_string(),
    };

    // Album with "Unknown Album" fallback (AC-4)
    let raw_album = tag.as_ref().and_then(|t| t.album()).map(|s| s.trim().to_string());
    let album_title = match raw_album {
        Some(al) if !al.is_empty() => al,
        _ => UNKNOWN_ALBUM.to_string(),
    };

    // Album artist
    let album_artist = tag.as_ref().and_then(|t| {
        t.get_string(&ItemKey::AlbumArtist)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    });

    let year = tag
        .as_ref()
        .and_then(|t| t.year())
        .map(|y| y as i32);

    let genre = tag.as_ref().and_then(|t| {
        t.genre()
            .map(|g| g.trim().to_string())
            .filter(|g| !g.is_empty())
    });

    let track_number = tag.as_ref().and_then(|t| t.track()).map(|tr| tr as i32);
    let disc_number = tag.as_ref().and_then(|t| t.disk()).map(|d| d as i32).unwrap_or(1);

    // Extract embedded cover artwork if present (AC-5)
    let cover_art_path = extract_cover_art(&tagged_file, cache_covers_dir);

    Ok(ScannedTrackData {
        file_path: file.path_str.clone(),
        title,
        artist_name,
        album_title,
        album_artist,
        duration,
        year,
        genre,
        disc_number,
        track_number,
        bitrate,
        format: file.extension.clone(),
        cover_art_path,
        file_modified_at: file.modified_at,
        file_size_bytes: file.size_bytes,
        folder_id: folder_id.to_string(),
    })
}

/// Extracts front cover artwork, hashes with SHA256, and saves deduplicated into cache dir (AC-5).
fn extract_cover_art<T: TaggedFileExt>(
    tagged_file: &T,
    cache_covers_dir: &Path,
) -> Option<String> {
    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag())?;

    let pictures = tag.pictures();
    if pictures.is_empty() {
        return None;
    }

    // Prioritize PictureType::CoverFront, else first picture
    let picture = pictures
        .iter()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .or_else(|| pictures.first())?;

    let data = picture.data();
    if data.is_empty() || data.len() > MAX_COVER_ART_SIZE_BYTES {
        return None;
    }

    // Determine extension from MIME or image magic bytes
    let ext = match picture.mime_type() {
        Some(mime) => mime_to_extension(mime.as_str()),
        None => detect_image_extension_from_magic(data),
    };

    // Calculate SHA256 hash for deduplication
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash_hex = format!("{:x}", hasher.finalize());

    // Destination: covers/{sha256}.{ext}
    let filename = format!("{}.{}", hash_hex, ext);
    let dest_path = cache_covers_dir.join(filename);

    // Ensure cache covers directory exists
    if !cache_covers_dir.exists() {
        let _ = fs::create_dir_all(cache_covers_dir);
    }

    // Write file only if it doesn't already exist (deduplicated caching)
    if !dest_path.exists() {
        if let Err(err) = fs::write(&dest_path, data) {
            eprintln!("Failed to write cached cover art: {}", err);
            return None;
        }
    }

    Some(dest_path.to_string_lossy().to_string())
}

/// Maps image MIME string to file extension.
fn mime_to_extension(mime: &str) -> &'static str {
    let lower = mime.to_ascii_lowercase();
    if lower.contains("png") {
        "png"
    } else if lower.contains("webp") {
        "webp"
    } else if lower.contains("gif") {
        "gif"
    } else {
        "jpg"
    }
}

/// Fallback magic byte detection for common image formats.
fn detect_image_extension_from_magic(data: &[u8]) -> &'static str {
    if data.len() >= 8 && &data[0..8] == b"\x89PNG\r\n\x1a\n" {
        "png"
    } else if data.len() >= 3 && &data[0..3] == b"\xff\xd8\xff" {
        "jpg"
    } else if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        "webp"
    } else {
        "jpg"
    }
}
