# 0017. Desktop UI Responsiveness

**Date**: 2026-10-25
**Status**: Proposed

## Summary

This specification establishes a cross cutting responsiveness standard for Mumhanzi as a modern desktop music player. It introduces a three tier adaptive layout shell with an automatic 68px icon rail navigation below 1024px window width, fluid auto fill card grids, progressive column hiding on track tables, and a compact player deck below 900px. It standardizes styling across all pages from fixed inline styles onto Tailwind CSS v4 responsive classes while enforcing 60 frames per second desktop performance through `@tanstack/react-virtual` table row virtualization and fine grained Zustand selector isolation for audio playback ticks.

## Requirements

**User stories**:

* As a desktop music listener, I want the player window to resize and snap down to 640px by 480px smoothly without clipping controls, breaking layout containers, or creating horizontal scrollbars.
* As a desktop music listener, I want the sidebar navigation to collapse gracefully into a 68px icon rail when the window width is under 1024px so that main album, artist, and track views retain maximum room.
* As a desktop music listener, I want the player footer to adapt on narrower window widths by prioritizing track details and playback transport while collapsing volume into an overlay icon.
* As a desktop music listener, I want track tables in Library, Search, Playlists, and Liked Songs to hide non essential columns on compact windows while keeping title, artist, duration, and like buttons immediately accessible.
* As a desktop music listener with thousands of indexed songs, I want table scrolling and window resizing to remain instantaneous at 60 frames per second without DOM bloat or memory lag.
* As a desktop music listener playing audio continuously, I want progress slider updates to remain isolated from page components so that navigating views and browsing albums stays instantaneous.
* As a developer, I want clear and consistent Tailwind CSS v4 responsive classes across layout components, keeping inline styles strictly limited to dynamic runtime audio gradients and progress percentages.

**Acceptance criteria**:

* **AC-1**: Window boundaries in `src-tauri/tauri.conf.json` enforce a minimum width of 640px and minimum height of 480px, preventing window snapping breakdowns.
* **AC-2**: Navigation sidebar implements a three tier responsive layout: full 232px sidebar with text labels and playlists above 1024px, collapsing automatically to a 68px icon rail with hover tooltips below 1024px.
* **AC-3**: Player footer container adapts dynamically below 900px into a compact deck: hides secondary buttons, collapses volume slider into a popover toggle icon, and maintains clear track title and transport controls.
* **AC-4**: Track tables in Library, Liked Songs, Search, and Playlists implement progressive column hiding: drops File Size column under 1150px, drops Album column under 950px, preserving index, title, artist, duration, and like button down to 640px.
* **AC-5**: Card grids across Home, Albums, Artists, and Playlists use fluid auto fill layouts (`repeat(auto-fill, minmax(160px, 1fr))`) with Tailwind breakpoints, eliminating fixed column squishing on window resize.
* **AC-6**: Song table rows in Library and Playlists are virtualized using `@tanstack/react-virtual`, rendering only visible DOM nodes and maintaining 60 frames per second during rapid scrolling and window resizing.
* **AC-7**: Playback time progress (`currentTime`) updates are isolated in Zustand so only the timeline scrubber bar and elapsed time labels re render on audio timer ticks, preventing re renders of track lists, cards, or navigation shell.
* **AC-8**: Layout container styling across `App.tsx`, pages, and components migrates from fixed inline styles to Tailwind CSS v4 responsive utility classes, reserving inline `style` props exclusively for runtime audio gradients and progress percentages.
* **AC-9**: All interactive elements (buttons, sliders, cards, nav items) provide instant visual hover and active feedback with desktop cursor styling and smooth 150ms transitions.

## Decision

**Chosen option**: Option 1: Unified three tier responsive layout shell with Tailwind CSS v4 classes, `@tanstack/react-virtual` table virtualization, and isolated playback timer selectors.

We standardize responsive desktop design across all pages and components using Tailwind CSS v4 breakpoint tokens (`max-lg`, `max-md`, `max-sm`, and `min-[1440px]`), a dynamic 68px icon rail sidebar below 1024px, a compact player footer below 900px, `@tanstack/react-virtual` for windowed song tables, and fine grained Zustand selector subscriptions that prevent audio playback ticks from triggering component re renders.

**Implementation skills**: `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Standard definition

**Canonical pattern**:

```tsx
// 1. Responsive Layout Shell (src/App.tsx)
export function AppShell() {
  return (
    <div className="relative w-screen h-screen overflow-hidden grid grid-rows-[1fr_96px] max-md:grid-rows-[1fr_84px] grid-cols-[232px_1fr] max-lg:grid-cols-[68px_1fr] bg-[#0b0706] text-[#f4ebe4]">
      {/* Sidebar collapses from 232px to 68px icon rail below 1024px */}
      <aside className="border-r border-white/10 flex flex-col p-3 max-lg:p-2 overflow-y-auto">
        <NavigationRail isCompactBreakpoint />
      </aside>

      {/* Main Content Area with fluid padding */}
      <main className="overflow-y-auto overflow-x-hidden p-6 max-lg:p-4 max-sm:p-3">
        <Outlet />
      </main>

      {/* Player footer adapts to compact deck below 900px */}
      <PlayerFooter className="mx-6 mb-4 max-lg:mx-3 max-lg:mb-2" />
    </div>
  );
}

// 2. Fluid Auto Fill Card Grid (src/components/home/CuratedGrid.tsx)
export function ResponsiveCardGrid({ items }: { items: CardItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] min-[1440px]:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-sm:gap-3">
      {items.map((item) => (
        <Card key={item.id} data={item} />
      ))}
    </div>
  );
}

// 3. Progressive Column Hiding and Virtualized Table (src/components/library/SongTable.tsx)
import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualizedSongTable({ tracks }: { tracks: Track[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        className="grid grid-cols-[40px_3fr_2fr_2fr_90px_100px_40px] max-[1150px]:grid-cols-[40px_3fr_2fr_2fr_90px_40px] max-[950px]:grid-cols-[36px_3fr_2fr_80px_36px] items-center px-4 py-2 text-xs uppercase font-semibold text-neutral-400"
      >
        <span>#</span>
        <span>Title</span>
        <span>Artist</span>
        <span className="max-[950px]:hidden">Album</span>
        <span>Time</span>
        <span className="max-[1150px]:hidden">Size</span>
        <span></span>
      </div>

      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const track = tracks[virtualRow.index];
          return (
            <div
              key={track.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-[40px_3fr_2fr_2fr_90px_100px_40px] max-[1150px]:grid-cols-[40px_3fr_2fr_2fr_90px_40px] max-[950px]:grid-cols-[36px_3fr_2fr_80px_36px] items-center px-4 h-12 hover:bg-white/5 transition-colors"
            >
              <span className="text-center">{virtualRow.index + 1}</span>
              <span className="truncate">{track.title}</span>
              <span className="truncate text-neutral-400">{track.artist}</span>
              <span className="truncate text-neutral-400 max-[950px]:hidden">{track.album}</span>
              <span className="text-neutral-400">{track.durationFormatted}</span>
              <span className="text-neutral-400 max-[1150px]:hidden">{track.sizeFormatted}</span>
              <span>{/* Like button */}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. Playback Tick Isolation (src/components/player/Scrubber.tsx)
export function IsolatedScrubber() {
  // Only subscribed to currentTime and duration, isolated from track card or page updates
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.currentTrack?.durationSeconds ?? 0);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center gap-3">
      <span className="text-xs text-neutral-400 w-10 text-right">{formatSeconds(currentTime)}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full relative cursor-pointer">
        <div
          className="h-full bg-[#f0a982] rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-neutral-400 w-10">{formatSeconds(duration)}</span>
    </div>
  );
}
```

**Replaces**:

* Hardcoded inline styles (`style={{ gridTemplateColumns: "232px 1fr", margin: "0 32px 20px" }}`) for layout containers.
* Rigid card grid definitions such as `repeat(5, 1fr)` that squish content when windows are snapped or resized.
* Non virtualized track tables rendering thousands of simultaneous DOM nodes.
* Broad Zustand component subscriptions triggering unnecessary re renders on every 100ms audio tick.

**Enforcement**:

* ESLint rule flagging fixed pixel grid layouts on shared page containers.
* Review convention ensuring `@tanstack/react-virtual` is used for all table and collection views with unbounded rows.
* TypeScript strict store selector contracts isolating playback timeline updates.

**Rollout**:

Single unified migration updating all layout containers, navigation shell, player footer, and track tables across the application at once.

**Exceptions**:

* Modals and slide out overlays (Lyrics, Settings, Queue, Fullscreen) maintain fixed maximum widths (such as 640px or 720px) centered within the window.
* Dynamic runtime styling (cover art gradients, scrubber percentage fill, volume slider track fill) legitimately uses React inline `style` attributes.

## Consequences

**Positive**:

* Clean, responsive adaptation across any desktop window size from 640px compact snap to 4K widescreen.
* Instant 60 FPS scrolling and resizing even in libraries containing tens of thousands of tracks.
* Playback progress updates stay completely decoupled from page rendering, keeping CPU usage and battery draw low.
* Codebase replaces messy inline style objects with structured Tailwind utility classes.

**Negative / tradeoffs**:

* Adds one lightweight dependency: `@tanstack/react-virtual` (less than 15KB bundle size).
* Virtual tables require fixed or estimated row heights for accurate scrollbar virtualization math.

**Neutral**:

* Desktop users on ultra wide monitors benefit from maximum card density without oversized stretched elements.
* Window resizing in Tauri feels instant and native.

## Follow-up

* [ ] Verify window snapping behavior on Windows 11 FancyZones and split screen viewports.
* [ ] Add unit and performance tests verifying virtualized song table rendering speed under 5,000 mock tracks.
