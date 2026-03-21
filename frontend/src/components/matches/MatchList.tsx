import { useQuery } from '@tanstack/react-query';
import { fetchMatches } from '../../api/matchcast.api';
import { MatchCard } from './MatchCard';

export function MatchList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (isLoading) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
        Loading matches...
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>
        Failed to load matches. Is the backend running?
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data?.matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
