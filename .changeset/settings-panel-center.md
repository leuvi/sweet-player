---
'@sweet-player/core': patch
---

**修复设置面板位置**：`.sp-settings-panel` 改为 `left: 50%; transform: translateX(-50%)` 相对设置按钮居中，替代之前 `right: 0` 依赖按钮位置的写法。1.1.0 加入网页全屏按钮后齿轮向左偏移两格，面板跟着左移显得别扭；改为居中后不依赖右侧按钮数量，无论 `hiddenControls` 隐藏几个按钮都对齐。
