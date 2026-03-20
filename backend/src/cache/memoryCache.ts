import type { CacheProvider, CachedAnalysis } from './cacheProvider';

export class MemoryCache implements CacheProvider {
  private readonly store = new Map<string, CachedAnalysis>();

  async get(key: string): Promise<CachedAnalysis | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, data: CachedAnalysis): Promise<void> {
    this.store.set(key, data);
  }
}
