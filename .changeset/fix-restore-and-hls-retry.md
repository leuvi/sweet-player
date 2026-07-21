---
'@sweet-player/core': patch
---

**修复异步 seek 恢复与监听泄漏**

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
