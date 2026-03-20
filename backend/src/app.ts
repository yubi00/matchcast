import express, { Request, Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import logger from './utils/logger';
import { errorMiddleware } from './middleware/errorMiddleware';
import matchesRouter from './routes/matches.router';

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/matches', matchesRouter);

app.use(errorMiddleware);

export default app;
