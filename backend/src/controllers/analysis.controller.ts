import { Request, Response } from 'express';
import { getAnalysis as getAnalysisFromService } from '../services/analysisService';
import type { AnalysisParams } from '../validation/schemas';

export async function getAnalysis(_req: Request, res: Response): Promise<void> {
  const { matchId } = res.locals['params'] as AnalysisParams;
  const result = await getAnalysisFromService(Number(matchId));
  res.json(result);
}
