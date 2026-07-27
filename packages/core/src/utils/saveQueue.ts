import { log } from '../logger';

/**
 * 节流写入队列：把高频状态变更合并成低频写入。
 *
 * - 快照合并：每次 push 只更新待写值，拖动音量条期间的中间值不会各发一次；
 * - 单飞：上一次写入未完成时不发新请求，完成后若有新值再补发，避免慢网络下请求堆积/乱序；
 * - 失败静默：持久化失败只记日志，不打断播放。
 */
export function createSaveQueue<T>(
  write: (value: T) => void | Promise<void>,
  wait: number,
  label: string,
): { push(value: T): void; flush(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let hasPending = false;
  let inFlight = false;

  const send = (): void => {
    if (!hasPending || inFlight) return;
    const snapshot = pending as T;
    pending = null;
    hasPending = false;
    inFlight = true;

    const done = (err?: unknown): void => {
      if (err !== undefined) log('持久化', `${label} 写入失败: ${String(err)}`);
      inFlight = false;
      if (hasPending) send(); // 写入期间又有新值
    };

    try {
      const result = write(snapshot);
      // 同步 adapter（localStorage）必须同步完成，否则 destroy 时 flush() 来不及落盘
      if (result instanceof Promise) result.then(() => done()).catch(done);
      else done();
    } catch (err) {
      done(err);
    }
  };

  return {
    push(value) {
      // 对象类型做浅合并，标量直接覆盖
      pending =
        value !== null && typeof value === 'object' && pending !== null && typeof pending === 'object'
          ? { ...pending, ...value }
          : value;
      hasPending = true;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        send();
      }, wait);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      send();
    },
  };
}
