import { Request, Response } from 'express';
import { fetchMatches } from '../services/footballApi.service';
import type { MatchesQuery } from '../validation/schemas';

export async function getMatches(_req: Request, res: Response): Promise<void> {
  const { limit } = res.locals['query'] as MatchesQuery;

  const matches = await fetchMatches();

  const result = matches
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  res.json({ matches: result, total: result.length });
}
