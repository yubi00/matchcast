import type { MatchesResponse, Analysis } from '../types';
import apiClient from '../lib/apiClient';

export const fetchMatches = async (offset = 0): Promise<MatchesResponse> => {
  const response = await apiClient.get<MatchesResponse>(`/api/matches?limit=20&offset=${offset}`);
  return response.data;
};

export const fetchAnalysis = async (fixtureId: number): Promise<Analysis> => {
  const response = await apiClient.get<Analysis>(`/api/analysis/${fixtureId}`);
  return response.data;
};
