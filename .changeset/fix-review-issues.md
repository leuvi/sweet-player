---
'@sweet-player/core': patch
'@sweet-player/react': patch
'@sweet-player/vue': patch
---

修复外部 review 发现的 6 个问题：

- **core: Safari 原生 HLS fallback**：`import('hls.js')` 失败时不再阻断原生 HLS 检测，先检测 `canPlayType` 再尝试 import
- **core: 插件销毁跳过一半**：`destroy()` 中 `forEach` + `splice` 导致每隔一个插件被跳过，改为复制数组遍历
- **core: 换源后菜单残留**：`load()` 现在清空 engine-managed 画质/音轨菜单，避免旧数据点击无效
- **core: 新增 `setId(id)`**：切换视频 ID 时保存旧进度、解绑旧事件、重新绑定，修复换集写入旧 ID
- **react: ref 始终 null**：`useImperativeHandle` 的 deps 从 `[]` 改为无 deps（每次 render 刷新），修复 ref 不可用
- **react: watch `id` prop**：`id` 变化时调用 `player.setId(id)`
- **vue: 补全缺失 props**：新增 `loop`、`shareUrl`、`onSavePrefs`、`onSaveProgress`
- **vue: watch `id` prop**：`id` 变化时调用 `player.setId(id)`
