---
'@sweet-player/core': patch
---

**控制栏按钮改为 hover-only 交互**：移除 1.1.1 里加的 `.sp-btn:focus-visible` accent 焦点环。之前用鼠标点或键盘触发按钮时会残留一圈粉色描边，与图标本身矩形叠加视觉杂乱。播放器的键盘操作走快捷键（Space / F / W / M / 方向键），按钮焦点环存在感低——与 YouTube / Bilibili 等主流播放器一致。
