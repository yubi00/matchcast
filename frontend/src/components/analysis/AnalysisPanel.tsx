import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

interface AnalysisPanelProps {
  text: string;
  audioUrl: string | null;
  onAudioEnded?: () => void;
}

export function AnalysisPanel({ text, audioUrl, onAudioEnded }: AnalysisPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: 'var(--bg)',
      borderRadius: 'var(--radius)',
      borderLeft: '3px solid var(--accent)',
    }}>
      {audioUrl && <AudioPlayer audioUrl={audioUrl} onEnded={onAudioEnded} />}

      <button
        onClick={() => setShowTranscript(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--accent)',
          fontSize: '12px',
          padding: '0',
          marginBottom: showTranscript ? '10px' : '0',
        }}
      >
        {showTranscript ? <EyeOff size={14} /> : <Eye size={14} />}
        {showTranscript ? 'Hide transcript' : 'Show transcript'}
      </button>

      {showTranscript && (
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '13px', margin: 0 }}>
          {text}
        </p>
      )}
    </div>
  );
}
