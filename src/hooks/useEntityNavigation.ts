import { useCallback } from "react";
import { useOverlayStore } from "../store/useOverlayStore";
import { useNavigationStore } from "../store/useNavigationStore";
import { useArtistStore } from "../store/useArtistStore";
import { useAlbumStore } from "../store/useAlbumStore";
import { useSearchStore } from "../store/useSearchStore";

/**
 * Application hook for coordinating universal navigation to artists, albums, or search fallback.
 * Automatically closes any open overlays and resolves entity identifiers with store synchronization.
 */
export function useEntityNavigation() {
  const navigateToArtist = useCallback(
    async (artistName: string, artistId?: string | null) => {
      // AC-7: Unconditionally close active overlays immediately
      useOverlayStore.getState().closeOverlay();

      const trimmedName = artistName.trim();
      if (!trimmedName) return;

      // Await hydration if artist store is currently loading on boot
      const artistStore = useArtistStore.getState();
      if (!artistStore.isLoaded && artistStore.isLoading) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useArtistStore.subscribe((state) => {
            if (state.isLoaded || !state.isLoading) {
              unsubscribe();
              resolve();
            }
          });
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 300);
        });
      }

      const currentArtists = useArtistStore.getState().artists;

      // AC-3: Resolve target artist ID from metadata or exact case-insensitive match
      let targetArtist = artistId
        ? currentArtists.find((a) => a.id === artistId)
        : undefined;

      if (!targetArtist) {
        targetArtist = currentArtists.find(
          (a) => a.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
      }

      if (targetArtist) {
        useArtistStore.getState().setActiveArtistId(targetArtist.id);
        useNavigationStore.getState().navigate("Artists", { artistId: targetArtist.id });
      } else if (artistId && currentArtists.length === 0 && !useArtistStore.getState().isLoaded) {
        useArtistStore.getState().setActiveArtistId(artistId);
        useNavigationStore.getState().navigate("Artists", { artistId });
      } else {
        // AC-5: Fall back to search screen with prefilled synchronized query
        useSearchStore.getState().setQuery(trimmedName, true);
        useNavigationStore.getState().navigate("Search", { searchQuery: trimmedName });
      }
    },
    []
  );

  const navigateToAlbum = useCallback(
    async (albumTitle: string, albumId?: string | null, artistName?: string | null) => {
      // AC-7: Unconditionally close active overlays immediately
      useOverlayStore.getState().closeOverlay();

      const trimmedTitle = albumTitle.trim();
      if (!trimmedTitle) return;

      // Await hydration if album store is currently loading on boot
      const albumStore = useAlbumStore.getState();
      if (!albumStore.isLoaded && albumStore.isLoading) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useAlbumStore.subscribe((state) => {
            if (state.isLoaded || !state.isLoading) {
              unsubscribe();
              resolve();
            }
          });
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 300);
        });
      }

      const currentAlbums = useAlbumStore.getState().albums;

      // AC-4: Resolve target album ID from metadata or exact case-insensitive title match with artist disambiguation
      let targetAlbum = albumId
        ? currentAlbums.find((a) => a.id === albumId)
        : undefined;

      if (!targetAlbum) {
        const titleMatches = currentAlbums.filter(
          (a) => a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
        );

        if (titleMatches.length === 1) {
          targetAlbum = titleMatches[0];
        } else if (titleMatches.length > 1 && artistName) {
          const trimmedArtist = artistName.trim().toLowerCase();
          targetAlbum =
            titleMatches.find(
              (a) => a.artistName.trim().toLowerCase() === trimmedArtist
            ) || titleMatches[0];
        } else if (titleMatches.length > 1) {
          targetAlbum = titleMatches[0];
        }
      }

      if (targetAlbum) {
        useAlbumStore.getState().setActiveAlbumId(targetAlbum.id);
        useNavigationStore.getState().navigate("Albums", { albumId: targetAlbum.id });
      } else if (albumId && currentAlbums.length === 0 && !useAlbumStore.getState().isLoaded) {
        useAlbumStore.getState().setActiveAlbumId(albumId);
        useNavigationStore.getState().navigate("Albums", { albumId });
      } else {
        // AC-5: Fall back to search screen with prefilled synchronized query
        useSearchStore.getState().setQuery(trimmedTitle, true);
        useNavigationStore.getState().navigate("Search", { searchQuery: trimmedTitle });
      }
    },
    []
  );

  return { navigateToArtist, navigateToAlbum };
}

