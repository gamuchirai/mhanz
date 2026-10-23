/**
 * Formats duration in seconds to mm:ss format.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Formats total duration for library header summary (e.g. 34 mins or 1 hr 12 mins).
 */
export function formatTotalDuration(seconds: number): string {
  const totalMins = Math.floor(seconds / 60);
  if (totalMins < 60) {
    return `${totalMins} min${totalMins === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  return `${hours} hr${hours === 1 ? "" : "s"} ${remainingMins} min${remainingMins === 1 ? "" : "s"}`;
}

/**
 * Formats byte size to readable string (e.g. 34.2 MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Formats an ISO date string to a friendly relative representation (e.g. Today, Yesterday, 3 days ago).
 */
export function formatRelativeDate(isoDateString: string): string {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

