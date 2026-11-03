/**
 * Zustand store for audio file metadata tag editor modal state,
 * probing synchronization, and batch edit aggregation.
 */

import { create } from "zustand";
import type { TrackDto } from "../types/database";
import type {
  BatchSaveResultDto,
  BatchTrackUpdates,
  CoverArtAction,
  ProbedAudioTagsDto,
  SaveTrackTagsDto,
} from "../types/tagger";
import {
  tagEditorProbeFile,
  tagEditorSaveBatch,
  tagEditorSaveTrack,
} from "../services/tagger";
import { formatCoverArtUrl } from "../services/scanner";

export interface BatchFieldComparison {
  artist: string | null;
  hasMultipleArtists: boolean;
  album: string | null;
  hasMultipleAlbums: boolean;
  albumArtist: string | null;
  hasMultipleAlbumArtists: boolean;
  genre: string | null;
  hasMultipleGenres: boolean;
  year: number | null;
  hasMultipleYears: boolean;
  discNumber: number | null;
  hasMultipleDiscs: boolean;
  coverArtPath: string | null;
  hasMultipleCovers: boolean;
}

export interface TagEditorState {
  // Single Track Modal State
  isOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  probeRequestId: number;
  error: string | null;
  trackId: string | null;
  filePath: string | null;
  tags: ProbedAudioTagsDto | null;
  coverArtAction: CoverArtAction;
  coverPreviewUrl: string | null;

  // Batch Modal State
  isBatchOpen: boolean;
  isBatchLoading: boolean;
  isBatchSaving: boolean;
  batchError: string | null;
  batchAlbumId: string | null;
  batchTrackIds: string[];
  batchTracks: TrackDto[];
  batchFields: BatchFieldComparison | null;
  batchCoverArtAction: CoverArtAction;
  batchCoverPreviewUrl: string | null;
  batchSaveResult: BatchSaveResultDto | null;

  // Single Editor Actions
  openTrackEditor: (trackId: string, filePath?: string) => Promise<void>;
  closeTrackEditor: () => void;
  setCoverArtAction: (action: CoverArtAction, previewUrl?: string | null) => void;
  saveCurrentTrack: (
    formFields: Omit<SaveTrackTagsDto, "trackId" | "filePath" | "coverArtAction">,
  ) => Promise<TrackDto | null>;

  // Batch Editor Actions
  openBatchEditor: (albumId: string | undefined, tracks: TrackDto[]) => void;
  closeBatchEditor: () => void;
  setBatchCoverArtAction: (action: CoverArtAction, previewUrl?: string | null) => void;
  saveBatch: (updates: BatchTrackUpdates) => Promise<BatchSaveResultDto | null>;
  clearBatchSaveResult: () => void;
}

function computeBatchFields(tracks: TrackDto[]): BatchFieldComparison {
  if (tracks.length === 0) {
    return {
      artist: null,
      hasMultipleArtists: false,
      album: null,
      hasMultipleAlbums: false,
      albumArtist: null,
      hasMultipleAlbumArtists: false,
      genre: null,
      hasMultipleGenres: false,
      year: null,
      hasMultipleYears: false,
      discNumber: null,
      hasMultipleDiscs: false,
      coverArtPath: null,
      hasMultipleCovers: false,
    };
  }

  const first = tracks[0];
  const allSameArtist = tracks.every((t) => t.artist_name === first.artist_name);
  const allSameAlbum = tracks.every((t) => (t.album_name ?? "") === (first.album_name ?? ""));
  const allSameAlbumArtist = tracks.every(
    (t) => (t.album_artist ?? "") === (first.album_artist ?? ""),
  );
  const allSameGenre = tracks.every((t) => (t.genre ?? "") === (first.genre ?? ""));
  const allSameYear = tracks.every((t) => (t.year ?? null) === (first.year ?? null));
  const allSameDisc = tracks.every((t) => t.disc_number === first.disc_number);
  const allSameCover = tracks.every(
    (t) => (t.cover_art_path ?? "") === (first.cover_art_path ?? ""),
  );

  return {
    artist: allSameArtist ? first.artist_name : null,
    hasMultipleArtists: !allSameArtist,
    album: allSameAlbum ? first.album_name : null,
    hasMultipleAlbums: !allSameAlbum,
    albumArtist: allSameAlbumArtist ? first.album_artist : null,
    hasMultipleAlbumArtists: !allSameAlbumArtist,
    genre: allSameGenre ? first.genre : null,
    hasMultipleGenres: !allSameGenre,
    year: allSameYear ? first.year : null,
    hasMultipleYears: !allSameYear,
    discNumber: allSameDisc ? first.disc_number : null,
    hasMultipleDiscs: !allSameDisc,
    coverArtPath: allSameCover ? first.cover_art_path : null,
    hasMultipleCovers: !allSameCover,
  };
}

export const useTagEditorStore = create<TagEditorState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  isSaving: false,
  probeRequestId: 0,
  error: null,
  trackId: null,
  filePath: null,
  tags: null,
  coverArtAction: { type: "keep" },
  coverPreviewUrl: null,

  isBatchOpen: false,
  isBatchLoading: false,
  isBatchSaving: false,
  batchError: null,
  batchAlbumId: null,
  batchTrackIds: [],
  batchTracks: [],
  batchFields: null,
  batchCoverArtAction: { type: "keep" },
  batchCoverPreviewUrl: null,
  batchSaveResult: null,

  openTrackEditor: async (trackId: string, filePath?: string) => {
    const probeRequestId = get().probeRequestId + 1;
    set({
      isOpen: true,
      isLoading: true,
      isSaving: false,
      probeRequestId,
      error: null,
      trackId,
      filePath: filePath ?? null,
      tags: null,
      coverArtAction: { type: "keep" },
      coverPreviewUrl: null,
    });

    try {
      const probed = await tagEditorProbeFile(trackId, filePath);
      const current = get();
      if (
        current.probeRequestId !== probeRequestId ||
        !current.isOpen ||
        current.trackId !== trackId
      ) {
        return;
      }

      set({
        isLoading: false,
        tags: probed,
        coverPreviewUrl: probed.coverArtPath ? formatCoverArtUrl(probed.coverArtPath) : null,
      });
    } catch (err) {
      const current = get();
      if (
        current.probeRequestId !== probeRequestId ||
        !current.isOpen ||
        current.trackId !== trackId
      ) {
        return;
      }

      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  closeTrackEditor: () => {
    set({
      isOpen: false,
      isLoading: false,
      isSaving: false,
      probeRequestId: get().probeRequestId + 1,
      error: null,
      trackId: null,
      filePath: null,
      tags: null,
      coverArtAction: { type: "keep" },
      coverPreviewUrl: null,
    });
  },

  setCoverArtAction: (action: CoverArtAction, previewUrl?: string | null) => {
    set({
      coverArtAction: action,
      coverPreviewUrl: previewUrl !== undefined ? previewUrl : get().coverPreviewUrl,
    });
  },

  saveCurrentTrack: async (formFields) => {
    const { trackId, filePath, coverArtAction } = get();
    if (!trackId) {
      return null;
    }

    set({ isSaving: true, error: null });
    try {
      const payload: SaveTrackTagsDto = {
        trackId,
        filePath: filePath ?? undefined,
        title: formFields.title,
        artistName: formFields.artistName,
        albumName: formFields.albumName,
        albumArtist: formFields.albumArtist,
        genre: formFields.genre,
        year: formFields.year,
        trackNumber: formFields.trackNumber,
        discNumber: formFields.discNumber,
        coverArtAction,
      };

      const updated = await tagEditorSaveTrack(payload);
      set({ isSaving: false, isOpen: false });
      return updated;
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  openBatchEditor: (albumId, tracks) => {
    const fields = computeBatchFields(tracks);
    const initialCoverUrl = fields.coverArtPath
      ? formatCoverArtUrl(fields.coverArtPath)
      : null;

    set({
      isBatchOpen: true,
      isBatchLoading: false,
      isBatchSaving: false,
      batchError: null,
      batchAlbumId: albumId ?? null,
      batchTrackIds: tracks.map((t) => t.id),
      batchTracks: tracks,
      batchFields: fields,
      batchCoverArtAction: { type: "keep" },
      batchCoverPreviewUrl: initialCoverUrl,
      batchSaveResult: null,
    });
  },

  closeBatchEditor: () => {
    set({
      isBatchOpen: false,
      isBatchLoading: false,
      isBatchSaving: false,
      batchError: null,
      batchAlbumId: null,
      batchTrackIds: [],
      batchTracks: [],
      batchFields: null,
      batchCoverArtAction: { type: "keep" },
      batchCoverPreviewUrl: null,
      batchSaveResult: null,
    });
  },

  setBatchCoverArtAction: (action: CoverArtAction, previewUrl?: string | null) => {
    set({
      batchCoverArtAction: action,
      batchCoverPreviewUrl:
        previewUrl !== undefined ? previewUrl : get().batchCoverPreviewUrl,
    });
  },

  saveBatch: async (updates) => {
    const { batchAlbumId, batchTrackIds, batchCoverArtAction } = get();
    if (batchTrackIds.length === 0) {
      return null;
    }

    set({ isBatchSaving: true, batchError: null });
    try {
      const effectiveUpdates: BatchTrackUpdates = {
        ...updates,
        coverArtAction:
          batchCoverArtAction.type !== "keep"
            ? batchCoverArtAction
            : updates.coverArtAction ?? { type: "keep" },
      };

      const result = await tagEditorSaveBatch({
        albumId: batchAlbumId ?? undefined,
        trackIds: batchTrackIds,
        updates: effectiveUpdates,
      });

      set({
        isBatchSaving: false,
        batchSaveResult: result,
      });

      if (result.failed.length === 0) {
        set({ isBatchOpen: false });
      }

      return result;
    } catch (err) {
      set({
        isBatchSaving: false,
        batchError: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  clearBatchSaveResult: () => {
    set({ batchSaveResult: null });
  },
}));
