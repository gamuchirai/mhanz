# 0022 Verification: Home listening history and popular tracks persistence

This manual verification plan confirms that Mutinhimira connects the Home discovery screen to local SQLite listening history and popular track metrics.

## Prerequisites

1. Launch desktop application in development mode:
   ```bash
   npm run tauri dev
   ```
2. Ensure you have monitored music folders containing songs in Your Library.

## Verification Steps

### 1. Contextual empty state on clean library

1. Launch the application when no music folders have been scanned yet.
2. Confirm the Recently Played carousel presents guidance explaining that no music is in your library yet.
3. Confirm the Scan music folder button is displayed and clicking it navigates to Your Library.

### 2. Milestone playback recording

1. Navigate to Your Library or Albums and click play on a track.
2. Keep the playback position under twenty five seconds and pause or skip to another song.
3. Return to the Home screen and verify that this brief listen was not recorded in history.
4. Now play a song and allow playback to continue past thirty seconds or half duration.
5. Notice that the listening history records automatically without blocking audio output.
6. The recently played carousel updates to display the played track with cover artwork and metadata.

### 3. Track deduplication in recently played carousel

1. Play the same track again across a distinct session.
2. Allow playback to reach the thirty second milestone.
3. Return to the Home screen and observe the carousel.
4. Verify the song appears exactly once at the front of the carousel with its updated play timestamp.

### 4. Popular tracks ranking and backfill

1. Review the Popular tracks table on the right side of the Home screen.
2. Verify songs with the highest local play counts appear at the top with two digit rank indicators.
3. Verify that play counts are formatted and visible next to artist names.
4. For remaining positions where tracks have zero plays, confirm unplayed songs backfill the list gracefully.

### 5. Dynamic hero showcase banner

1. Examine the Hero featured banner at the top of the Home screen.
2. Verify that the banner displays the top played track with the badge TOP PLAYED.
3. Confirm that clicking the Play button begins playback for that featured track.

### 6. Clear recent playback history

1. On the Recently played section header, click the Clear button.
2. Verify that the carousel empties and shows the invitation to play songs.
3. Verify that all time play counts on the Popular tracks table remain unchanged.
