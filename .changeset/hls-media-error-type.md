---
'@sweet-player/core': patch
---

修复 typecheck：hlsEngine 上报的 `'hls-media'` 类型未在 `EngineErrorType` 联合中声明，导致 1.2.0 里 `tsc --noEmit` 失败。运行时无影响（`showErrorStateUi` 用 `startsWith('hls-')` 匹配所有 hls 错误），仅补齐类型。
