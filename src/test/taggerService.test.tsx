import { describe, expect, it } from "vitest";
import { tagEditorProbeFile } from "../services/tagger";

const supportedFormats = [
  ["MP3", "mp3"],
  ["FLAC", "flac"],
  ["WAV", "wav"],
  ["OGG", "ogg"],
  ["M4A", "m4a"],
  ["AAC", "aac"],
] as const;

describe("tagEditorProbeFile mock format detection", () => {
  it.each(supportedFormats)(
    "reports %s paths as %s files (AC-1)",
    async (extension, expectedFormat) => {
      const tags = await tagEditorProbeFile(
        `format-${extension}`,
        `C:\\Music\\sample.${extension}`
      );

      expect(tags.format).toBe(expectedFormat);
    }
  );

  it("uses MP3 as the fallback for an unsupported extension (AC-1)", async () => {
    const tags = await tagEditorProbeFile("format-unsupported", "C:\\Music\\sample.opus");

    expect(tags.format).toBe("mp3");
  });
});
