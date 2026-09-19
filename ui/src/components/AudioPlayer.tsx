import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Bookmark,
  Check,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { ChapterNotes } from '../types';

interface AudioPlayerProps {
  audioSrc?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  chapters?: ChapterNotes[];
  activeChapterTitle?: string;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  followTranscript: boolean;
  onToggleFollow: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioSrc,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  chapters = [],
  activeChapterTitle,
  playbackRate,
  onRateChange,
  followTranscript,
  onToggleFollow,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  // Sync HTML5 audio element
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle click on scrubber
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * (duration || 1);
    onSeek(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverPos(clickX);
    setHoverTime(fraction * (duration || 1));
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  // Deterministic waveform bars (64 bars)
  const waveformBars = useMemo(() => {
    const bars = [];
    const count = 72;
    for (let i = 0; i < count; i++) {
      // Deterministic heights between 20% and 100%
      const val = Math.sin(i * 0.28) * 0.35 + Math.cos(i * 0.15) * 0.25 + 0.4;
      bars.push(Math.max(0.18, Math.min(0.95, val)));
    }
    return bars;
  }, []);

  const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="w-full bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3 text-text transition-all">
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={() => {
            if (audioRef.current) onSeek(audioRef.current.currentTime);
          }}
          onEnded={() => onPlayPause()}
        />
      )}

      {/* Waveform Scrubber Bar */}
      <div className="relative mb-2">
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          className="h-10 w-full flex items-end gap-[2px] cursor-pointer relative group px-1 py-1 bg-bg/50 rounded-md border border-border select-none"
        >
          {/* Waveform Bars */}
          {waveformBars.map((height, i) => {
            const barFraction = i / waveformBars.length;
            const isPlayed = barFraction <= progressFraction;

            return (
              <div
                key={i}
                style={{ height: `${height * 100}%` }}
                className={`flex-1 rounded-sm transition-all ${
                  isPlayed
                    ? 'bg-accent group-hover:opacity-90'
                    : 'bg-muted/30 group-hover:bg-muted/40'
                }`}
              />
            );
          })}

          {/* Chapter markers */}
          {chapters.map((ch, idx) => {
            const leftPct = duration > 0 ? (ch.start / duration) * 100 : 0;
            return (
              <div
                key={idx}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 bottom-0 w-[1.5px] bg-accent/60 pointer-events-none"
                title={`${ch.title} (${formatTime(ch.start)})`}
              />
            );
          })}

          {/* Hover timestamp tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPos}px` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-text text-bg text-[11px] font-mono tabular-nums shadow pointer-events-none whitespace-nowrap"
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Playback Controls & Timestamps */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-text transition-colors"
            title="Skip back 10s (j)"
            aria-label="Skip backward 10 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm"
            title="Play / Pause (Space)"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="p-1.5 rounded-md hover:bg-bg text-muted hover:text-text transition-colors"
            title="Skip forward 10s (l)"
            aria-label="Skip forward 10 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="font-mono text-xs tabular-nums text-muted ml-1">
            <span className="text-text font-medium">{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>

          {activeChapterTitle && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted max-w-[200px] truncate border-l border-border pl-3">
              <Bookmark className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">{activeChapterTitle}</span>
            </div>
          )}
        </div>

        {/* Right: Rate Buttons, Follow Toggle & Volume */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Speed Selector */}
          <div className="inline-flex rounded-md border border-border bg-bg p-0.5 text-[11px] font-mono">
            {rates.map((r) => (
              <button
                key={r}
                onClick={() => onRateChange(r)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackRate === r
                    ? 'bg-accent text-on-accent font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>

          {/* Follow Transcript Toggle */}
          <button
            onClick={onToggleFollow}
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
              followTranscript
                ? 'bg-accent-tint border-accent/30 text-accent font-medium'
                : 'border-border bg-bg text-muted hover:text-text'
            }`}
            title="Auto-scroll transcript to match audio"
          >
            {followTranscript && <Check className="w-3 h-3" />}
            <span>Follow text</span>
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded text-muted hover:text-text transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-alert" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-16 h-1 bg-bg rounded-lg appearance-none cursor-pointer accent-accent"
              aria-label="Volume level"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
