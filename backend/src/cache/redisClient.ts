import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!config.redisUrl) return null;

  if (!client) {
    client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error({ err }, 'Redis error'));
  }

  return client;
}
