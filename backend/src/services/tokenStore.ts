import { getRedisClient } from '../cache/redisClient';
import logger from '../utils/logger';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface TokenRecord {
  familyId: string;
  used: boolean;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export async function storeRefreshToken(tokenId: string, familyId: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const record: TokenRecord = { familyId, used: false };
  const pipeline = client.pipeline();
  pipeline.set(`token:${tokenId}`, JSON.stringify(record), 'EX', REFRESH_TOKEN_TTL_SECONDS);
  // Track tokenId under its family for O(family size) revocation
  pipeline.sadd(`family:${familyId}`, tokenId);
  pipeline.expire(`family:${familyId}`, REFRESH_TOKEN_TTL_SECONDS);
  await pipeline.exec();
}

// ── Get ───────────────────────────────────────────────────────────────────────

export async function getRefreshToken(tokenId: string): Promise<TokenRecord | null> {
  const client = getRedisClient();
  if (!client) return null;

  const value = await client.get(`token:${tokenId}`);
  if (!value) return null;
  return JSON.parse(value) as TokenRecord;
}

// ── Mark used ─────────────────────────────────────────────────────────────────

export async function markTokenUsed(tokenId: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const record = await getRefreshToken(tokenId);
  if (!record) return;
  record.used = true;
  await client.set(`token:${tokenId}`, JSON.stringify(record), 'KEEPTTL');
}

// ── Revoke family ─────────────────────────────────────────────────────────────

export async function revokeFamily(familyId: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const tokenIds = await client.smembers(`family:${familyId}`);
  const pipeline = client.pipeline();
  for (const tokenId of tokenIds) {
    pipeline.del(`token:${tokenId}`);
  }
  pipeline.del(`family:${familyId}`);
  await pipeline.exec();

  logger.warn({ familyId, revokedCount: tokenIds.length }, 'Token family revoked');
}
