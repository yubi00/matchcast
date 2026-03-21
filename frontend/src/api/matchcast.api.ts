import type { MatchesResponse, Analysis } from '../types';
import { getAccessToken, refreshAuth } from '../lib/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, withAuth = false): Promise<T> {
  const res = await doFetch(path, withAuth);

  if (res.status === 401 && withAuth) {
    const refreshed = await refreshAuth();
    if (refreshed) {
      const retry = await doFetch(path, withAuth);
      if (!retry.ok) throw new Error(`API error: ${retry.status}`);
      return retry.json() as Promise<T>;
    }
    throw new Error('Session expired');
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function doFetch(path: string, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  if (withAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' });
}

export const fetchMatches = (offset = 0): Promise<MatchesResponse> =>
  apiFetch<MatchesResponse>(`/api/matches?limit=20&offset=${offset}`, true);

export const fetchAnalysis = (fixtureId: number): Promise<Analysis> =>
  apiFetch<Analysis>(`/api/analysis/${fixtureId}`, true);
