import { useQuery } from '@tanstack/react-query';
import { fetchAnalysis } from '../api/matchcast.api';
import { shouldRetry } from '../lib/apiClient';

export function useAnalysis(fixtureId: number | null) {
  return useQuery({
    queryKey: ['analysis', fixtureId],
    queryFn: () => fetchAnalysis(fixtureId!),
    enabled: fixtureId !== null,
    staleTime: Infinity, // analysis never changes for a finished match
    retry: shouldRetry,
  });
}
