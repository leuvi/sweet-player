# @sweet-player/core

## 0.10.3

### Patch Changes

- 08070a7: Fix the thumbnail preview's time label: restore the original pill-shaped bubble style (was accidentally rendered as a full-width bar) and attach it just below the preview box.

## 0.10.2

### Patch Changes

- 3fb5024: Move the thumbnail preview's time label to sit flush below the image (instead of overlaid on it), shrink its height, mirror the hover caliper marker with a triangle above and below the progress bar, and increase the preview border opacity to 90%.

## 0.10.1

### Patch Changes

- d1942a5: Add a hover position caliper marker on the progress bar, move the time label into the thumbnail preview box when `thumbnails` is enabled, and replace the preview's drop shadow with a subtle border.

## 0.10.0

### Minor Changes

- 3a24ff3: Add `poster` (cover image shown before playback) and `thumbnails` (WebVTT sprite preview shown on progress-bar hover) options. Both respect `hiddenControls` (`'poster'`, `'thumbnails'`) to skip initialization entirely.

## 0.9.0

### Minor Changes

- 6dc8c1a: Add a center play/pause flash: toggling playback briefly shows the matching icon in the center of the video, scaling up and fading out (YouTube-style). Triggers on space / click / the play button; skipped for autoplay and programmatic `play()`/`pause()`.

## 0.8.1

### Patch Changes

- 33f80bc: Refine the heatmap curve: restore the more solid fill/stroke opacities and lift the curve baseline so even the lowest-heat point keeps a gap from the progress bar.

## 0.8.0

### Minor Changes

- 8116032: Add heatmap ("most replayed") curve above the progress bar. Pass `heatmap: [{ time, value }]` to render a YouTube-style SVG curve (bright top line + fill fading downward) that fades in on progress-bar hover, with the watched portion brighter. A toggle appears in the settings panel below Picture-in-Picture; add `'heatmap'` to `hiddenControls` to skip its initialization entirely. Zero extra dependencies.

## 0.7.3

### Patch Changes

- fd155fb: Add sweet-danmaku (bullet comments) plugin documentation to README

## 0.7.2

### Patch Changes

- 965bb72: Add logo icon to changelog entry in context menu

## 0.7.1

### Patch Changes

- 3e625c1: Add English README as default, restructure docs for better user onboarding

## 0.7.0

### Minor Changes

- 8031351: Add `addContextMenuItem` API for plugins to dynamically register right-click menu items

## 0.6.4

### Patch Changes

- 5b05939: Replace all `<button>` elements with `<div>` in player UI for cross-browser styling consistency

## 0.6.3

### Patch Changes

- fc26072: - Fix browser-default button styling (rounded corners on hover) in settings panel, context menu, and settings sub-panel
  - Fix stats panel copy/close button vertical alignment
  - Docs: remove framework version numbers (React 19/Vue 3 → React/Vue)

## 0.6.2

### Patch Changes

- 3c93e52: - IIFE (`<script>`) global build now exposes the `SweetPlayer` class directly, so it can be used as `new SweetPlayer(...)` instead of `new SweetPlayer.default(...)`
  - Docs: add live demo link (player.sweetui.com) to package READMEs

## 0.6.1

### Patch Changes

- 8e87ae2: Fix two mobile playback issues:
  - Controls no longer auto-hide (taking the open menu with them) while a popup/settings menu is open; auto-hide resumes once the menu closes
  - Loading spinner no longer sticks during playback on iOS native HLS, which spuriously fires stalled/waiting without a paired playing/canplay — timeupdate now clears it

## 0.6.0

### Minor Changes

- 2586479: Screenshot: capture the current video frame from the context menu or `screenshot()` — copies to clipboard (PNG) when supported, otherwise downloads a webp

## 0.5.0

### Minor Changes

- 1897cac: Settings panel: toggle row for PiP, slider row type, addSettingsRow API for plugin UI integration

## 0.4.0

### Minor Changes

- b94dd9c: Unified settings panel with toggle support for PiP

## 0.3.0

### Minor Changes

- 541ea71: - Custom right-click context menu (native menu disabled): "Changelog vX.Y.Z" (opens npm page), "Video info" (stats overlay), "Shortcuts" (keyboard shortcuts panel). Removed the title 10-click stats trigger.
  - New `hiddenControls` option: collect UI features to hide (`prev`/`next`/`rate`/`ratio`/`audioTrack`/`pip`/`contextMenu`/...), all shown by default. UI-only — API and keyboard shortcuts unaffected.
  - Added `VERSION` export and `SweetPlayer.version`.
  - Debug logging: records events (HLS lifecycle, buffering, seeks, quality switches, errors) since page refresh. "Copy log" button in the video info panel for user feedback/bug reports.

## 0.2.1

### Patch Changes

- a98f4d6: Add README documentation for each package.

## 0.2.0

### Minor Changes

- a322bda: Initial release: HLS video player with full UI controls, keyboard shortcuts, touch gestures, i18n, plugin mechanism, and preference persistence.
