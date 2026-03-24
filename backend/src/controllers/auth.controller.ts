import { Request, Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  createTokenId,
} from '../services/authService';
import {
  storeRefreshToken,
  getRefreshToken,
  markTokenUsed,
  revokeFamily,
} from '../services/tokenStore';
import config from '../config';
import logger from '../utils/logger';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export async function issueTokens(_req: Request, res: Response): Promise<void> {
  const familyId = createTokenId();
  const tokenId = createTokenId();

  await storeRefreshToken(tokenId, familyId);

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken(tokenId, familyId);

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken });
}

export async function refreshTokens(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];

  const payload = token ? verifyRefreshToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Invalid or missing refresh token' });
    return;
  }

  const { tokenId, familyId } = payload;
  const record = await getRefreshToken(tokenId);

  if (!record) {
    res.status(401).json({ error: 'Session expired, please log in again' });
    return;
  }

  if (record.used) {
    logger.warn({ tokenId, familyId }, 'Replay attack detected — revoking token family');
    await revokeFamily(familyId);
    res.status(401).json({ error: 'Session invalidated, please log in again' });
    return;
  }

  // Rotate — mark old token used, issue new one in same family
  await markTokenUsed(tokenId);
  const newTokenId = createTokenId();
  await storeRefreshToken(newTokenId, familyId);

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken(newTokenId, familyId);

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken });
}
