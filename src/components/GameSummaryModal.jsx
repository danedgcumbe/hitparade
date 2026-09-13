import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, RotateCcw, Share2, Check, Clock, Shuffle } from 'lucide-react';
import { playSuccessSound } from '../services/soundEffects';
import { getNextDailyResetTime, formatCountdown } from '../services/dailySeed';

export default function GameSummaryModal({
  score,
  bestStreak,
  history,
  onPlayAgain,
  eraLabel,
  challengeMode,
  dailyNumber,
  dailyAlreadyCompleted,
  onSwitchToFreeplay
}) {
  const correctCount = history.filter((h) => h.isCorrect).length;
  const totalCount = history.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    playSuccessSound();
    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fa2d48', '#ff3b5c', '#30d158', '#ffd60a', '#0a84ff']
      });
    } catch (e) {
      // ignore
    }
  }, []);

  // Countdown timer for daily mode
  useEffect(() => {
    if (challengeMode !== 'daily') return;
    const update = () => {
      setCountdown(formatCountdown(getNextDailyResetTime()));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [challengeMode]);

  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    const emojis = history
      .map((h) => (h.isCorrect ? (h.secondsUsed <= 3 ? '🟩' : '🟨') : '🟥'))
      .join('');

    const prefix = challengeMode === 'daily'
      ? `🇬🇧 HitParade Daily #${dailyNumber}`
      : `🇬🇧 HitParade UK Top 10s`;

    const text = `${prefix}\n${eraLabel}\nScore: ${score} pts | Accuracy: ${accuracy}%\n${emojis}\nGuess the artist from opening snippets on Apple Music!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isDaily = challengeMode === 'daily';

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog summary-dialog animate-scale-up">
        <div className="summary-header">
          <div className="trophy-badge">
            <Trophy size={40} className="trophy-icon" />
          </div>
          <h2>{isDaily ? `Daily Challenge #${dailyNumber}` : 'Game Completed!'}</h2>
          <p className="summary-era">{eraLabel}</p>
        </div>

        <div className="summary-stats-grid">
          <div className="summary-stat-box">
            <span className="stat-big-val">{score.toLocaleString()}</span>
            <span className="stat-desc">Total Points</span>
          </div>

          <div className="summary-stat-box">
            <span className="stat-big-val">{accuracy}%</span>
            <span className="stat-desc">Accuracy ({correctCount}/{totalCount})</span>
          </div>

          <div className="summary-stat-box">
            <span className="stat-big-val">{bestStreak}</span>
            <span className="stat-desc">Best Streak</span>
          </div>
        </div>

        {/* Countdown to next daily */}
        {isDaily && (
          <div className="daily-countdown-banner">
            <Clock size={18} />
            <span>Next daily challenge in <strong>{countdown}</strong></span>
          </div>
        )}

        {/* History Breakdown List */}
        <div className="history-breakdown">
          <h3>Track Recap</h3>
          <div className="history-items-list">
            {history.map((item, idx) => (
              <div key={idx} className={`history-item ${item.isCorrect ? 'pass' : 'fail'}`}>
                <div className="hist-status-icon">
                  {item.isCorrect ? '✓' : '✗'}
                </div>
                <div className="hist-track-info">
                  <span className="hist-artist">{item.track.artist}</span>
                  <span className="hist-title">{item.track.title}</span>
                </div>
                <div className="hist-points">
                  {item.isCorrect ? `+${item.earnedPoints} pts (${item.secondsUsed}s)` : '0 pts'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-actions">
          <button className="share-btn" onClick={handleShare}>
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            <span>{copied ? 'Score Copied to Clipboard!' : 'Share Result'}</span>
          </button>

          {isDaily ? (
            <button className="play-again-btn" onClick={onSwitchToFreeplay}>
              <Shuffle size={18} />
              <span>Switch to Free Play</span>
            </button>
          ) : (
            <button className="play-again-btn" onClick={onPlayAgain}>
              <RotateCcw size={18} />
              <span>Play Another Round</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
