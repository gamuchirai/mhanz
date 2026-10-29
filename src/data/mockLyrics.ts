import type { TrackLyrics } from "../types/overlays";

/**
 * Catalog of mock synchronised and plain lyrics mapped by track ID.
 */
export const mockLyricsCatalog: Record<string, TrackLyrics> = {
  "track-1": {
    trackId: "track-1",
    isSynced: true,
    lines: [
      { id: "l1-1", timeSeconds: 4, text: "I found a love for me" },
      { id: "l1-2", timeSeconds: 12, text: "Darling just dive right in and follow my lead" },
      { id: "l1-3", timeSeconds: 22, text: "Well I found a girl beautiful and sweet" },
      { id: "l1-4", timeSeconds: 32, text: "I never knew you were the someone waiting for me" },
      { id: "l1-5", timeSeconds: 43, text: "Cause we were just kids when we fell in love" },
      { id: "l1-6", timeSeconds: 50, text: "Not knowing what it was" },
      { id: "l1-7", timeSeconds: 55, text: "I will not give you up this time" },
      { id: "l1-8", timeSeconds: 65, text: "Darling just kiss me slow your heart is all I own" },
      { id: "l1-9", timeSeconds: 76, text: "And in your eyes you are holding mine" },
      {
        id: "l1-10",
        timeSeconds: 88,
        text: "Baby I am dancing in the dark with you between my arms",
      },
      {
        id: "l1-11",
        timeSeconds: 101,
        text: "Barefoot on the grass listening to our favorite song",
      },
      {
        id: "l1-12",
        timeSeconds: 112,
        text: "When you said you looked a mess I whispered underneath my breath",
      },
      { id: "l1-13", timeSeconds: 124, text: "You heard it darling you look perfect tonight" },
      { id: "l1-14", timeSeconds: 140, text: "Well I found a woman stronger than anyone I know" },
      {
        id: "l1-15",
        timeSeconds: 151,
        text: "She shares my dreams I hope that someday I will share her home",
      },
      { id: "l1-16", timeSeconds: 163, text: "I found a love to carry more than just my secrets" },
      { id: "l1-17", timeSeconds: 174, text: "To carry love to carry children of our own" },
      { id: "l1-18", timeSeconds: 186, text: "We are still kids but we are so in love" },
      { id: "l1-19", timeSeconds: 194, text: "Fighting against all odds" },
      { id: "l1-20", timeSeconds: 200, text: "I know we will be alright this time" },
      {
        id: "l1-21",
        timeSeconds: 210,
        text: "Darling just hold my hand be my girl I will be your man",
      },
      { id: "l1-22", timeSeconds: 222, text: "I see my future in your eyes" },
      { id: "l1-23", timeSeconds: 235, text: "Now I know I have met an angel in person" },
      { id: "l1-24", timeSeconds: 245, text: "And she looks perfect tonight" },
    ],
    source: "Musixmatch Verified",
  },
  "track-2": {
    trackId: "track-2",
    isSynced: true,
    lines: [
      { id: "l2-1", timeSeconds: 6, text: "Not trying to be indie" },
      { id: "l2-2", timeSeconds: 15, text: "Not trying to be cool" },
      { id: "l2-3", timeSeconds: 24, text: "Just trying to be in this" },
      { id: "l2-4", timeSeconds: 33, text: "Tell me are you too" },
      { id: "l2-5", timeSeconds: 46, text: "Can you feel where the wind is" },
      { id: "l2-6", timeSeconds: 58, text: "Can you feel through all of the windows" },
      { id: "l2-7", timeSeconds: 70, text: "Inside this room" },
      { id: "l2-8", timeSeconds: 88, text: "Cause I wanna touch you baby" },
      { id: "l2-9", timeSeconds: 100, text: "And I wanna feel you too" },
      { id: "l2-10", timeSeconds: 114, text: "I wanna see the sunrise on your sins" },
      { id: "l2-11", timeSeconds: 130, text: "Just you and me" },
      { id: "l2-12", timeSeconds: 145, text: "Light it up on the run" },
      { id: "l2-13", timeSeconds: 160, text: "Let us make for the sun" },
      { id: "l2-14", timeSeconds: 175, text: "Do not give up let us walk through the night" },
      { id: "l2-15", timeSeconds: 195, text: "Hold on until dusk till dawn" },
      { id: "l2-16", timeSeconds: 215, text: "Baby I am right here with you" },
    ],
    source: "LRC Community",
  },
  "track-3": {
    trackId: "track-3",
    isSynced: false,
    lines: [],
    plainText:
      "Late night drives under amber city lights\nStatic on the radio humming our favorite melodies\nEvery step feels lighter when the rhythm matches\nBetter with you in the passenger seat\nAll the neon signs fade away into dawn\nWhispers in the cool midnight air\nBetter with you forevermore.",
    source: "Plain Text Archive",
  },
};

/**
 * Returns lyrics for a given track ID or generates clean default synced lines.
 */
export function getLyricsForTrack(trackId: string, title?: string, artist?: string): TrackLyrics {
  if (mockLyricsCatalog[trackId]) {
    return mockLyricsCatalog[trackId];
  }

  // If track is not in catalog, return empty or fallback synced lyric lines
  if (trackId === "no-lyrics-track" || trackId.startsWith("instrumental")) {
    return {
      trackId,
      isSynced: false,
      lines: [],
      plainText: "",
    };
  }

  // Procedural fallback lines based on title and artist
  const songTitle = title ?? "Current Track";
  const songArtist = artist ?? "Mutinhimira Artist";
  return {
    trackId,
    isSynced: true,
    lines: [
      { id: `${trackId}-l1`, timeSeconds: 5, text: `Listening to ${songTitle}` },
      { id: `${trackId}-l2`, timeSeconds: 15, text: `Melodies woven by ${songArtist}` },
      { id: `${trackId}-l3`, timeSeconds: 28, text: "Echoes drifting through the midnight air" },
      { id: `${trackId}-l4`, timeSeconds: 42, text: "Rhythm pulses softly under golden light" },
      { id: `${trackId}-l5`, timeSeconds: 60, text: "Lost in harmony as seconds slip away" },
      { id: `${trackId}-l6`, timeSeconds: 85, text: `Singing along with ${songTitle}` },
      { id: `${trackId}-l7`, timeSeconds: 110, text: "Every beat resonant and crystal clear" },
      { id: `${trackId}-l8`, timeSeconds: 140, text: "Midnight soundscape embracing the soul" },
    ],
    source: "Auto Generated Preview",
  };
}
