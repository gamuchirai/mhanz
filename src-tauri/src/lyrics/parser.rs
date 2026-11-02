//! Zero dependency LRC lyrics parser supporting standard timestamps, header offsets,
//! multiple timestamps per line, inline word tag stripping, and BOM handling.

use crate::db::models::LyricLineDto;

/// Output of lyrics parsing containing sync status and extracted line representations.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedLyrics {
    /// Whether lyrics content was discovered and extracted.
    pub has_lyrics: bool,
    /// Whether synchronized timestamps are present.
    pub is_synced: bool,
    /// Ordered list of synchronized lyric lines.
    pub lines: Vec<LyricLineDto>,
    /// Plain text representation.
    pub plain_text: Option<String>,
}

/// Strips inline word level timing tags like `<00:12.34>` or inline `[00:12.34]` from lyric text.
fn strip_inline_timing_tags(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut in_angle = false;
    let mut in_bracket = false;
    let mut bracket_buf = String::new();

    for ch in input.chars() {
        if ch == '<' {
            in_angle = true;
            continue;
        }
        if in_angle {
            if ch == '>' {
                in_angle = false;
            }
            continue;
        }

        if ch == '[' {
            in_bracket = true;
            bracket_buf.clear();
            continue;
        }
        if in_bracket {
            if ch == ']' {
                in_bracket = false;
                // If bracket_buf is a timestamp, discard it; otherwise preserve it
                if parse_timestamp_tag(&bracket_buf).is_none() {
                    result.push('[');
                    result.push_str(&bracket_buf);
                    result.push(']');
                }
            } else {
                bracket_buf.push(ch);
            }
            continue;
        }

        result.push(ch);
    }

    if in_bracket {
        result.push('[');
        result.push_str(&bracket_buf);
    }

    result
}

/// Checks if a string segment matches `mm:ss.xx` or `mm:ss.xxx` and returns seconds.
fn parse_timestamp_tag(tag: &str) -> Option<f64> {
    let tag = tag.trim();
    let parts: Vec<&str> = tag.split(':').collect();
    if parts.len() != 2 {
        return None;
    }

    let minutes: f64 = parts[0].trim().parse().ok()?;
    let seconds: f64 = parts[1].trim().parse().ok()?;
    if minutes < 0.0 || seconds < 0.0 {
        return None;
    }

    Some(minutes * 60.0 + seconds)
}

/// Checks if a tag represents a header offset like `offset: +/-ms` and returns offset in milliseconds.
fn parse_offset_header(tag: &str) -> Option<f64> {
    let lower = tag.to_lowercase();
    let trimmed = lower.trim();
    if let Some(rest) = trimmed.strip_prefix("offset:") {
        let clean = rest.trim();
        let clean = clean.strip_prefix('+').unwrap_or(clean).trim();
        if let Ok(ms) = clean.parse::<f64>() {
            return Some(ms);
        }
    }
    None
}

/// Checks if a tag is an LRC metadata header tag (e.g. `ar:`, `ti:`, `al:`, `by:`, `re:`, `ve:`, `length:`).
fn is_metadata_header(tag: &str) -> bool {
    let lower = tag.to_lowercase();
    let trimmed = lower.trim();
    let prefixes = [
        "ar:",
        "ti:",
        "al:",
        "by:",
        "re:",
        "ve:",
        "length:",
        "offset:",
        "creator:",
        "author:",
        "id:",
        "la:",
        "encoding:",
    ];
    prefixes.iter().any(|p| trimmed.starts_with(p))
}

/// Parses raw LRC byte content or audio tag text into structured lyrics.
pub fn parse_lrc(content_bytes: &[u8], track_id: &str) -> ParsedLyrics {
    // 1. Strip UTF-8 BOM if present (AC-3)
    let bytes_without_bom = if content_bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &content_bytes[3..]
    } else {
        content_bytes
    };

    // 2. Decode with UTF-8 fallback (AC-3)
    let content_str = String::from_utf8(bytes_without_bom.to_vec())
        .unwrap_or_else(|_| String::from_utf8_lossy(bytes_without_bom).to_string());

    let lines: Vec<&str> = content_str.lines().collect();

    // First pass: extract global header offset tag if present (AC-2)
    let mut header_offset_ms = 0.0;
    for line in &lines {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let inner = &trimmed[1..trimmed.len() - 1];
            if let Some(offset) = parse_offset_header(inner) {
                header_offset_ms = offset;
                break;
            }
        }
    }

    let header_offset_seconds = header_offset_ms / 1000.0;

    // Second pass: extract timestamped lines and plain text lines
    let mut timed_entries: Vec<(f64, String)> = Vec::new();
    let mut plain_text_lines: Vec<String> = Vec::new();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let mut line_timestamps: Vec<f64> = Vec::new();
        let mut idx = 0;
        let line_chars: Vec<char> = trimmed.chars().collect();
        let len = line_chars.len();

        // Extract all leading timestamp tags (e.g. "[00:12.00][00:24.00]Lyric line")
        while idx < len && line_chars[idx] == '[' {
            if let Some(close_idx) = line_chars[idx..].iter().position(|&c| c == ']') {
                let abs_close = idx + close_idx;
                let tag_content: String = line_chars[idx + 1..abs_close].iter().collect();

                if is_metadata_header(&tag_content) {
                    idx = abs_close + 1;
                    continue;
                }

                if let Some(ts) = parse_timestamp_tag(&tag_content) {
                    let adjusted_time = ts + header_offset_seconds;
                    let clamped_time = if adjusted_time < 0.0 {
                        0.0
                    } else {
                        adjusted_time
                    };
                    line_timestamps.push(clamped_time);
                    idx = abs_close + 1;
                    continue;
                }
                break;
            } else {
                break;
            }
        }

        let raw_text_part: String = line_chars[idx..].iter().collect();
        let cleaned_text = strip_inline_timing_tags(&raw_text_part);
        let trimmed_text = cleaned_text.trim();

        if !line_timestamps.is_empty() {
            if !trimmed_text.is_empty() {
                for ts in line_timestamps {
                    timed_entries.push((ts, trimmed_text.to_string()));
                }
                plain_text_lines.push(trimmed_text.to_string());
            }
        } else if (!trimmed.starts_with('[')
            || !trimmed.ends_with(']')
            || !is_metadata_header(&trimmed[1..trimmed.len() - 1]))
            && !trimmed_text.is_empty()
        {
            plain_text_lines.push(trimmed_text.to_string());
        }
    }

    if !timed_entries.is_empty() {
        // Sort chronologically by second offset (AC-2)
        timed_entries.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        let dtos: Vec<LyricLineDto> = timed_entries
            .into_iter()
            .enumerate()
            .map(|(i, (time_seconds, text))| LyricLineDto {
                id: format!("{}-l{}", track_id, i),
                time_seconds,
                text,
            })
            .collect();

        let plain_summary = if !plain_text_lines.is_empty() {
            Some(plain_text_lines.join("\n"))
        } else {
            None
        };

        ParsedLyrics {
            has_lyrics: true,
            is_synced: true,
            lines: dtos,
            plain_text: plain_summary,
        }
    } else if !plain_text_lines.is_empty() {
        ParsedLyrics {
            has_lyrics: true,
            is_synced: false,
            lines: Vec::new(),
            plain_text: Some(plain_text_lines.join("\n")),
        }
    } else {
        ParsedLyrics {
            has_lyrics: false,
            is_synced: false,
            lines: Vec::new(),
            plain_text: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_lrc() {
        let lrc = r#"
[ar:Ed Sheeran]
[ti:Perfect]
[00:04.20]I found a love for me
[00:12.500]Darling just dive right in
"#;
        let parsed = parse_lrc(lrc.as_bytes(), "track-1");
        assert!(parsed.has_lyrics);
        assert!(parsed.is_synced);
        assert_eq!(parsed.lines.len(), 2);
        assert_eq!(parsed.lines[0].id, "track-1-l0");
        assert_eq!(parsed.lines[0].time_seconds, 4.2);
        assert_eq!(parsed.lines[0].text, "I found a love for me");
        assert_eq!(parsed.lines[1].id, "track-1-l1");
        assert_eq!(parsed.lines[1].time_seconds, 12.5);
        assert_eq!(parsed.lines[1].text, "Darling just dive right in");
    }

    #[test]
    fn test_parse_header_offset_and_multiple_timestamps() {
        let lrc = r#"
[offset: 500]
[00:10.00][00:20.00]Repeated vocal refrain
"#;
        let parsed = parse_lrc(lrc.as_bytes(), "track-2");
        assert!(parsed.has_lyrics);
        assert!(parsed.is_synced);
        assert_eq!(parsed.lines.len(), 2);
        assert_eq!(parsed.lines[0].time_seconds, 10.5); // 10.0 + 0.5s offset
        assert_eq!(parsed.lines[0].text, "Repeated vocal refrain");
        assert_eq!(parsed.lines[1].time_seconds, 20.5); // 20.0 + 0.5s offset
        assert_eq!(parsed.lines[1].text, "Repeated vocal refrain");
    }

    #[test]
    fn test_parse_negative_header_offset_clamping() {
        let lrc = r#"
[offset: -2000]
[00:01.00]Starts immediately
"#;
        let parsed = parse_lrc(lrc.as_bytes(), "track-neg");
        assert!(parsed.has_lyrics);
        assert_eq!(parsed.lines[0].time_seconds, 0.0); // 1.0 - 2.0 = -1.0 clamped to 0.0
    }

    #[test]
    fn test_parse_utf8_bom_and_inline_tags() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"[00:05.00]Hello <00:05.50>sweet <00:06.00>world\n");
        let parsed = parse_lrc(&bytes, "track-3");
        assert!(parsed.has_lyrics);
        assert!(parsed.is_synced);
        assert_eq!(parsed.lines.len(), 1);
        assert_eq!(parsed.lines[0].text, "Hello sweet world");
    }

    #[test]
    fn test_parse_plain_text_fallback() {
        let plain = "First plain line\nSecond plain line\n";
        let parsed = parse_lrc(plain.as_bytes(), "track-4");
        assert!(parsed.has_lyrics);
        assert!(!parsed.is_synced);
        assert_eq!(parsed.lines.len(), 0);
        assert_eq!(
            parsed.plain_text.as_deref(),
            Some("First plain line\nSecond plain line")
        );
    }

    #[test]
    fn test_parse_empty_content() {
        let empty = "   \n\n\t  \n";
        let parsed = parse_lrc(empty.as_bytes(), "track-5");
        assert!(!parsed.has_lyrics);
        assert!(!parsed.is_synced);
        assert!(parsed.lines.is_empty());
        assert!(parsed.plain_text.is_none());
    }
}
