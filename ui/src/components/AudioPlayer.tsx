import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  FastForward,
  Bookmark,
  Sparkles,
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

  // Sync actual HTML5 audio element
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
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

  const handleSkip = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="w-full glass-card rounded-2xl p-4 shadow-xl border border-white/10 relative overflow-visible">
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={() => {
            if (audioRef.current) onSeek(audioRef.current.currentTime);
          }}
          onEnded={onPlayPause}
        />
      )}

      {/* Chapter pill indicator */}
      {activeChapterTitle && (
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <Bookmark className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate">{activeChapterTitle}</span>
          </div>
          <button
            onClick={onToggleFollow}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              followTranscript
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
            title="Auto-scroll transcript along with audio"
          >
            Follow Audio: {followTranscript ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Scrubber track */}
      <div className="relative mb-3 group select-none">
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          className="h-3 bg-surface-950 rounded-full cursor-pointer relative overflow-hidden border border-white/10"
        >
          {/* Progress bar fill */}
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>

          {/* Chapter markers */}
          {duration > 0 &&
            chapters.map((ch, idx) => {
              const markerPercent = (ch.start / duration) * 100;
              if (markerPercent <= 0 || markerPercent >= 100) return null;
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none hover:bg-brand-400"
                  style={{ left: `${markerPercent}%` }}
                  title={`${ch.title} (${formatTime(ch.start)})`}
                />
              );
            })}
        </div>

        {/* Hover preview tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-surface-900 border border-white/10 rounded text-[10px] font-mono text-white pointer-events-none shadow-lg z-20 tabular-nums"
            style={{ left: `${hoverPos}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Time display */}
        <div className="text-xs font-mono text-slate-300 tabular-nums min-w-[100px]">
          <span className="text-white font-semibold">{formatTime(currentTime)}</span>
          <span className="text-slate-500 mx-1">/</span>
          <span className="text-slate-400">{formatTime(duration)}</span>
        </div>

        {/* Center: Play / Pause / Skip */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleSkip(-10)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all active:scale-95"
            title="Rewind 10s (J)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transition-all active:scale-95"
            title="Play/Pause (Space)"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all active:scale-95"
            title="Forward 10s (L)"
            aria-label="Fast forward 10 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Speed & Volume */}
        <div className="flex items-center gap-3">
          {/* Playback speed pills */}
          <div className="flex items-center bg-surface-950 p-0.5 rounded-lg border border-white/5">
            {rates.map((r) => (
              <button
                key={r}
                onClick={() => onRateChange(r)}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors tabular-nums ${
                  playbackRate === r
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>

          {/* Volume toggle */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
              title="Mute / Unmute (M)"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-16 h-1 bg-surface-950 rounded-lg appearance-none cursor-pointer accent-brand-500"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
