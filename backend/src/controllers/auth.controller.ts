import { Request, Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../services/authService';
import config from '../config';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: (config.nodeEnv === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export function issueTokens(_req: Request, res: Response): void {
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken });
}

export function refreshTokens(req: Request, res: Response): void {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (!token || !verifyRefreshToken(token)) {
    res.status(401).json({ error: 'Invalid or missing refresh token' });
    return;
  }

  const accessToken = generateAccessToken();
  res.json({ accessToken });
}
