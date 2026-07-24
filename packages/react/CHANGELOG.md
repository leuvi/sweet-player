# @sweet-player/react

## 1.2.2

### Patch Changes

- Updated dependencies [3945ab6]
  - @sweet-player/core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [32d4f14]
- Updated dependencies [f3eb488]
  - @sweet-player/core@1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies [80ae428]
  - @sweet-player/core@1.2.0

## 1.1.2

### Patch Changes

- Updated dependencies [a5e52e7]
- Updated dependencies [7dafdda]
  - @sweet-player/core@1.1.2

## 1.1.1

### Patch Changes

- Updated dependencies [7578043]
  - @sweet-player/core@1.1.1

## 1.1.0

### Patch Changes

- Updated dependencies [aa6b526]
  - @sweet-player/core@1.1.0

## 1.0.1

### Patch Changes

- dec66b4: 修复 1.0 review 发现的一批问题：

  **core**

  - DASH 致命错误现在会触发错误蒙层（此前只对 `hls-*` 事件生效）。
  - 画质切换时保留播放进度——`media.load` 是异步挂引擎的，改为在 `loadedmetadata` 后再恢复 `currentTime` 与播放状态，并校验 `currentSrc` 避免与后续 `load` 竞态。
  - `ProgressBar.destroy()` 现在解绑 pointer 事件监听器；`Controls.destroy()` 补齐 `progress.destroy()` 调用，修复销毁后闭包持有 `video` 的内存泄漏。
  - 缩略图 VTT `parseThumbnailVtt` 的 resolve 回调加入 `destroyed` 判断，销毁后不再对已移除 DOM 操作或触发 `new Image()` 预加载。
  - `player.use()` 返回的卸载函数现在幂等，且会从内部清理列表中移除自身，避免手动 dispose 后 `destroy()` 再次调用带来的副作用。
  - `hlsEngine.destroy()` 加 try/catch，与 dashEngine 保持一致，异常态下不再中断上层清理。
  - `contextMenu.addItem` 的 `index` 参数增加 `>= 0` 校验，负数不再被误解为"追加到末尾之外"。
  - VTT 解析：`parseTimestamp` 对异常时间戳返回 `NaN` 并整条 cue 跳过；改用 `lastIndexOf('#')` 处理含 fragment 的缩略图 URL；换行归一化支持单独 `\r`。
  - `EngineErrorPayload.type` 收窄为联合类型 `EngineErrorType`，switch 语句可获得穷尽性检查。
  - **HLS 网络错误自动恢复**：hls.js `NETWORK_ERROR` 先尝试最多 2 次 `startLoad()` 重试，分片成功加载后计数重置；超限后再显示错误蒙层。此前一次网络抖动就直接卡在错误态。
  - **DASH 未知致命错误兜底**：dashEngine `ERROR` 事件对 `capability` / `mediasource` 及其它未知致命错误统一走 `dash-fatal`，避免"卡住但无 error 事件"。
  - **原生 HLS 降级缓存**：Safari 上首次探测到只能走原生 HLS 后缓存，`reload()` 不再重复动态 import `hls.js`。
  - `tapFlash` 补 `destroy()`；`SweetPlayer.destroy()` 调用之，接口与其它 UI 组件一致。
  - `progressBar`：`pointerup` 时显式 `releasePointerCapture`；`pointermove` 缓存 `getBoundingClientRect` 结果，仅在 `pointerdown` / `resize` / `scroll` 时刷新，避免每次移动触发强制回流；缩略图 `parseThumbnailVtt` 支持 `AbortSignal`，销毁时 `abort()` 取消进行中的 fetch。
  - `parseThumbnailVtt(url, signal?)` 新增可选 `AbortSignal` 参数。
  - 截图下载 `URL.revokeObjectURL` 延时从 1s 延长到 10s，避免部分浏览器/下载器在 1s 内未完成访问导致 blob 已 revoke。
  - **依赖变更（Breaking-ish for ESM/CJS 消费者）**：`hls.js` / `dashjs` 从 `dependencies` 改为 optional `peerDependencies`。若消费者只用其中一种协议，可只安装对应的库；CDN IIFE 构建仍内联两者，无影响。老项目升级时如未安装对应包会在运行时按需 import 失败，直接 `pnpm add hls.js` 或 `pnpm add dashjs` 即可。
  - 导出 `HeatmapPoint` 类型。

  **react**

  - `SweetPlayer` 改用 `forwardRef` + `useImperativeHandle`，兼容 `peerDependencies` 声明的 `react >= 18`（此前用的 React 19 `ref as prop` 写法在 18 中拿不到实例）。

  **vue**

  - 补齐 props：`dashConfig`、`poster`、`thumbnails`、`heatmap`。
  - 补齐 `audioTracks` 的 watch。
  - 桥接核心播放事件到 emits：`play`、`pause`、`ended`、`timeupdate`、`volumechange`、`ratechange`、`error`。

- Updated dependencies [dec66b4]
  - @sweet-player/core@1.0.1

## 1.0.0

### Major Changes

- 160c645: **1.0.0 — first stable release.**

  MPEG-DASH support. `.mpd` sources are played through `dashjs` (loaded on demand), while `.m3u8` sources continue to use `hls.js`. Everything else plays through the native `<video>`. Only the engine you actually use is downloaded.

  New option: `dashConfig` — passed through to dashjs `updateSettings`, mirroring the existing `hlsConfig`.

  The engine layer is now pluggable internally, so quality / audio-track / bandwidth reporting works identically across HLS and DASH.

### Patch Changes

- Updated dependencies [160c645]
  - @sweet-player/core@1.0.0

## 0.10.5

### Patch Changes

- Updated dependencies [ef10842]
  - @sweet-player/core@0.10.5

## 0.10.4

### Patch Changes

- Updated dependencies [21c4271]
  - @sweet-player/core@0.10.4

## 0.10.3

### Patch Changes

- Updated dependencies [08070a7]
  - @sweet-player/core@0.10.3

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
