---
'@sweet-player/core': major
'@sweet-player/react': major
'@sweet-player/vue': major
---

**1.0.0 — first stable release.**

MPEG-DASH support. `.mpd` sources are played through `dashjs` (loaded on demand), while `.m3u8` sources continue to use `hls.js`. Everything else plays through the native `<video>`. Only the engine you actually use is downloaded.

New option: `dashConfig` — passed through to dashjs `updateSettings`, mirroring the existing `hlsConfig`.

The engine layer is now pluggable internally, so quality / audio-track / bandwidth reporting works identically across HLS and DASH.
