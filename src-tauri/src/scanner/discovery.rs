//! Recursive audio file discovery, extension filtering, and differential change detection.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use rusqlite::Connection;
use walkdir::WalkDir;

/// Represents an audio file discovered on disk.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscoveredAudioFile {
    /// Absolute filesystem path.
    pub path: PathBuf,
    /// Absolute path formatted as a normalized string.
    pub path_str: String,
    /// Audio file size in bytes.
    pub size_bytes: i64,
    /// Last modified epoch timestamp in seconds.
    pub modified_at: i64,
    /// File extension without leading dot (e.g. "mp3", "flac").
    pub extension: String,
}

/// Result of differential filesystem scanning against database records.
#[derive(Debug, Clone)]
pub struct DiscoveryResult {
    /// Files that are newly discovered or modified since last indexed.
    pub files_to_parse: Vec<DiscoveredAudioFile>,
    /// Set of all valid audio file paths found on disk during this scan.
    pub all_disk_paths: HashSet<String>,
    /// Count of files whose modification timestamp matched existing DB record.
    pub unchanged_count: usize,
}

/// Supported audio format extensions (case insensitive).
pub const SUPPORTED_EXTENSIONS: &[&str] =
    &["mp3", "flac", "m4a", "aac", "ogg", "wav", "aiff", "opus"];

/// Checks if a file extension matches supported audio formats.
pub fn is_supported_audio_extension(ext: &str) -> bool {
    let lower = ext.to_ascii_lowercase();
    SUPPORTED_EXTENSIONS.contains(&lower.as_str())
}

/// Pre fetches existing file paths and modification timestamps for a folder from SQLite into memory.
pub fn fetch_existing_file_timestamps(
    conn: &Connection,
    folder_id: &str,
) -> Result<HashMap<String, i64>, rusqlite::Error> {
    let mut stmt =
        conn.prepare("SELECT file_path, file_modified_at FROM tracks WHERE folder_id = ?1")?;
    let rows = stmt.query_map([folder_id], |row| {
        let path: String = row.get(0)?;
        let modified: i64 = row.get(1)?;
        Ok((path, modified))
    })?;

    let mut map = HashMap::new();
    for row in rows {
        let (path, modified) = row?;
        map.insert(path, modified);
    }
    Ok(map)
}

/// Discovers audio files recursively in `folder_path` and determines which need parsing.
///
/// Returns an error if the root folder does not exist or cannot be accessed (AC-9).
pub fn discover_audio_files(
    folder_path: &Path,
    existing_timestamps: &HashMap<String, i64>,
) -> Result<DiscoveryResult, std::io::Error> {
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!(
                "Folder does not exist or is not a directory: {}",
                folder_path.display()
            ),
        ));
    }

    let mut files_to_parse = Vec::new();
    let mut all_disk_paths = HashSet::new();
    let mut unchanged_count = 0;

    // Recursive traversal without following directory symlinks (AC-1)
    let walker = WalkDir::new(folder_path).follow_links(false).into_iter();

    for entry in walker.filter_entry(|e| !is_hidden_file_or_dir(e)) {
        let entry = match entry {
            Ok(e) => e,
            Err(err) => {
                // Log and continue on inaccessible subdirectories or permissions issues
                eprintln!("Scanner discovery warning for entry: {}", err);
                continue;
            }
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let extension = match path.extension().and_then(|ext| ext.to_str()) {
            Some(ext) if is_supported_audio_extension(ext) => ext.to_ascii_lowercase(),
            _ => continue,
        };

        // Extract metadata: size and modified time
        let metadata = match fs::metadata(path) {
            Ok(m) => m,
            Err(err) => {
                eprintln!(
                    "Scanner cannot read metadata for {}: {}",
                    path.display(),
                    err
                );
                continue;
            }
        };

        let size_bytes = metadata.len() as i64;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let path_str = path.to_string_lossy().to_string();
        all_disk_paths.insert(path_str.clone());

        // Differential check (AC-2): if modification timestamp matches, skip parsing
        if let Some(&existing_mod) = existing_timestamps.get(&path_str) {
            if existing_mod == modified_at && modified_at > 0 {
                unchanged_count += 1;
                continue;
            }
        }

        files_to_parse.push(DiscoveredAudioFile {
            path: path.to_path_buf(),
            path_str,
            size_bytes,
            modified_at,
            extension,
        });
    }

    Ok(DiscoveryResult {
        files_to_parse,
        all_disk_paths,
        unchanged_count,
    })
}

/// Checks if a directory entry is hidden (starts with `.` or carries Windows hidden flag).
fn is_hidden_file_or_dir(entry: &walkdir::DirEntry) -> bool {
    let file_name = entry.file_name().to_string_lossy();
    if file_name.starts_with('.') && file_name != "." {
        return true;
    }

    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x00000002;
        if let Ok(meta) = entry.metadata() {
            if (meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN) != 0 {
                return true;
            }
        }
    }

    false
}
