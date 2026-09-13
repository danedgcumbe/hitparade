import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, ExternalLink, Music, Star, Award } from 'lucide-react';
import { playClickSound } from '../services/soundEffects';

export default function RoundResultModal({
  isCorrect,
  earnedPoints,
  currentTrack,
  secondsUsed,
  onNextRound,
  isLastRound,
  onShowSummary
}) {
  const handleProceed = () => {
    playClickSound();
    if (isLastRound) {
      onShowSummary();
    } else {
      onNextRound();
    }
  };

  const appleMusicUrl =
    currentTrack.trackViewUrl ||
    `https://music.apple.com/gb/search?term=${encodeURIComponent(
      `${currentTrack.artist} ${currentTrack.title}`
    )}`;

  return (
    <div className="round-result-card animate-slide-up">
      <div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'}`}>
        {isCorrect ? (
          <>
            <CheckCircle2 size={28} className="status-icon" />
            <div className="result-text-group">
              <h3>Spot On! That's correct</h3>
              <p>Identified in {secondsUsed}s of audio</p>
            </div>
            <div className="points-pill">+{earnedPoints} PTS</div>
          </>
        ) : (
          <>
            <XCircle size={28} className="status-icon" />
            <div className="result-text-group">
              <h3>Nice try! Here's the track</h3>
              <p>Better luck on the next one</p>
            </div>
            <div className="points-pill zero">0 PTS</div>
          </>
        )}
      </div>

      <div className="track-reveal-body">
        <div className="track-artwork-wrapper">
          <img
            src={currentTrack.artworkUrl}
            alt={`${currentTrack.title} by ${currentTrack.artist}`}
            className="track-artwork-img"
          />
          <div className="artwork-glow" style={{ backgroundImage: `url(${currentTrack.artworkUrl})` }} />
        </div>

        <div className="track-info">
          <h2 className="track-artist">{currentTrack.artist}</h2>
          <h3 className="track-title">{currentTrack.title}</h3>

          <div className="track-metadata-tags">
            <span className="meta-tag chart-peak">
              🇬🇧 UK Chart Peak: <strong>{currentTrack.ukPeak}</strong>
            </span>
            <span className="meta-tag release-year">
              📅 Year: <strong>{currentTrack.year}</strong>
            </span>
          </div>

          {currentTrack.hints && currentTrack.hints.length > 0 && (
            <p className="track-trivia">
              💡 <em>{currentTrack.hints[0]}</em>
            </p>
          )}

          <div className="track-actions">
            <a
              href={appleMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-music-listen-btn"
            >
              <Music size={16} />
              <span>Open on Apple Music</span>
              <ExternalLink size={14} className="ext-icon" />
            </a>

            <button className="next-track-btn" onClick={handleProceed}>
              <span>{isLastRound ? 'See Game Summary' : 'Next Track'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
