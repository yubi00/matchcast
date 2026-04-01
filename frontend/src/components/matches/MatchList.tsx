import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchMatches } from '../../api/matchcast.api';
import { shouldRetry } from '../../lib/apiClient';
import { MatchCard } from './MatchCard';

export function MatchList() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['matches'],
      queryFn: ({ pageParam = 0 }) => fetchMatches(pageParam),
      getNextPageParam: (lastPage, pages) =>
        lastPage.hasMore ? pages.length * 20 : undefined,
      initialPageParam: 0,
      staleTime: 5 * 60 * 1000,
      retry: shouldRetry,
    });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={28} color='var(--accent)' style={{ animation: 'spin 1s linear infinite' }} />
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

  const matches = data?.pages.flatMap((p) => p.matches) ?? [];

  const grouped = matches.reduce<Record<string, typeof matches>>((acc, match) => {
    const key = match.date.split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const formatDateHeader = (dateKey: string) =>
    new Date(dateKey).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.entries(grouped).map(([dateKey, dayMatches]) => (
          <div key={dateKey}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--border)',
            }}>
              {formatDateHeader(dateKey)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--accent)',
              padding: '10px 24px',
              cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isFetchingNextPage
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : 'Load more matches'}
          </button>
        </div>
      )}
    </div>
  );
}
