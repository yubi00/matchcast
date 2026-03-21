import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import logger from './utils/logger';
import config from './config';
import { errorMiddleware } from './middleware/errorMiddleware';
import { globalLimiter, analysisLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/authMiddleware';
import matchesRouter from './routes/matches.router';
import analysisRouter from './routes/analysis.router';
import authRouter from './routes/auth.router';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/matches', authMiddleware, matchesRouter);
app.use('/api/analysis', analysisLimiter, authMiddleware, analysisRouter);

app.use(errorMiddleware);

export default app;
