import { useState } from 'react';
import type { Match } from '../../types';
import { AnalysisButton } from '../analysis/AnalysisButton';
import { AnalysisPanel } from '../analysis/AnalysisPanel';
import { useAnalysis } from '../../hooks/useAnalysis';

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const [requested, setRequested] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isFetching, isError } = useAnalysis(requested ? match.id : null);

  const handleButtonClick = () => {
    if (!data) {
      setRequested(true);
      setIsExpanded(true);
    } else {
      setIsExpanded(prev => !prev);
    }
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
    }}>
      {/* Teams + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {/* Home team */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <img src={match.homeTeam.logo} alt={match.homeTeam.name} height={36} width={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>{match.homeTeam.name}</span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '3px', color: 'var(--accent)' }}>
            {match.score.fulltime.home} – {match.score.fulltime.away}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            HT {match.score.halftime.home} – {match.score.halftime.away}
          </span>
        </div>

        {/* Away team */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <img src={match.awayTeam.logo} alt={match.awayTeam.name} height={36} width={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>{match.awayTeam.name}</span>
        </div>
      </div>

      {/* MatchCast button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
        <AnalysisButton
          onClick={handleButtonClick}
          isLoading={isFetching}
          isGenerated={!!data}
          isExpanded={isExpanded}
        />
      </div>

      {/* Error */}
      {isError && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
          Analysis unavailable — try again.
        </p>
      )}

      {/* Analysis panel */}
      {data && isExpanded && (
        <AnalysisPanel
          text={data.analysis}
          audioBase64={data.audioBase64}
          onAudioEnded={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
