interface FsDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface FsElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export function isFullscreen(el: HTMLElement): boolean {
  const doc = document as FsDocument;
  const current = doc.fullscreenElement ?? doc.webkitFullscreenElement;
  return current === el;
}

export async function toggleFullscreen(el: HTMLElement): Promise<void> {
  const doc = document as FsDocument;
  const fsEl = el as FsElement;
  if (isFullscreen(el)) {
    await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
  } else {
    await (fsEl.requestFullscreen?.() ?? fsEl.webkitRequestFullscreen?.());
  }
}

export function onFullscreenChange(el: HTMLElement, cb: (fs: boolean) => void): () => void {
  const handler = () => cb(isFullscreen(el));
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
