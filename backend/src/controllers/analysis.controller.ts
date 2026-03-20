import { Request, Response } from 'express';
import { fetchFixtureDetail } from '../services/footballApi.service';
import { preprocess } from '../services/preprocessor';
import { generateAnalysis } from '../services/analysisGenerator';
import type { AnalysisParams } from '../validation/schemas';

export async function getAnalysis(_req: Request, res: Response): Promise<void> {
  const { matchId } = res.locals['params'] as AnalysisParams;

  const raw = await fetchFixtureDetail(Number(matchId));
  const signals = preprocess(raw);
  const analysis = await generateAnalysis(signals);

  res.json({
    fixtureId: signals.fixtureId,
    homeTeam: signals.homeTeam,
    awayTeam: signals.awayTeam,
    score: signals.score,
    analysis,
  });
}
