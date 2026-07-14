import { SweetPlayer, type SweetPlayerLike } from '@sweet-player/core';
import type { SweetPlayerPlugin } from '@sweet-player/core';
import { SweetSubtitle, decodeBuffer, type SubtitleSize, type SubtitleFormat } from 'sweet-subtitle';
import { SweetPlayerGif } from 'sweet-player-gif';

// 字幕插件工厂：持有 SweetSubtitle 实例，运行时换字幕无需重建播放器
function createSubtitlePlugin() {
  let sub: SweetSubtitle | null = null;
  let currentPlayer: SweetPlayerLike | null = null;
  const sizeMap: SubtitleSize[] = ['small', 'medium', 'large'];
  const STORAGE_KEY = 'sp-subtitle-size';

  // 从 localStorage 恢复上次选择的大小
  let currentSize: SubtitleSize = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && sizeMap.includes(saved as SubtitleSize) ? (saved as SubtitleSize) : 'medium';
    } catch {
      return 'medium';
    }
  })();

  let removeRow: (() => void) | null = null;
  const sizeIndex = (s: SubtitleSize) => sizeMap.indexOf(s);

  const plugin: SweetPlayerPlugin = {
    name: 'sweet-subtitle',
    apply(p) {
      currentPlayer = p;
      sub = new SweetSubtitle(p.video, { enableWasm: true, size: currentSize });
      sub.on('ready', () => console.log('[subtitle] ready'));
      sub.on('error', (err) => console.error('[subtitle] error', err));
      return () => {
        removeRow?.();
        removeRow = null;
        sub?.destroy();
        sub = null;
        currentPlayer = null;
      };
    },
  };

  // 加载字幕后注册设置行；卸载字幕时移除
  function showSettingsRow() {
    if (removeRow || !currentPlayer) return;
    removeRow = currentPlayer.addSettingsRow({
      key: 'subtitleSize',
      label: '字幕大小',
      currentValue: '',
      items: [],
      onSelect: () => {},
      slider: {
        min: 0,
        max: 2,
        step: 1,
        value: sizeIndex(currentSize),
        onChange: (v) => {
          currentSize = sizeMap[v] ?? 'medium';
          sub?.setSize(currentSize);
          try { localStorage.setItem(STORAGE_KEY, currentSize); } catch { /* ignore */ }
          console.log('[subtitle] size:', currentSize);
        },
      },
    });
  }

  function hideSettingsRow() {
    removeRow?.();
    removeRow = null;
  }

  return {
    plugin,
    loadFromText: (content: string, format?: SubtitleFormat) => sub?.loadFromText(content, format),
    loadFromUrl: (url: string) => sub?.loadFromUrl(url),
    show: () => { sub?.show(); showSettingsRow(); },
    hide: () => { sub?.hide(); hideSettingsRow(); },
    setSize: (size: SubtitleSize) => { currentSize = size; sub?.setSize(size); },
  };
}

function createGifPlugin(): SweetPlayerPlugin {
  return {
    name: 'sweet-player-gif',
    apply(p) {
      const gif = new SweetPlayerGif(p.video, { duration: 3, fps: 10, maxWidth: 480 });
      let started = false;

      const onPlay = p.on('play', () => {
        if (!started) { gif.start(); started = true; }
      });
      const onDestroy = p.on('destroy', () => {
        gif.destroy(); started = false;
      });

      const removeMenu = p.addContextMenuItem({
        label: '截取动画 (GIF)',
        async onClick() {
          if (!started) { gif.start(); started = true; }
          try {
            const blob = await gif.capture();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `capture-${Date.now()}.gif`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error('[gif] capture failed', err);
          }
        },
      }, 1);

      return () => {
        onPlay();
        onDestroy();
        removeMenu();
        gif.destroy();
        started = false;
      };
    },
  };
}

const subtitle = createSubtitlePlugin();

const player = new SweetPlayer({
  container: '#player',
  src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  title: 'Big Buck Bunny — HLS 测试流',
  id: 'big-buck-bunny',          // 断点续播
  volume: 80,
  seekStep: 10,
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  autoNext: 5,                   // 播完 5 秒倒计时自动下一个
  // 热度曲线（最多重播）：任意非负数，内部按最大值归一化
  heatmap: Array.from({ length: 60 }, (_, i) => ({
    time: i * 10,
    value: 0.3 + 0.7 * Math.abs(Math.sin(i / 4)) + 0.3 * Math.random(),
  })),
  plugins: [subtitle.plugin, createGifPlugin()],
  onPrev: () => console.log('[playground] prev clicked'),
  onNext: () => console.log('[playground] next clicked'),
  onQualityChange: (q) => console.log('[playground] quality ->', q),
});

player.on('ready', () => console.log('[playground] ready'));
player.on('error', (e) => console.error('[playground] error', e));
player.on('pipchange', (on) => console.log('[playground] pip:', on));

// 方便控制台调试
(window as unknown as { player: SweetPlayer }).player = player;

// 本地视频选择
let currentObjectUrl: string | null = null;
document.getElementById('fileInput')!.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  player.load(currentObjectUrl);
  player.setTitle(file.name);
  // 清理旧字幕
  subtitle.hide();
  (document.getElementById('subInput') as HTMLInputElement).value = '';
});

// 本地字幕选择（sweet-subtitle，支持 ASS/SSA/SRT/VTT，WASM 渲染艺术字体）
document.getElementById('subInput')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // decodeBuffer 自动检测编码（UTF-8/UTF-16/GBK）
  const buffer = await file.arrayBuffer();
  const content = decodeBuffer(buffer);

  await subtitle.loadFromText(content);
  subtitle.show();
  console.log('[playground] subtitle loaded:', file.name);
});
