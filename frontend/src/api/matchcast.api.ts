import type { MatchesResponse, Analysis } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchMatches = (): Promise<MatchesResponse> =>
  apiFetch<MatchesResponse>('/api/matches?limit=20');

export const fetchAnalysis = (fixtureId: number): Promise<Analysis> =>
  apiFetch<Analysis>(`/api/analysis/${fixtureId}`);
