---
'@sweet-player/core': minor
---

**新增：把偏好与播放进度存到自己的后端**，用于多端同步场景（`localStorage` 是分浏览器的，手机上的进度换电脑就没了）。

**新增选项：**

- `onSavePrefs(prefs)` — 保存音量 / 静音 / 倍速。传入后偏好不再写 `localStorage`
- `onSaveProgress(id, seconds)` — 保存播放进度。`seconds` 为 `null` 表示已看完（距结尾 <10 秒），业务方据此清除记录

**新增方法：**

- `player.restore(state)` — 套用 `{ volume?, muted?, rate?, time? }`。随时可调，媒体未就绪时会自动等到 `loadedmetadata` 再 seek

两个回调互相独立，只同步进度、偏好继续留本地也可以；不传则维持原有的 `localStorage` 行为，无需改动现有代码。

节流、写入时机、慢网络下的请求排队、失败静默都在库内处理：偏好变更防抖 800ms（拖动音量条只发一次请求），进度在播放中每 5 秒、暂停时、`destroy()` 时写入，同一时刻只有一个写请求在途。

**同时修复：**

- 暂停时不再遗漏进度保存。此前只有 5 秒定时和播放结束会存，暂停后直接关闭页面最多会丢 5 秒进度
- `savePrefs` 合并写入时过滤未知字段。1.2.3 之前存过的 `loop` 会被 `{ ...loadPrefs() }` 一直搬运，现在下一次写入即自动清除
