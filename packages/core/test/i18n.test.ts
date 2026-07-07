import { describe, expect, it } from 'vitest';
import { I18n, registerLocale } from '../src/i18n';

describe('I18n', () => {
  it('defaults to zh-CN', () => {
    const i18n = new I18n();
    expect(i18n.t('play')).toBe('播放');
  });

  it('supports en', () => {
    const i18n = new I18n('en');
    expect(i18n.t('play')).toBe('Play');
  });

  it('interpolates params', () => {
    const i18n = new I18n('zh-CN');
    expect(i18n.t('seekBack', { n: 15 })).toBe('快退 15 秒 (←)');
    expect(i18n.t('autoNextIn', { n: 3 })).toBe('3 秒后播放下一个');
  });

  it('applies overrides', () => {
    const i18n = new I18n('zh-CN', { play: '开播' });
    expect(i18n.t('play')).toBe('开播');
    expect(i18n.t('pause')).toBe('暂停');
  });

  it('falls back to zh-CN for unknown locale', () => {
    const i18n = new I18n('fr');
    expect(i18n.t('play')).toBe('播放');
  });

  it('supports registerLocale', () => {
    const en = new I18n('en');
    registerLocale('ja', {
      ...(Object.fromEntries(
        (
          [
            'play','pause','playPause','prev','next','seekBack','seekForward','speed','quality','qualityAuto',
            'aspectRatio','ratioOriginal','audioTrack','mute','fullscreen','pip','empty','closeStats','seconds',
            'volume','muted','replay','playNext','autoNextIn','cancel','loadError','retry',
          ] as const
        ).map((k) => [k, en.t(k)]),
      ) as Parameters<typeof registerLocale>[1]),
      play: '再生',
    });
    const ja = new I18n('ja');
    expect(ja.t('play')).toBe('再生');
  });
});
