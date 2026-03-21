import type { MatchesResponse, Analysis } from '../types';
import apiClient from '../lib/apiClient';

export const fetchMatches = (offset = 0): Promise<MatchesResponse> =>
  apiClient.get<MatchesResponse>(`/api/matches?limit=20&offset=${offset}`).then((r) => r.data);

export const fetchAnalysis = (fixtureId: number): Promise<Analysis> =>
  apiClient.get<Analysis>(`/api/analysis/${fixtureId}`).then((r) => r.data);
