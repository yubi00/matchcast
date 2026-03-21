import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from './utils/logger';
import { errorMiddleware } from './middleware/errorMiddleware';
import matchesRouter from './routes/matches.router';
import analysisRouter from './routes/analysis.router';
import { globalLimiter, analysisLimiter } from './middleware/rateLimiter';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/matches', matchesRouter);
app.use('/api/analysis', analysisLimiter, analysisRouter);

app.use(errorMiddleware);

export default app;
