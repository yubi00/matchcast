import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !verifyAccessToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
