# @sweet-player/core

## 1.2.2

### Patch Changes

- 3945ab6: **修复设置面板位置**：`.sp-settings-panel` 改为 `left: 50%; transform: translateX(-50%)` 相对设置按钮居中，替代之前 `right: 0` 依赖按钮位置的写法。1.1.0 加入网页全屏按钮后齿轮向左偏移两格，面板跟着左移显得别扭；改为居中后不依赖右侧按钮数量，无论 `hiddenControls` 隐藏几个按钮都对齐。

## 1.2.1

### Patch Changes

- 32d4f14: **修复异步 seek 恢复与监听泄漏**

  - 新增 `reloadAndRestore(time, paused, src?)` 内部 helper，统一封装 reload/load 后等待 `loadedmetadata` 再恢复进度的逻辑
  - `showErrorStateUi`：此前 `media.reload()` 后同步 `currentTime = time` 在媒体未 ready 时被忽略，改为等 `loadedmetadata` 后恢复
  - `handleQualitySelect`：此前 `loadedmetadata` listener 在 load 失败或 destroy 时悬挂泄漏，改用 `AbortController` 管理，连点切换与 destroy 时 abort
  - `destroy()` 新增 `restoreAbort.abort()` 清理

  **修复 HLS `MEDIA_ERROR` 无限重试**

  - 此前 `recoverMediaError()` 无重试上限、失败后不上报错误
  - 新增 `mediaRetries` 计数器与 `MEDIA_RETRY_LIMIT`（2 次），超限后上报 `hls-media` 错误触发错误蒙层
  - `FRAG_LOADED` 同时重置 `networkRetries` 与 `mediaRetries`

  **修复 `enterWebFullscreen` 与浏览器全屏退出的竞态**

  - `enterWebFullscreen` / `toggleWebFullscreen` 改为 `async`，在已浏览器全屏时 `await` 退出完成后再进入网页全屏，避免 CSS 过渡闪烁

- f3eb488: 修复 typecheck：hlsEngine 上报的 `'hls-media'` 类型未在 `EngineErrorType` 联合中声明，导致 1.2.0 里 `tsc --noEmit` 失败。运行时无影响（`showErrorStateUi` 用 `startsWith('hls-')` 匹配所有 hls 错误），仅补齐类型。

## 1.2.0

### Minor Changes

- 80ae428: **新增循环播放（loop）**——设置面板新增"循环播放"toggle 行。

  **API：**

  - `player.setLoop(loop: boolean)`
  - `player.loop` (getter)
  - 新事件：`loopchange: boolean`
  - 新选项：`loop?: boolean` — 初始状态，默认 `false`
  - `ControlName` 新增 `'loop'`，业务可通过 `hiddenControls: ['loop']` 关闭

  **行为：**

  - 状态持久化到 `localStorage`（与 volume / rate 一致），下次打开自动恢复
  - 切换时中央 OSD 显示 `循环播放 ✓ / ✕`

  **注意：** `video.loop = true` 时浏览器**不会**触发 `ended` 事件，因此 `autoNext` 与依赖 `ended` 的插件（如需在播完时清屏、结算等）均不激活。README 已注明。

  i18n：中英文均加入 `loop`。

## 1.1.2

### Patch Changes

- a5e52e7: **控制栏按钮改为 hover-only 交互**：移除 1.1.1 里加的 `.sp-btn:focus-visible` accent 焦点环。之前用鼠标点或键盘触发按钮时会残留一圈粉色描边，与图标本身矩形叠加视觉杂乱。播放器的键盘操作走快捷键（Space / F / W / M / 方向键），按钮焦点环存在感低——与 YouTube / Bilibili 等主流播放器一致。
- 7dafdda: **清理控制栏按钮的浏览器默认焦点框**：`.sp-btn` 现在只有 `hover` 会变化背景/透明度，`focus` / `focus-visible` 均无描边。之前用鼠标点或键盘触发按钮后，会残留一圈浏览器默认焦点框，与图标本身的矩形轮廓叠加视觉杂乱。播放器的核心键盘操作走快捷键（Space / F / W / M / 方向键），按钮焦点环存在感低、审美负担高——与 YouTube / Bilibili 等主流播放器一致。

## 1.1.1

### Patch Changes

- 7578043: **修复控制栏按钮鼠标点击后残留的丑焦点框**：`.sp-btn` 默认清除 `outline`，只在键盘导航（`:focus-visible`）时显示 2px accent 色内描边环。之前用鼠标点网页全屏按钮后会残留一圈浏览器默认焦点框，与图标本身的矩形轮廓叠加视觉杂乱。改动保留键盘无障碍焦点提示。

## 1.1.0

### Minor Changes

- aa6b526: **新增网页全屏（Web Fullscreen）**——纯 CSS 撑满浏览器视口，不依赖 Fullscreen API，特别适合被 iframe 嵌入且父页未声明 `allow="fullscreen"` 的场景（微信公众号、Notion、语雀等富文本编辑器）。

  **API：**

  - `player.toggleWebFullscreen()`
  - `player.enterWebFullscreen()` / `player.exitWebFullscreen()`
  - `player.isWebFullscreen` (getter)
  - 新事件：`webfullscreenchange: boolean`

  **UI：**

  - 控制栏底部右侧新增网页全屏按钮（位于浏览器全屏按钮左侧）
  - 快捷键：`W`
  - `ControlName` 新增 `'webFullscreen'`，业务可通过 `hiddenControls: ['webFullscreen']` 关闭

  **行为：**

  - 与浏览器全屏互斥：进入一个会自动退出另一个
  - `Escape` 退出（浏览器全屏的 Escape 由浏览器兜底，此监听仅在网页全屏激活时挂上）
  - `body` 加 `sp-web-fullscreen-lock` 锁定背后页面滚动，退出时移除
  - `destroy()` 前自动解除网页全屏，避免残留 body class / listener

  i18n：中英文均加入 `webFullscreen` / `scWebFullscreen`。

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

## 1.0.0

### Major Changes

- 160c645: **1.0.0 — first stable release.**

  MPEG-DASH support. `.mpd` sources are played through `dashjs` (loaded on demand), while `.m3u8` sources continue to use `hls.js`. Everything else plays through the native `<video>`. Only the engine you actually use is downloaded.

  New option: `dashConfig` — passed through to dashjs `updateSettings`, mirroring the existing `hlsConfig`.

  The engine layer is now pluggable internally, so quality / audio-track / bandwidth reporting works identically across HLS and DASH.

## 0.10.5

### Patch Changes

- ef10842: Move the time label to a fixed position above the hover caliper (no longer coupled to the thumbnail preview) and preload sprite images once the VTT track loads, so hovering the progress bar never shows a black tile while the image is still fetching.

## 0.10.4

### Patch Changes

- 21c4271: Fix the thumbnail preview's time label being clipped by the preview box's `overflow: hidden` when placed outside. The time pill is now positioned inside the preview at the bottom-center (matching common video sites).

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
