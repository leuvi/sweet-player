# @sweet-player/core

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
