import { SweetPlayer } from '@sweet-player/core';

const player = new SweetPlayer({
  container: '#player',
  src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  title: 'Big Buck Bunny — HLS 测试流',
  id: 'big-buck-bunny',          // 断点续播
  volume: 80,
  seekStep: 10,
  longSeek: { steps: [10, 30, 60], stepUpInterval: 2000 },
  autoNext: 5,                   // 播完 5 秒倒计时自动下一个
  // 画质不传列表 → autoQuality 自动读取 hls levels（含"自动"档）
  onPrev: () => console.log('[playground] prev clicked'),
  onNext: () => console.log('[playground] next clicked'),
  onQualityChange: (q) => console.log('[playground] quality ->', q),
});

player.on('ready', () => console.log('[playground] ready'));
player.on('error', (e) => console.error('[playground] error', e));
player.on('pipchange', (on) => console.log('[playground] pip:', on));

// 方便控制台调试
(window as unknown as { player: SweetPlayer }).player = player;
