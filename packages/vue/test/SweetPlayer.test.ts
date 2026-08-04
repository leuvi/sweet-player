import { createApp, h, nextTick, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SweetPlayer as CorePlayer } from '@sweet-player/core';
import { SweetPlayer } from '../src/SweetPlayer';

let host: HTMLDivElement;
let app: App<Element> | null;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  app?.unmount();
  app = null;
  host.remove();
  vi.restoreAllMocks();
});

describe('SweetPlayer Vue wrapper', () => {
  it('disables navigation when no event listener is registered', async () => {
    app = createApp({ render: () => h(SweetPlayer, { src: '/video.mp4' }) });
    app.mount(host);
    await nextTick();

    const buttons = host.querySelectorAll<HTMLElement>('.sp-controls > [role="button"]');
    expect(buttons[0].classList.contains('sp-disabled')).toBe(true);
    expect(buttons[4].classList.contains('sp-disabled')).toBe(true);
  });

  it('enables navigation when a listener is registered', async () => {
    const onNext = vi.fn();
    app = createApp({ render: () => h(SweetPlayer, { src: '/video.mp4', onNext }) });
    app.mount(host);
    await nextTick();

    const nextButton = host.querySelectorAll<HTMLElement>('.sp-controls > [role="button"]')[4];
    expect(nextButton.classList.contains('sp-disabled')).toBe(false);
    nextButton.click();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('updates navigation when a listener is added or removed', async () => {
    const listenerEnabled = ref(false);
    const onNext = vi.fn();
    app = createApp({
      render: () =>
        h(SweetPlayer, {
          src: '/video.mp4',
          ...(listenerEnabled.value ? { onNext } : {}),
        }),
    });
    app.mount(host);
    await nextTick();

    const nextButton = host.querySelectorAll<HTMLElement>('.sp-controls > [role="button"]')[4];
    expect(nextButton.classList.contains('sp-disabled')).toBe(true);

    listenerEnabled.value = true;
    await nextTick();
    expect(nextButton.classList.contains('sp-disabled')).toBe(false);
    nextButton.click();
    expect(onNext).toHaveBeenCalledOnce();

    listenerEnabled.value = false;
    await nextTick();
    expect(nextButton.classList.contains('sp-disabled')).toBe(true);
  });

  it('switches progress callbacks between remote and local modes', async () => {
    const remoteEnabled = ref(false);
    const onSaveProgress = vi.fn();
    let player: CorePlayer | null = null;
    app = createApp({
      render: () =>
        h(SweetPlayer, {
          src: '/video.mp4',
          id: 'episode',
          onReady: (value: CorePlayer) => {
            player = value;
          },
          ...(remoteEnabled.value ? { onSaveProgress } : {}),
        }),
    });
    app.mount(host);
    await nextTick();

    const video = (player as CorePlayer | null)?.video;
    expect(video).toBeDefined();
    Object.defineProperty(video!, 'duration', { configurable: true, value: 100 });
    remoteEnabled.value = true;
    await nextTick();
    video!.currentTime = 14;
    video!.dispatchEvent(new Event('pause'));
    expect(onSaveProgress).toHaveBeenLastCalledWith('episode', 14);
    expect(sessionStorage.getItem('sweet-player:progress')).toBeNull();

    remoteEnabled.value = false;
    await nextTick();
    video!.currentTime = 24;
    video!.dispatchEvent(new Event('pause'));
    const progress = JSON.parse(sessionStorage.getItem('sweet-player:progress') ?? '{}') as Record<
      string,
      { t: number }
    >;
    expect(progress.episode?.t).toBe(24);
  });
});
