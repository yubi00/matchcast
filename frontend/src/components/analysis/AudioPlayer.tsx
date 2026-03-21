import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioBase64: string;
  onEnded?: () => void;
}

export function AudioPlayer({ audioBase64, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const bytes = atob(audioBase64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBase64]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play();
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration ?? 0);
    audioRef.current?.play();
  };
  const onTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime ?? 0);
  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); onEnded?.(); };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={handleEnded}
      />

      <button onClick={togglePlay} style={{
        background: 'var(--accent)',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        cursor: 'pointer',
        fontSize: '14px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isPlaying ? '⏸' : '▶'}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={onSeek}
        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
      />

      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
        {fmt(currentTime)} / {fmt(duration)}
      </span>
    </div>
  );
}
