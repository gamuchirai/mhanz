//! Database module exposing connection management, models, errors, and repositories.

pub mod catalog_repo;
pub mod connection;
pub mod error;
pub mod folder_repo;
pub mod models;
pub mod playlist_repo;
pub mod search_repo;
pub mod seeding;
pub mod settings_repo;
pub mod track_repo;

use std::sync::Arc;

pub use connection::DatabaseManager;
pub use error::DatabaseError;
pub use models::*;

/// Thread safe state wrapper registered into Tauri managed state.
#[derive(Clone)]
pub struct DbState(pub Arc<DatabaseManager>);

impl DbState {
    /// Creates a new DbState wrapping an initialized DatabaseManager.
    pub fn new(manager: DatabaseManager) -> Self {
        Self(Arc::new(manager))
    }

    /// Retrieves database health and aggregated metrics.
    pub fn get_status(&self) -> Result<DatabaseStatusDto, DatabaseError> {
        let schema_ver = self.0.schema_version()?;
        self.0.with_conn(|conn| {
            let track_cnt = track_repo::count_tracks(conn)?;
            let alb_cnt = catalog_repo::count_albums(conn)?;
            let art_cnt = catalog_repo::count_artists(conn)?;
            let ply_cnt = playlist_repo::count_playlists(conn)?;

            Ok(DatabaseStatusDto {
                is_ready: true,
                schema_version: schema_ver,
                database_path: self.0.path.to_string_lossy().to_string(),
                track_count: track_cnt,
                album_count: alb_cnt,
                artist_count: art_cnt,
                playlist_count: ply_cnt,
            })
        })
    }

    /// Queries all monitored folders.
    pub fn get_folders(&self) -> Result<Vec<FolderDto>, DatabaseError> {
        self.0.with_conn(|conn| folder_repo::get_folders(conn))
    }

    /// Registers a new monitored folder.
    pub fn add_folder(&self, path: &str) -> Result<FolderDto, DatabaseError> {
        self.0.with_conn(|conn| folder_repo::add_folder(conn, path))
    }

    /// Removes a monitored folder by identifier.
    pub fn remove_folder(&self, id: &str) -> Result<bool, DatabaseError> {
        self.0
            .with_conn(|conn| folder_repo::remove_folder(conn, id))
    }

    /// Queries paginated tracks.
    pub fn get_tracks(
        &self,
        page: u32,
        limit: u32,
        filter: Option<TrackFilterDto>,
    ) -> Result<PaginatedTracksDto, DatabaseError> {
        self.0
            .with_conn(|conn| track_repo::get_tracks(conn, page, limit, filter))
    }

    /// Fetches a single track by id.
    pub fn get_track_by_id(&self, id: &str) -> Result<Option<TrackDto>, DatabaseError> {
        self.0
            .with_conn(|conn| track_repo::get_track_by_id(conn, id))
    }

    /// Toggles favorite status of a track.
    pub fn toggle_track_favorite(&self, id: &str) -> Result<bool, DatabaseError> {
        self.0
            .with_conn(|conn| track_repo::toggle_track_favorite(conn, id))
    }

    /// Increments playback counter of a track.
    pub fn increment_play_count(&self, id: &str) -> Result<u32, DatabaseError> {
        self.0
            .with_conn(|conn| track_repo::increment_play_count(conn, id))
    }

    /// Queries all albums.
    pub fn get_albums(&self) -> Result<Vec<AlbumDto>, DatabaseError> {
        self.0.with_conn(|conn| catalog_repo::get_albums(conn))
    }

    /// Queries album details with tracks.
    pub fn get_album_details(&self, id: &str) -> Result<Option<AlbumDetailDto>, DatabaseError> {
        self.0
            .with_conn(|conn| catalog_repo::get_album_details(conn, id))
    }

    /// Queries all artists.
    pub fn get_artists(&self) -> Result<Vec<ArtistDto>, DatabaseError> {
        self.0.with_conn(|conn| catalog_repo::get_artists(conn))
    }

    /// Queries artist profile with top tracks and albums.
    pub fn get_artist_profile(&self, id: &str) -> Result<Option<ArtistProfileDto>, DatabaseError> {
        self.0
            .with_conn(|conn| catalog_repo::get_artist_profile(conn, id))
    }

    /// Queries all user playlists.
    pub fn get_playlists(&self) -> Result<Vec<PlaylistDto>, DatabaseError> {
        self.0.with_conn(|conn| playlist_repo::get_playlists(conn))
    }

    /// Queries playlist details with tracks.
    pub fn get_playlist_details(
        &self,
        id: &str,
    ) -> Result<Option<PlaylistDetailDto>, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::get_playlist_details(conn, id))
    }

    /// Creates a new playlist with structured metadata.
    pub fn create_playlist(
        &self,
        payload: &PlaylistInputDto,
    ) -> Result<PlaylistDto, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::create_playlist(conn, payload))
    }

    /// Updates an existing playlist.
    pub fn update_playlist(
        &self,
        id: &str,
        payload: &PlaylistInputDto,
    ) -> Result<PlaylistDto, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::update_playlist(conn, id, payload))
    }

    /// Deletes a playlist.
    pub fn delete_playlist(&self, id: &str) -> Result<bool, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::delete_playlist(conn, id))
    }

    /// Appends tracks to a playlist.
    pub fn add_tracks_to_playlist(
        &self,
        playlist_id: &str,
        track_ids: &[String],
    ) -> Result<u32, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::add_tracks_to_playlist(conn, playlist_id, track_ids))
    }

    /// Removes a track entry from a playlist by entry identifier.
    pub fn remove_playlist_track(
        &self,
        playlist_id: &str,
        entry_id: &str,
    ) -> Result<bool, DatabaseError> {
        self.0
            .with_conn(|conn| playlist_repo::remove_playlist_track(conn, playlist_id, entry_id))
    }

    /// Atomically reorders tracks in a playlist using entry identifiers.
    pub fn reorder_playlist_tracks(
        &self,
        playlist_id: &str,
        ordered_entry_ids: &[String],
    ) -> Result<bool, DatabaseError> {
        self.0.with_conn(|conn| {
            playlist_repo::reorder_playlist_tracks(conn, playlist_id, ordered_entry_ids)
        })
    }

    /// Queries a player preference setting.
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, DatabaseError> {
        self.0
            .with_conn(|conn| settings_repo::get_setting(conn, key))
    }

    /// Stores a player preference setting.
    pub fn set_setting(&self, key: &str, value: &str) -> Result<bool, DatabaseError> {
        self.0
            .with_conn(|conn| settings_repo::set_setting(conn, key, value))
    }

    /// Executes unified full text search across library tracks, albums, artists, playlists, and genres.
    pub fn search_library(
        &self,
        query: &str,
        category: Option<&str>,
        limit: Option<u32>,
    ) -> Result<SearchResultsDto, DatabaseError> {
        self.0
            .with_conn(|conn| search_repo::search_library(conn, query, category, limit))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_initialization_and_status() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let state = DbState::new(mgr);

        let status = state.get_status().expect("Status should be readable");
        assert!(status.is_ready);
        assert_eq!(status.schema_version, 3);
        assert_eq!(status.track_count, 0);
        // Default sample playlists are seeded automatically
        assert_eq!(status.playlist_count, 5);
    }

    #[test]
    fn test_folder_registration_and_removal() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let state = DbState::new(mgr);

        let folder = state
            .add_folder("/mock/music/folder1")
            .expect("Folder should be added");
        assert_eq!(folder.path, "/mock/music/folder1");
        assert!(folder.is_active);

        let folders = state.get_folders().expect("Folders should be listed");
        assert_eq!(folders.len(), 1);

        let removed = state
            .remove_folder(&folder.id)
            .expect("Folder should be removed");
        assert!(removed);

        let folders_after = state.get_folders().expect("Folders should be empty");
        assert_eq!(folders_after.len(), 0);
    }

    #[test]
    fn test_playlist_crud_and_track_reordering() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let state = DbState::new(mgr);

        // Verify seeded playlists
        let initial_playlists = state.get_playlists().expect("Seeded playlists should list");
        assert_eq!(initial_playlists.len(), 5);

        // Attempting to delete a curated playlist must fail
        let curated_p = initial_playlists
            .iter()
            .find(|p| p.is_curated)
            .expect("Curated playlist exists");
        assert!(state.delete_playlist(&curated_p.id).is_err());

        // Create new user playlist
        let input = PlaylistInputDto {
            id: None,
            name: "Chill Vibes".to_string(),
            description: Some("Evening relaxation".to_string()),
            gradient_preset: Some("late-night".to_string()),
            cover_art_path: None,
        };
        let playlist = state.create_playlist(&input).expect("Playlist created");
        assert_eq!(playlist.name, "Chill Vibes");
        assert_eq!(playlist.gradient_preset.as_deref(), Some("late-night"));
        assert!(!playlist.is_curated);

        // Insert mock tracks
        let track1 = TrackDto {
            id: "t1".to_string(),
            file_path: "/mock/track1.mp3".to_string(),
            title: "Song One".to_string(),
            artist_id: None,
            artist_name: "Artist A".to_string(),
            album_id: None,
            album_name: Some("Album X".to_string()),
            album_artist: None,
            duration: 180.0,
            year: Some(2025),
            genre: Some("Lo-Fi".to_string()),
            disc_number: 1,
            track_number: Some(1),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 0,
            last_played_at: None,
            file_modified_at: 1700000000,
            file_size_bytes: 4000000,
            folder_id: None,
            created_at: 1700000000,
            updated_at: 1700000000,
        };
        let mut track2 = track1.clone();
        track2.id = "t2".to_string();
        track2.file_path = "/mock/track2.mp3".to_string();
        track2.title = "Song Two".to_string();

        state
            .0
            .with_conn(|conn| {
                track_repo::upsert_track(conn, &track1)?;
                track_repo::upsert_track(conn, &track2)?;
                Ok(())
            })
            .expect("Tracks inserted");

        // Add tracks to playlist
        let added = state
            .add_tracks_to_playlist(&playlist.id, &[track1.id.clone(), track2.id.clone()])
            .expect("Tracks added to playlist");
        assert_eq!(added, 2);

        // Fetch details
        let details = state
            .get_playlist_details(&playlist.id)
            .expect("Details queried")
            .expect("Playlist found");
        assert_eq!(details.tracks.len(), 2);
        assert_eq!(details.tracks[0].track.title, "Song One");
        assert_eq!(details.tracks[1].track.title, "Song Two");

        // Reorder tracks by entry ID (AC-8)
        let entry1_id = details.tracks[0].id.clone();
        let entry2_id = details.tracks[1].id.clone();
        let reordered = state
            .reorder_playlist_tracks(&playlist.id, &[entry2_id.clone(), entry1_id.clone()])
            .expect("Reordered successfully");
        assert!(reordered);

        let details_reordered = state
            .get_playlist_details(&playlist.id)
            .expect("Details queried")
            .expect("Playlist found");
        assert_eq!(details_reordered.tracks[0].track.title, "Song Two");
        assert_eq!(details_reordered.tracks[1].track.title, "Song One");

        // Remove track by entry ID (AC-8)
        let removed = state
            .remove_playlist_track(&playlist.id, &entry2_id)
            .expect("Track removed");
        assert!(removed);

        let details_after_remove = state
            .get_playlist_details(&playlist.id)
            .expect("Details queried")
            .expect("Playlist found");
        assert_eq!(details_after_remove.tracks.len(), 1);
        assert_eq!(details_after_remove.tracks[0].track.title, "Song One");
        assert_eq!(details_after_remove.tracks[0].position, 0);

        // Toggle favorite (AC-9)
        let is_fav = state
            .toggle_track_favorite(&track1.id)
            .expect("Favorite toggled");
        assert!(is_fav);

        let fetched_t1 = state
            .get_track_by_id(&track1.id)
            .expect("Fetched track")
            .expect("Track exists");
        assert!(fetched_t1.is_favorite);
        assert!(fetched_t1.liked_at.is_some());

        // Increment play count
        let plays = state
            .increment_play_count(&track1.id)
            .expect("Play count incremented");
        assert_eq!(plays, 1);
    }

    #[test]
    fn test_settings_persistence() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let state = DbState::new(mgr);

        let initial = state.get_setting("audio_volume").expect("Setting query");
        assert!(initial.is_none());

        state
            .set_setting("audio_volume", "0.75")
            .expect("Setting write");
        let saved = state.get_setting("audio_volume").expect("Setting query");
        assert_eq!(saved.as_deref(), Some("0.75"));
    }
}
