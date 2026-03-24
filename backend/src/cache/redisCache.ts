import Redis from 'ioredis';
import type { CacheProvider, CachedAnalysis } from './cacheProvider';
import logger from '../utils/logger';

export class RedisCache implements CacheProvider {
  private readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => logger.info('Redis connected'));
    this.client.on('error', (err) => logger.error({ err }, 'Redis error'));
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
