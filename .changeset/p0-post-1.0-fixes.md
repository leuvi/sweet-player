---
'@sweet-player/core': patch
'@sweet-player/react': patch
'@sweet-player/vue': patch
---

修复 1.0 review 发现的一批问题：

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
