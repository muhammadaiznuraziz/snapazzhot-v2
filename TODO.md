# TODO: Perbaiki Durasi BTS Video

## Steps

### 1. BoothLayout.tsx - Fix `compileBtsVideoWithFrame()` sequential playback

- [x] Remove `loop: true` from video creation → changed to `loop: false`
- [x] Calculate segment duration: `(countdownSeconds + 1) * 1000` ms
- [x] Calculate total duration: `capturedFrames.length * segmentDuration`
- [x] Track current segment index based on elapsed time using `currentSegment`
- [x] Play/pause videos based on current segment (only play active segment)
- [x] In `drawEl`, render static image for non-active segments, video only for active segment

### 2. BoothLayout.tsx - Fix `btsDuration` in meta

- [x] Changed from `Math.max(...sessionBtsCaptureTimes) + 2` to `capturedFrames.length * (countdownSeconds + 1)`

### 3. Apply sequential playback to custom & standard layout sections

- [x] Applied `isActiveSegment` check in custom layout positions rendering
- [x] Applied `isActiveSegment` check in `drawStandardSlot` for standard layouts

### 4. Verify Print.tsx & Download.tsx

- [x] Confirmed `loop: false` already set in both files (no changes needed)
