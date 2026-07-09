---
'@sweet-player/core': patch
'@sweet-player/react': patch
'@sweet-player/vue': patch
---

Fix two mobile playback issues:
- Controls no longer auto-hide (taking the open menu with them) while a popup/settings menu is open; auto-hide resumes once the menu closes
- Loading spinner no longer sticks during playback on iOS native HLS, which spuriously fires stalled/waiting without a paired playing/canplay — timeupdate now clears it
