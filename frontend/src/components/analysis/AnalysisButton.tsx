interface AnalysisButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isGenerated: boolean;
  isExpanded: boolean;
}

export function AnalysisButton({ onClick, isLoading, isGenerated, isExpanded }: AnalysisButtonProps) {
  const filled = !isGenerated;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        marginTop: '10px',
        padding: '7px 14px',
        background: filled ? 'var(--accent)' : 'transparent',
        color: filled ? '#fff' : 'var(--accent)',
        border: `1px solid ${filled ? 'transparent' : 'var(--accent)'}`,
        borderRadius: 'var(--radius)',
        fontWeight: 600,
        fontSize: '12px',
        opacity: isLoading ? 0.6 : 1,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, opacity 0.2s',
      }}
    >
      {isLoading ? (
        <span style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      ) : isExpanded ? '▲ MatchCast' : '▶ MatchCast'}
    </button>
  );
}
