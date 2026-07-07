import type { PlayerEventMap } from '../types';

type Listener<K extends keyof PlayerEventMap> = (payload: PlayerEventMap[K]) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<(payload: never) => void>>();

  on<K extends keyof PlayerEventMap>(event: K, fn: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as (payload: never) => void);
    return () => this.off(event, fn);
  }

  off<K extends keyof PlayerEventMap>(event: K, fn: Listener<K>): void {
    this.listeners.get(event)?.delete(fn as (payload: never) => void);
  }

  emit<K extends keyof PlayerEventMap>(event: K, payload: PlayerEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as Listener<K>)(payload));
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
