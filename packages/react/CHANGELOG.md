# @sweet-player/react

## 0.10.2

### Patch Changes

- Updated dependencies [3fb5024]
  - @sweet-player/core@0.10.2

## 0.10.1

### Patch Changes

- Updated dependencies [d1942a5]
  - @sweet-player/core@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [3a24ff3]
  - @sweet-player/core@0.10.0

## 0.9.0

### Patch Changes

- Updated dependencies [6dc8c1a]
  - @sweet-player/core@0.9.0

## 0.8.1

### Patch Changes

- Updated dependencies [33f80bc]
  - @sweet-player/core@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies [8116032]
  - @sweet-player/core@0.8.0

## 0.7.3

### Patch Changes

- Updated dependencies [fd155fb]
  - @sweet-player/core@0.7.3

## 0.7.2

### Patch Changes

- Updated dependencies [965bb72]
  - @sweet-player/core@0.7.2

## 0.7.1

### Patch Changes

- 3e625c1: Add English README as default, restructure docs for better user onboarding
- Updated dependencies [3e625c1]
  - @sweet-player/core@0.7.1

## 0.7.0

### Minor Changes

- 8031351: Add `addContextMenuItem` API for plugins to dynamically register right-click menu items

### Patch Changes

- Updated dependencies [8031351]
  - @sweet-player/core@0.7.0

## 0.6.4

### Patch Changes

- 5b05939: Replace all `<button>` elements with `<div>` in player UI for cross-browser styling consistency
- Updated dependencies [5b05939]
  - @sweet-player/core@0.6.4

## 0.6.3

### Patch Changes

- fc26072: - Fix browser-default button styling (rounded corners on hover) in settings panel, context menu, and settings sub-panel
  - Fix stats panel copy/close button vertical alignment
  - Docs: remove framework version numbers (React 19/Vue 3 → React/Vue)
- Updated dependencies [fc26072]
  - @sweet-player/core@0.6.3

## 0.6.2

### Patch Changes

- 3c93e52: - IIFE (`<script>`) global build now exposes the `SweetPlayer` class directly, so it can be used as `new SweetPlayer(...)` instead of `new SweetPlayer.default(...)`
  - Docs: add live demo link (player.sweetui.com) to package READMEs
- Updated dependencies [3c93e52]
  - @sweet-player/core@0.6.2

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
