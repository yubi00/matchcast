import { Request, Response } from 'express';
import { fetchMatches } from '../services/footballApi.service';
import { analysisExists } from '../services/analysisService';
import type { MatchesQuery } from '../validation/schemas';

export async function getMatches(_req: Request, res: Response): Promise<void> {
  const { limit, offset } = res.locals['query'] as MatchesQuery;

  const all = await fetchMatches();
  const sorted = all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const page = sorted.slice(offset, offset + limit);

  const hasAnalysisFlags = await Promise.all(page.map((m) => analysisExists(m.id)));
  const matches = page.map((m, i) => ({ ...m, hasAnalysis: hasAnalysisFlags[i] }));

  res.json({ matches, total: all.length, hasMore: offset + limit < all.length });
}
