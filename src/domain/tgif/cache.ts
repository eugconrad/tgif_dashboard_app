export interface CacheEnvelope<T> {
  value: T;
  savedAt: number;
}

export class LocalCache {
  constructor(private readonly prefix = 'tgif-monitor') {}

  get<T>(key: string, maxAgeMs: number): T | null {
    if (!hasLocalStorage()) return null;
    const raw = localStorage.getItem(this.key(key));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (!parsed || typeof parsed.savedAt !== 'number') return null;
      if (Date.now() - parsed.savedAt > maxAgeMs) return null;
      return parsed.value;
    } catch {
      return null;
    }
  }

  getEvenIfStale<T>(key: string): T | null {
    if (!hasLocalStorage()) return null;
    const raw = localStorage.getItem(this.key(key));
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as CacheEnvelope<T>).value;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T) {
    if (!hasLocalStorage()) return;
    const envelope: CacheEnvelope<T> = { value, savedAt: Date.now() };
    localStorage.setItem(this.key(key), JSON.stringify(envelope));
  }

  remove(key: string) {
    if (!hasLocalStorage()) return;
    localStorage.removeItem(this.key(key));
  }

  private key(key: string) {
    return `${this.prefix}:${key}`;
  }
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
