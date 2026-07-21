---
'@sweet-player/core': patch
---

**清理控制栏按钮的浏览器默认焦点框**：`.sp-btn` 现在只有 `hover` 会变化背景/透明度，`focus` / `focus-visible` 均无描边。之前用鼠标点或键盘触发按钮后，会残留一圈浏览器默认焦点框，与图标本身的矩形轮廓叠加视觉杂乱。播放器的核心键盘操作走快捷键（Space / F / W / M / 方向键），按钮焦点环存在感低、审美负担高——与 YouTube / Bilibili 等主流播放器一致。
