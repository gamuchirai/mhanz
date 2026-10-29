# 0005. Your library and folder browser: rationale

## Context

In Mutinhimira, listeners need a central location to explore their indexed local music collection and manage the music folders monitored on their computer. While the Home screen highlights featured discoveries and Search provides instant querying across all content, Your Library serves as the home base for personal local music files.

The design must satisfy multiple user needs simultaneously: giving listeners immediate access to their entire track collection with flexible sorting and filtering, while offering clear visibility and control over indexed music directories. Without a cohesive design, the interface risks becoming fragmented into disjointed screens or burying folder management inside hidden application settings.

Under the Facade build approach, this screen must deliver a fully clickable, responsive user experience on simulated placeholder data before native Rust file scanning and SQLite storage are wired in Phase 2.

## Options considered

### Option 1: Split tabs view between Songs and Folders

Separate the screen into two top level tabs: a Songs tab displaying the full tracks table and a Folders tab showing the indexed directory browser and folder management cards.

**Pros**:

- Keeps each individual view simple and visually uncluttered.
- Dedicates maximum vertical height to the songs table when on the Songs tab.

**Cons**:

- Forces the user to switch back and forth between tabs to see which folders contain their songs.
- Hides folder management status from listeners who spend most of their time in the library.

### Option 2: Unified screen with collapsible folder panel and songs table (Chosen)

Provide a unified library screen with a prominent summary hero bar, an expandable folder management panel at the top, and the comprehensive songs table below.

**Pros**:

- Keeps library statistics, folder monitoring, and song browsing in one cohesive, easily accessible screen.
- Allows listeners to collapse the folder panel when focused on listening or expand it when managing music directories.
- Enables direct folder filtering: clicking any folder card immediately filters the songs table below to that folder's tracks without navigating away.

**Cons**:

- Requires careful vertical spacing so the expanded folder panel does not squeeze the songs table on smaller laptop displays.

### Option 3: Two pane sidebar tree view with folder navigation

Render a left side directory tree pane showing local folders and an adjacent right pane showing songs from whichever folder is selected in the tree.

**Pros**:

- Familiar layout for users accustomed to traditional desktop file managers like Windows Explorer.

**Cons**:

- Clashes with the main application navigation sidebar and creates a confusing nested sidebar appearance.
- Makes viewing all songs across all folders simultaneously awkward.

## Rationale

Option 2 is chosen because it best matches the modern desktop audio player experience seen in Windows Groove Music and the Midnight visual layout. A unified screen ensures listeners never lose track of where their music originates while keeping the primary focus on listening and browsing.

The collapsible folder panel provides flexibility: listeners can check monitored folders, trigger simulated rescans, or add new demo folders when desired, then collapse the panel to give full vertical prominence to the sortable songs table.

The direct filtering interaction, where clicking an indexed folder card filters the songs table below, bridges folder organization with track listening in an intuitive, discoverable way.
