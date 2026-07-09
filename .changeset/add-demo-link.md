---
'@sweet-player/core': patch
'@sweet-player/react': patch
'@sweet-player/vue': patch
---

- IIFE (`<script>`) global build now exposes the `SweetPlayer` class directly, so it can be used as `new SweetPlayer(...)` instead of `new SweetPlayer.default(...)`
- Docs: add live demo link (player.sweetui.com) to package READMEs
