/** 截图：抓取 video 当前帧，优先写入剪贴板，失败则下载 webp。 */

export type ScreenshotResult = 'clipboard' | 'download';

/** 把当前帧画到离屏 canvas；video 未就绪或无 2d 上下文时抛错。 */
function drawFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error('video not ready');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  // 跨域视频未带 crossOrigin 时，canvas 会被污染，后续 toBlob 抛 SecurityError。
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))), type, quality);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 部分浏览器/下载器要在 10 秒内继续访问 blob url，延长到 10s 更稳
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 抓取当前帧并输出。
 * - 剪贴板图片各浏览器仅通用支持 png，故复制走 png；
 * - 下载走 webp（体积更小）。
 * canvas 被跨域污染时会抛错，由调用方提示失败。
 */
export async function captureScreenshot(video: HTMLVideoElement, filename: string): Promise<ScreenshotResult> {
  const canvas = drawFrame(video);

  // 1) 优先复制到剪贴板
  const Clip = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (navigator.clipboard?.write && Clip) {
    try {
      // 传入 Promise<Blob> 让编码在 write 调用内完成，保留用户手势激活态。
      await navigator.clipboard.write([new Clip({ 'image/png': toBlob(canvas, 'image/png') })]);
      return 'clipboard';
    } catch {
      // 无权限 / 不支持 / canvas 污染 → 回退下载
    }
  }

  // 2) 回退：下载 webp（若 canvas 污染，这里抛错交由调用方处理）
  downloadBlob(await toBlob(canvas, 'image/webp', 0.92), filename);
  return 'download';
}
