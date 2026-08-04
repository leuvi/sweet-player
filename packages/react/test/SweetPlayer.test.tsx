import { act, createElement, createRef, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SweetPlayer as CorePlayer } from '@sweet-player/core';
import { SweetPlayer } from '../src/SweetPlayer';

let host: HTMLDivElement;
let root: Root | null;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host.remove();
  vi.restoreAllMocks();
});

describe('SweetPlayer React wrapper', () => {
  it('exposes the player before parent layout effects run', async () => {
    const playerRef = createRef<CorePlayer | null>();
    let availableInLayout = false;

    function Parent() {
      useLayoutEffect(() => {
        availableInLayout = playerRef.current !== null;
      }, []);
      return createElement(SweetPlayer, { ref: playerRef, src: '/video.mp4' });
    }

    await act(async () => root?.render(createElement(Parent)));

    expect(availableInLayout).toBe(true);
    expect(playerRef.current).toBeInstanceOf(CorePlayer);
  });

  it('switches navigation and progress callbacks between remote and local modes', async () => {
    let player: CorePlayer | null = null;
    const onNext = vi.fn();
    const onSaveProgress = vi.fn();
    const render = (withCallbacks: boolean) =>
      createElement(SweetPlayer, {
        src: '/video.mp4',
        id: 'episode',
        onReady: (value) => {
          player = value;
        },
        ...(withCallbacks ? { onNext, onSaveProgress } : {}),
      });

    await act(async () => root?.render(render(false)));
    const video = (player as CorePlayer | null)?.video;
    expect(video).toBeDefined();
    Object.defineProperty(video!, 'duration', { configurable: true, value: 100 });
    const nextButton = host.querySelectorAll<HTMLElement>('.sp-controls > [role="button"]')[4];

    await act(async () => root?.render(render(true)));
    expect(nextButton.classList.contains('sp-disabled')).toBe(false);
    nextButton.click();
    video!.currentTime = 12;
    video!.dispatchEvent(new Event('pause'));
    expect(onNext).toHaveBeenCalledOnce();
    expect(onSaveProgress).toHaveBeenLastCalledWith('episode', 12);
    expect(sessionStorage.getItem('sweet-player:progress')).toBeNull();

    await act(async () => root?.render(render(false)));
    expect(nextButton.classList.contains('sp-disabled')).toBe(true);
    video!.currentTime = 22;
    video!.dispatchEvent(new Event('pause'));
    const progress = JSON.parse(sessionStorage.getItem('sweet-player:progress') ?? '{}') as Record<
      string,
      { t: number }
    >;
    expect(progress.episode?.t).toBe(22);
  });
});
