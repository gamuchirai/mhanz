//! Domain models, data transfer objects, and filter definitions for database entities.

use serde::{Deserialize, Serialize};

/// Status report for the local SQLite database.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DatabaseStatusDto {
    /// Whether the database is connected and initialized.
    pub is_ready: bool,
    /// Applied schema migration version.
    pub schema_version: usize,
    /// Absolute path to the SQLite database file on disk.
    pub database_path: String,
    /// Total count of indexed tracks in the collection.
    pub track_count: u64,
    /// Total count of albums.
    pub album_count: u64,
    /// Total count of artists.
    pub artist_count: u64,
    /// Total count of user playlists.
    pub playlist_count: u64,
}

/// Monitored audio library folder.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FolderDto {
    /// Unique UUID identifier for the folder record.
    pub id: String,
    /// Absolute directory path on the local filesystem.
    pub path: String,
    /// Epoch timestamp in seconds when the folder was added.
    pub added_at: i64,
    /// Optional epoch timestamp in seconds when scanning completed.
    pub last_scanned_at: Option<i64>,
    /// Whether this folder is actively monitored for changes.
    pub is_active: bool,
}

/// Fully indexed audio track entity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TrackDto {
    /// Unique track identifier.
    pub id: String,
    /// Unique absolute file path on disk.
    pub file_path: String,
    /// Song title extracted from audio metadata tags or file name.
    pub title: String,
    /// Associated artist identifier if resolved.
    pub artist_id: Option<String>,
    /// Display name of the recording artist.
    pub artist_name: String,
    /// Associated album identifier if resolved.
    pub album_id: Option<String>,
    /// Display title of the album release.
    pub album_name: Option<String>,
    /// Album artist name if distinct from track artist.
    pub album_artist: Option<String>,
    /// Track duration in floating point seconds.
    pub duration: f64,
    /// Release year if tagged.
    pub year: Option<i32>,
    /// Primary music genre.
    pub genre: Option<String>,
    /// Disc number within multi disc releases (defaults to 1).
    pub disc_number: i32,
    /// Sequential track number within album or disc.
    pub track_number: Option<i32>,
    /// Audio encoding bitrate in kilobits per second.
    pub bitrate: Option<i32>,
    /// Audio container format (e.g. mp3, flac, wav, aac).
    pub format: String,
    /// Cached path to extracted album cover artwork image.
    pub cover_art_path: Option<String>,
    /// User favorite status.
    pub is_favorite: bool,
    /// Epoch timestamp in seconds when the track was favorited.
    pub liked_at: Option<i64>,
    /// Historical playback counter.
    pub play_count: u32,
    /// Epoch timestamp in seconds of most recent playback.
    pub last_played_at: Option<i64>,
    /// Local filesystem file modification timestamp.
    pub file_modified_at: i64,
    /// Total size of audio file in bytes.
    pub file_size_bytes: i64,
    /// Parent monitored folder identifier.
    pub folder_id: Option<String>,
    /// Record creation timestamp.
    pub created_at: i64,
    /// Record last update timestamp.
    pub updated_at: i64,
}

/// Optional query filters for track retrieval.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct TrackFilterDto {
    /// Filter by parent monitored folder identifier.
    pub folder_id: Option<String>,
    /// Filter only favorite tracks.
    pub is_favorite: Option<bool>,
    /// Text query searching title, artist name, and album name.
    pub search_query: Option<String>,
    /// Filter by specific artist identifier.
    pub artist_id: Option<String>,
    /// Filter by specific album identifier.
    pub album_id: Option<String>,
    /// Filter by specific musical genre.
    pub genre: Option<String>,
    /// Optional field to sort by (e.g. "liked_at", "title", "created_at").
    pub sort_by: Option<String>,
    /// Optional sort direction ("asc" or "desc").
    pub sort_direction: Option<String>,
}

/// Paginated collection of tracks.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaginatedTracksDto {
    /// Vector of track items for the requested page.
    pub items: Vec<TrackDto>,
    /// Total number of tracks matching the active filter.
    pub total: u64,
    /// Current zero indexed or one indexed page offset.
    pub page: u32,
    /// Number of items requested per page.
    pub limit: u32,
}

/// Album catalog summary entity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlbumDto {
    /// Unique album identifier.
    pub id: String,
    /// Album release title.
    pub title: String,
    /// Primary artist identifier if resolved.
    pub artist_id: Option<String>,
    /// Display name of the recording artist.
    pub artist_name: String,
    /// Release year if tagged.
    pub year: Option<i32>,
    /// Primary musical genre.
    pub genre: Option<String>,
    /// Cached cover artwork file path.
    pub cover_art_path: Option<String>,
    /// Total disc count in the release.
    pub total_discs: i32,
    /// Aggregated count of tracks belonging to this album.
    pub track_count: u32,
    /// Record creation timestamp.
    pub created_at: i64,
    /// Record update timestamp.
    pub updated_at: i64,
}

/// Detailed album payload with sequential tracklist.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AlbumDetailDto {
    /// Album header metadata.
    pub album: AlbumDto,
    /// Ordered tracklist sorted by disc and track number.
    pub tracks: Vec<TrackDto>,
}

/// Artist catalog summary entity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ArtistDto {
    /// Unique artist identifier.
    pub id: String,
    /// Full artist or band name.
    pub name: String,
    /// Optional biographical notes or summary.
    pub bio: Option<String>,
    /// Cached avatar photo file path.
    pub avatar_path: Option<String>,
    /// Total count of tracks by this artist in the local library.
    pub track_count: u32,
    /// Total count of albums by this artist in the local library.
    pub album_count: u32,
    /// Record creation timestamp.
    pub created_at: i64,
    /// Record update timestamp.
    pub updated_at: i64,
}

/// Detailed artist profile with top played tracks and discography albums.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ArtistProfileDto {
    /// Artist header metadata.
    pub artist: ArtistDto,
    /// Top most played tracks by this artist.
    pub top_tracks: Vec<TrackDto>,
    /// Discography albums by this artist.
    pub albums: Vec<AlbumDto>,
}

/// User created playlist entity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlaylistDto {
    /// Unique playlist identifier.
    pub id: String,
    /// Playlist title name.
    pub name: String,
    /// Optional descriptive text.
    pub description: Option<String>,
    /// Optional custom cover artwork image path.
    pub cover_art_path: Option<String>,
    /// Gradient preset identifier for procedural styling.
    pub gradient_preset: Option<String>,
    /// User favorite playlist flag.
    pub is_favorite: bool,
    /// Whether this is an editorial or system curated playlist.
    pub is_curated: bool,
    /// Total count of tracks currently in this playlist.
    pub track_count: u32,
    /// Creation timestamp in epoch seconds.
    pub created_at: i64,
    /// Last modification timestamp in epoch seconds.
    pub updated_at: i64,
}

/// Structured input payload for creating or updating a playlist.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct PlaylistInputDto {
    /// Optional client generated or preserved playlist identifier.
    pub id: Option<String>,
    /// Playlist name.
    pub name: String,
    /// Optional descriptive text.
    pub description: Option<String>,
    /// Gradient preset identifier for procedural styling.
    pub gradient_preset: Option<String>,
    /// Optional custom cover artwork image path.
    pub cover_art_path: Option<String>,
}

/// Individual track entry in a playlist with position sequence.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlaylistTrackDto {
    /// Unique entry identifier.
    pub id: String,
    /// Parent playlist identifier.
    pub playlist_id: String,
    /// Embedded full track metadata.
    pub track: TrackDto,
    /// Zero indexed integer sequence ordering in playlist.
    pub position: u32,
    /// Timestamp in epoch seconds when track was added to playlist.
    pub added_at: i64,
}

/// Complete playlist detail including full ordered tracklist.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlaylistDetailDto {
    /// Playlist header record.
    pub playlist: PlaylistDto,
    /// Sequenced tracklist items.
    pub tracks: Vec<PlaylistTrackDto>,
}
