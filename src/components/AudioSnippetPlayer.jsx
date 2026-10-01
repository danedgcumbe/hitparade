import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { playClickSound } from '../services/soundEffects';

export const SNIPPET_DURATIONS = [1.5, 3.0, 6.0, 10.0, 15.0];

/**
 * Get the singleton MusicKit instance (safe — returns null if not ready).
 */
function getMK() {
  try {
    return window.MusicKit?.getInstance() || null;
  } catch {
    return null;
  }
}

export default function AudioSnippetPlayer({
  musicKitSongId,
  currentAttempt,
  maxAttempts,
  isRoundOver,
  isGameFinished,
  onSnippetEnd
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const tickRef = useRef(null);         // setInterval handle for time tracking
  const startEpochRef = useRef(null);   // wall-clock time when snippet started
  const startOffsetRef = useRef(0);     // MusicKit playbackTime at snippet start

  const maxPlayDuration = isRoundOver ? 30 : (SNIPPET_DURATIONS[currentAttempt] || 15);

  // ─── Helper: stop everything ────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    const mk = getMK();
    if (mk && mk.playbackState !== 0 /* NONE */ && mk.playbackState !== 2 /* PAUSED */) {
      mk.pause().catch(() => {});
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(false);
  }, []);

  // ─── Stop when song changes or game finishes ─────────────────────────────────
  useEffect(() => {
    stopAll();
  }, [musicKitSongId, stopAll]);

  useEffect(() => {
    if (isGameFinished) stopAll();
  }, [isGameFinished, stopAll]);

  // ─── Auto-play when round ends (reveal the full 30 s) ───────────────────────
  useEffect(() => {
    if (isRoundOver && musicKitSongId) {
      startSnippet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoundOver, musicKitSongId]);

  // ─── Tick: track elapsed time & enforce snippet duration cap ─────────────────
  const startTick = useCallback(() => {
    clearInterval(tickRef.current);
    startEpochRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const mk = getMK();
      const elapsed = mk ? (mk.currentPlaybackTime - startOffsetRef.current) : 0;
      setCurrentTime(elapsed);

      if (elapsed >= maxPlayDuration) {
        clearInterval(tickRef.current);
        getMK()?.pause().catch(() => {});
        setIsPlaying(false);
        setCurrentTime(0);
        if (onSnippetEnd) onSnippetEnd();
      }
    }, 100);
  }, [maxPlayDuration, onSnippetEnd]);

  // ─── Core play logic ─────────────────────────────────────────────────────────
  const startSnippet = useCallback(async () => {
    const mk = getMK();
    if (!mk || !musicKitSongId) return;

    setIsLoading(true);
    try {
      // Queue the song by Apple Music catalog ID
      await mk.setQueue({ song: musicKitSongId });
      // Seek to beginning
      await mk.seekToTime(0);
      startOffsetRef.current = 0;
      await mk.play();
      setIsLoading(false);
      setIsPlaying(true);
      startTick();
    } catch (err) {
      console.warn('MusicKit playback error:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [musicKitSongId, startTick]);

  const togglePlay = useCallback(() => {
    playClickSound();
    const mk = getMK();
    if (!mk || !musicKitSongId) return;

    if (isPlaying) {
      mk.pause().catch(() => {});
      clearInterval(tickRef.current);
      setIsPlaying(false);
    } else {
      startSnippet();
    }
  }, [isPlaying, musicKitSongId, startSnippet]);

  const restartPlay = useCallback(() => {
    playClickSound();
    stopAll();
    setTimeout(() => startSnippet(), 80);
  }, [stopAll, startSnippet]);

  const toggleMute = () => {
    const mk = getMK();
    if (!mk) return;
    const newMuted = !isMuted;
    mk.volume = newMuted ? 0 : 1;
    setIsMuted(newMuted);
  };

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(tickRef.current);
      getMK()?.pause().catch(() => {});
    };
  }, []);

  // ─── Canvas Waveform Animation ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        let barHeight = 4;

        if (isPlaying) {
          const freq1 = Math.sin(phase + i * 0.28) * 0.5 + 0.5;
          const freq2 = Math.cos(phase * 1.4 + i * 0.45) * 0.5 + 0.5;
          barHeight = 6 + (freq1 * 0.6 + freq2 * 0.4) * (height - 12);
        } else {
          barHeight = 4 + Math.sin(phase * 0.4 + i * 0.15) * 2;
        }

        const y = (height - barHeight) / 2;
        const progress = currentTime / maxPlayDuration;
        const isPassed = (i / numBars) <= progress;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPlaying && isPassed) {
          gradient.addColorStop(0, '#ff3b5c');
          gradient.addColorStop(1, '#fa2d48');
        } else if (isPlaying) {
          gradient.addColorStop(0, 'rgba(250, 45, 72, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 114, 137, 0.2)');
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      phase += isPlaying ? 0.12 : 0.03;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, currentTime, maxPlayDuration]);

  const progressPercent = Math.min(100, (currentTime / maxPlayDuration) * 100);
  const isReady = !!musicKitSongId;

  return (
    <div className="player-container">
      {/* Waveform Visualizer Canvas */}
      <div className="visualizer-wrapper">
        <canvas
          ref={canvasRef}
          width={560}
          height={68}
          className="waveform-canvas"
        />
      </div>

      {/* Segmented Heardle-style Progress Bar */}
      <div className="timeline-container">
        <div className="timeline-track">
          <div
            className="timeline-progress"
            style={{ width: `${progressPercent}%` }}
          />
          {SNIPPET_DURATIONS.map((dur, index) => {
            const isUnlocked = index <= currentAttempt || isRoundOver;
            const leftPos = (dur / 15) * 100;
            return (
              <div
                key={dur}
                className={`timeline-marker ${isUnlocked ? 'unlocked' : 'locked'} ${index === currentAttempt ? 'active-target' : ''}`}
                style={{ left: `${leftPos}%` }}
              >
                <span className="marker-label">{dur}s</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audio Playback Controls */}
      <div className="player-controls">
        <button
          className="icon-button secondary"
          onClick={restartPlay}
          title="Replay from start"
          aria-label="Replay snippet"
          disabled={!isReady}
        >
          <RotateCcw size={18} />
        </button>

        <button
          className={`play-main-button ${isPlaying ? 'playing' : ''} ${isLoading || !isReady ? 'loading' : ''}`}
          onClick={togglePlay}
          aria-label={!isReady ? 'Loading track' : isPlaying ? 'Pause' : 'Play Snippet'}
          disabled={!isReady}
          title={!isReady ? 'Loading track...' : isPlaying ? 'Pause snippet' : 'Play snippet'}
        >
          {isPlaying ? (
            <Pause size={28} className="icon-play" />
          ) : !isReady ? (
            <Loader2 size={26} className="icon-play animate-spin" />
          ) : (
            <Play size={28} className="icon-play" style={{ marginLeft: '3px' }} />
          )}
          <span className="glow-ring"></span>
        </button>

        <button
          className="icon-button secondary"
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label="Toggle mute"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Current snippet info */}
      <div className="snippet-status">
        <div className="duration-badge">
          {!isReady ? (
            <>
              <Loader2 size={14} className="sparkle-icon animate-spin" />
              <span>Loading Track...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="sparkle-icon" />
              <span>
                {isRoundOver
                  ? 'Full Track (Apple Music)'
                  : `Playing Opening ${maxPlayDuration}s Segment`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
