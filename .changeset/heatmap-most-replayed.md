---
'@sweet-player/core': minor
---

Add heatmap ("most replayed") curve above the progress bar. Pass `heatmap: [{ time, value }]` to render a YouTube-style SVG curve (bright top line + fill fading downward) that fades in on progress-bar hover, with the watched portion brighter. A toggle appears in the settings panel below Picture-in-Picture; add `'heatmap'` to `hiddenControls` to skip its initialization entirely. Zero extra dependencies.
