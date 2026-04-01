import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import config from '../config';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export interface RefreshTokenPayload {
  tokenId: string;
  familyId: string;
}

export function createTokenId(): string {
  return randomUUID();
}

export function generateAccessToken(): string {
  return jwt.sign({}, config.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function generateRefreshToken(tokenId: string, familyId: string): string {
  return jwt.sign({ tokenId, familyId }, config.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): boolean {
  try {
    jwt.verify(token, config.jwtAccessSecret);
    return true;
  } catch {
    return false;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
  } catch {
    return null;
  }
}
