interface AnalysisButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isActive: boolean;
}

export function AnalysisButton({ onClick, isLoading, isActive }: AnalysisButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        marginTop: '10px',
        padding: '7px 14px',
        background: isActive ? 'var(--surface)' : 'var(--accent)',
        color: isActive ? 'var(--accent)' : '#fff',
        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
        borderRadius: 'var(--radius)',
        fontWeight: 600,
        fontSize: '12px',
        opacity: isLoading ? 0.6 : 1,
        transition: 'background 0.2s, opacity 0.2s',
      }}
    >
      {isLoading ? 'Generating...' : '▶ MatchCast'}
    </button>
  );
}
