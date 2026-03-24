import type { CacheProvider, CachedAnalysis } from './cacheProvider';
import { getRedisClient } from './redisClient';

export class RedisCache implements CacheProvider {
  private get client() {
    return getRedisClient()!;
  }

  async get(key: string): Promise<CachedAnalysis | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as CachedAnalysis;
  }

  async set(key: string, data: CachedAnalysis): Promise<void> {
    // Analysis for completed fixtures never changes — store indefinitely
    await this.client.set(key, JSON.stringify(data));
  }
}
