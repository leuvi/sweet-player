# @sweet-player/vue

## 0.6.1

### Patch Changes

- 8e87ae2: Fix two mobile playback issues:
  - Controls no longer auto-hide (taking the open menu with them) while a popup/settings menu is open; auto-hide resumes once the menu closes
  - Loading spinner no longer sticks during playback on iOS native HLS, which spuriously fires stalled/waiting without a paired playing/canplay — timeupdate now clears it
- Updated dependencies [8e87ae2]
  - @sweet-player/core@0.6.1

## 0.6.0

### Minor Changes

- 2586479: Screenshot: capture the current video frame from the context menu or `screenshot()` — copies to clipboard (PNG) when supported, otherwise downloads a webp

### Patch Changes

- Updated dependencies [2586479]
  - @sweet-player/core@0.6.0

## 0.5.0

### Minor Changes

- 1897cac: Settings panel: toggle row for PiP, slider row type, addSettingsRow API for plugin UI integration

### Patch Changes

- Updated dependencies [1897cac]
  - @sweet-player/core@0.5.0

## 0.4.0

### Minor Changes

- b94dd9c: Unified settings panel with toggle support for PiP

### Patch Changes

- Updated dependencies [b94dd9c]
  - @sweet-player/core@0.4.0

## 0.3.0

### Minor Changes

- 541ea71: - Custom right-click context menu (native menu disabled): "Changelog vX.Y.Z" (opens npm page), "Video info" (stats overlay), "Shortcuts" (keyboard shortcuts panel). Removed the title 10-click stats trigger.
  - New `hiddenControls` option: collect UI features to hide (`prev`/`next`/`rate`/`ratio`/`audioTrack`/`pip`/`contextMenu`/...), all shown by default. UI-only — API and keyboard shortcuts unaffected.
  - Added `VERSION` export and `SweetPlayer.version`.
  - Debug logging: records events (HLS lifecycle, buffering, seeks, quality switches, errors) since page refresh. "Copy log" button in the video info panel for user feedback/bug reports.

### Patch Changes

- Updated dependencies [541ea71]
  - @sweet-player/core@0.3.0

## 0.2.1

### Patch Changes

- a98f4d6: Add README documentation for each package.
- Updated dependencies [a98f4d6]
  - @sweet-player/core@0.2.1

## 0.2.0

### Minor Changes

- a322bda: Initial release: HLS video player with full UI controls, keyboard shortcuts, touch gestures, i18n, plugin mechanism, and preference persistence.

### Patch Changes

- Updated dependencies [a322bda]
  - @sweet-player/core@0.2.0
