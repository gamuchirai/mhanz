//! Audio file physical tag probing implementation using Lofty.

use std::path::Path;

use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey};

use crate::scanner::metadata::{extract_cover_art, UNKNOWN_ALBUM, UNKNOWN_ARTIST};
use super::models::ProbedAudioTagsDto;

/// Probes the physical audio file tags on disk using Lofty.
pub fn probe_audio_file(
    track_id: &str,
    file_path: &Path,
    cache_covers_dir: &Path,
) -> Result<ProbedAudioTagsDto, String> {
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", file_path.display()));
    }

    let tagged_file = Probe::open(file_path)
        .map_err(|err| format!("Failed to probe audio file: {}", err))?
        .read()
        .map_err(|err| format!("Failed to read audio tags: {}", err))?;

    let properties = tagged_file.properties();
    let duration = properties.duration().as_secs_f64();
    let bitrate = properties.audio_bitrate().map(|b| b as i32);

    let format = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("audio")
        .to_lowercase();

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    // Title with stem fallback
    let raw_title = tag
        .as_ref()
        .and_then(|t| t.title())
        .map(|s| s.trim().to_string());
    let title = match raw_title {
        Some(t) if !t.is_empty() => t,
        _ => file_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown Track".to_string()),
    };

    // Artist with "Unknown Artist" fallback
    let raw_artist = tag
        .as_ref()
        .and_then(|t| t.artist())
        .map(|s| s.trim().to_string());
    let artist = match raw_artist {
        Some(a) if !a.is_empty() => a,
        _ => UNKNOWN_ARTIST.to_string(),
    };

    // Album with "Unknown Album" fallback
    let raw_album = tag
        .as_ref()
        .and_then(|t| t.album())
        .map(|s| s.trim().to_string());
    let album = match raw_album {
        Some(al) if !al.is_empty() => al,
        _ => UNKNOWN_ALBUM.to_string(),
    };

    let album_artist = tag.as_ref().and_then(|t| {
        t.get_string(&ItemKey::AlbumArtist)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    });

    let genre = tag.as_ref().and_then(|t| {
        t.genre()
            .map(|g| g.trim().to_string())
            .filter(|g| !g.is_empty())
    });

    let year = tag.as_ref().and_then(|t| t.year()).map(|y| y as i32);
    let track_number = tag.as_ref().and_then(|t| t.track()).map(|tr| tr as i32);
    let disc_number = tag
        .as_ref()
        .and_then(|t| t.disk())
        .map(|d| d as i32)
        .unwrap_or(1);

    // Extract cover artwork if present
    let has_embedded_cover = tag.map(|t| !t.pictures().is_empty()).unwrap_or(false);
    let cover_art_path = extract_cover_art(&tagged_file, cache_covers_dir);

    Ok(ProbedAudioTagsDto {
        track_id: track_id.to_string(),
        file_path: file_path.to_string_lossy().to_string(),
        title,
        artist,
        album,
        album_artist,
        genre,
        year,
        track_number,
        disc_number,
        duration,
        bitrate,
        format,
        has_embedded_cover,
        cover_art_path,
    })
}
