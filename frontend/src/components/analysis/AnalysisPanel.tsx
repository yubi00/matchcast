import { AudioPlayer } from './AudioPlayer';

interface AnalysisPanelProps {
  text: string;
  audioBase64: string | null;
}

export function AnalysisPanel({ text, audioBase64 }: AnalysisPanelProps) {
  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: 'var(--bg)',
      borderRadius: 'var(--radius)',
      borderLeft: '3px solid var(--accent)',
    }}>
      {audioBase64 && <AudioPlayer audioBase64={audioBase64} />}

      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '13px', margin: 0 }}>
        {text}
      </p>
    </div>
  );
}
