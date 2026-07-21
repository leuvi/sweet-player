---
'@sweet-player/core': minor
---

**新增循环播放（loop）**——设置面板新增"循环播放"toggle 行。

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
