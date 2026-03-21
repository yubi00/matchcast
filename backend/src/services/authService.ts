import jwt from 'jsonwebtoken';
import config from '../config';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export function generateAccessToken(): string {
  return jwt.sign({}, config.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function generateRefreshToken(): string {
  return jwt.sign({}, config.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): boolean {
  try {
    jwt.verify(token, config.jwtAccessSecret);
    return true;
  } catch {
    return false;
  }
}

export function verifyRefreshToken(token: string): boolean {
  try {
    jwt.verify(token, config.jwtRefreshSecret);
    return true;
  } catch {
    return false;
  }
}
