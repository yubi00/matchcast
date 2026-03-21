interface AnalysisPanelProps {
  text: string;
}

export function AnalysisPanel({ text }: AnalysisPanelProps) {
  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: 'var(--bg)',
      borderRadius: 'var(--radius)',
      borderLeft: '3px solid var(--accent)',
      color: 'var(--text-muted)',
      lineHeight: 1.7,
      fontSize: '13px',
    }}>
      {text}
    </div>
  );
}
