---
'@sweet-player/core': minor
'@sweet-player/react': minor
'@sweet-player/vue': minor
---

修复第二轮 review 发现的问题，并让 HLS/DASH 引擎开箱即用：

**React ref 首次挂载即可用**
- 去掉 `useImperativeHandle`（其 factory 执行早于 player 创建，且 effect 赋值不触发 render）
- 在浏览器 layout effect 中创建 player 并维护 forwarded ref，父组件的 layout effect 可直接读取实例

**setId 换集修复**
- `progressCleanup` 现在移除 `loadedmetadata` restore listener，避免旧 ID 进度恢复到新视频
- React/Vue 的 `id` 更新先于 `src` 执行：先保存旧进度再换源，防止进度丢失
- `setId` 签名扩展为 `setId(id: string | null)`，传 `null` 解除进度记忆

**运行时回调不再用旧闭包**
- core 新增 `setCallbacks()`，导航按钮和持久化写入目标可在运行时切换
- React：稳定代理函数转发到最新 props，新增、替换或移除 `onNext`/`onPrev`/`onSavePrefs` 等回调都会生效
- Vue：动态同步 `onSavePrefs`/`onSaveProgress`，未监听 `prev`/`next` 时对应按钮保持禁用

**HLS/DASH 引擎开箱即用**
- `hls.js` / `dashjs` 从 optional peer 改为常规 peer（npm 7+ 安装 core 时自动安装），Chrome/Firefox HLS 与 DASH 播放不再因缺依赖失败
