import { Request, Response } from 'express';
import { fetchMatches } from '../services/footballApi.service';
import type { MatchesQuery } from '../validation/schemas';

export async function getMatches(_req: Request, res: Response): Promise<void> {
  const { limit, offset } = res.locals['query'] as MatchesQuery;

  const all = await fetchMatches();
  const sorted = all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const page = sorted.slice(offset, offset + limit);

  res.json({ matches: page, total: all.length, hasMore: offset + limit < all.length });
}
