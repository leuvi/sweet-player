---
'@sweet-player/core': minor
---

**新增网页全屏（Web Fullscreen）**——纯 CSS 撑满浏览器视口，不依赖 Fullscreen API，特别适合被 iframe 嵌入且父页未声明 `allow="fullscreen"` 的场景（微信公众号、Notion、语雀等富文本编辑器）。

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
