import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { playClickSound } from '../services/soundEffects';

export const SNIPPET_DURATIONS = [1.5, 3.0, 6.0, 10.0, 15.0];

export default function AudioSnippetPlayer({
  previewUrl,
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

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const maxPlayDuration = isRoundOver ? 30 : (SNIPPET_DURATIONS[currentAttempt] || 15);

  // Stop playback and reload media engine when previewUrl changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (previewUrl) {
        audioRef.current.load();
      }
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(false);
  }, [previewUrl]);

  // Auto-play full 30s preview when round ends (answer revealed)
  useEffect(() => {
    if (isRoundOver && audioRef.current && previewUrl) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [isRoundOver, previewUrl]);

  // Stop playback when game finishes (summary modal appears)
  useEffect(() => {
    if (isGameFinished && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isGameFinished]);

  // Handle audio progress and hard-stop at maxPlayDuration
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (time >= maxPlayDuration) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      if (onSnippetEnd) onSnippetEnd();
    }
  };

  const togglePlay = () => {
    playClickSound();
    if (!audioRef.current || !previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsLoading(true);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Playback interrupted or blocked:', err);
            setIsLoading(false);
            setIsPlaying(false);
          });
      }
    }
  };

  const restartPlay = () => {
    playClickSound();
    if (!audioRef.current || !previewUrl) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsLoading(true);
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Restart play error:', err);
          setIsLoading(false);
        });
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Canvas Waveform Animation
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
          // Dynamic lively wave
          const freq1 = Math.sin(phase + i * 0.28) * 0.5 + 0.5;
          const freq2 = Math.cos(phase * 1.4 + i * 0.45) * 0.5 + 0.5;
          barHeight = 6 + (freq1 * 0.6 + freq2 * 0.4) * (height - 12);
        } else {
          // Idle subtle pulse
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, maxPlayDuration]);

  const progressPercent = Math.min(100, (currentTime / maxPlayDuration) * 100);

  return (
    <div className="player-container">
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          console.warn('Audio playback error:', e);
          setIsLoading(false);
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

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
          {/* Segment Markers */}
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
          disabled={!previewUrl}
        >
          <RotateCcw size={18} />
        </button>

        <button
          className={`play-main-button ${isPlaying ? 'playing' : ''} ${isLoading || !previewUrl ? 'loading' : ''}`}
          onClick={togglePlay}
          aria-label={!previewUrl ? 'Loading snippet' : isPlaying ? 'Pause' : 'Play Snippet'}
          disabled={!previewUrl}
          title={!previewUrl ? 'Loading audio snippet...' : isPlaying ? 'Pause snippet' : 'Play snippet'}
        >
          {isPlaying ? (
            <Pause size={28} className="icon-play" />
          ) : !previewUrl ? (
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
          {!previewUrl ? (
            <>
              <Loader2 size={14} className="sparkle-icon animate-spin" />
              <span>Loading Audio Snippet...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="sparkle-icon" />
              <span>
                {isRoundOver
                  ? 'Full Track Preview (30s)'
                  : `Playing Opening ${maxPlayDuration}s Segment`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
