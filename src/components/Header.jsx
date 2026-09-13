import React from 'react';
import { Music2, Flame, Award, Settings, Radio, Zap, Calendar, Shuffle } from 'lucide-react';
import { ERAS, ERA_LABELS } from '../services/ukChartsCatalog';

export default function Header({
  score,
  streak,
  bestStreak,
  roundNumber,
  totalRounds,
  selectedEra,
  onSelectEra,
  gameMode,
  onToggleGameMode,
  onOpenSettings,
  isAppleMusicAuthorized,
  onAppleMusicAuthClick,
  challengeMode,
  onSwitchChallengeMode,
  dailyNumber
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-brand">
          <div className="brand-icon-wrapper">
            <Music2 className="brand-icon" size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-title">HitParade</span>
            <span className="brand-subtitle">UK Top 10s • Apple Music</span>
          </div>
        </div>

        {/* Daily / Freeplay Mode Toggle */}
        <div className="challenge-mode-toggle">
          <button
            className={`challenge-mode-btn ${challengeMode === 'daily' ? 'active' : ''}`}
            onClick={() => onSwitchChallengeMode('daily')}
            title="Daily Challenge — same tracks for all players"
          >
            <Calendar size={14} />
            <span>Daily #{dailyNumber}</span>
          </button>
          <button
            className={`challenge-mode-btn ${challengeMode === 'freeplay' ? 'active' : ''}`}
            onClick={() => onSwitchChallengeMode('freeplay')}
            title="Free Play — random tracks, unlimited plays"
          >
            <Shuffle size={14} />
            <span>Free Play</span>
          </button>
        </div>

        {/* Era Selector — only active in freeplay */}
        {challengeMode === 'freeplay' && (
          <div className="era-selector-wrapper">
            <select
              className="era-select"
              value={selectedEra}
              onChange={(e) => onSelectEra(e.target.value)}
              aria-label="Select UK Music Era"
            >
              {Object.entries(ERAS).map(([key, val]) => (
                <option key={val} value={val}>
                  {ERA_LABELS[val]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Header Center: Stats */}
      <div className="header-stats">
        <div className="stat-card" title="Current Score">
          <Award size={18} className="stat-icon gold" />
          <div className="stat-details">
            <span className="stat-val">{score.toLocaleString()}</span>
            <span className="stat-lbl">PTS</span>
          </div>
        </div>

        <div className="stat-card" title={`Current Streak: ${streak} (Best: ${bestStreak})`}>
          <Flame size={18} className={`stat-icon fire ${streak > 0 ? 'active' : ''}`} />
          <div className="stat-details">
            <span className="stat-val">{streak}</span>
            <span className="stat-lbl">STREAK</span>
          </div>
        </div>

        <div className="stat-card round-indicator" title="Round Progress">
          <span className="round-badge">
            Track {roundNumber}/{totalRounds}
          </span>
        </div>
      </div>

      {/* Header Right: Mode Switcher & Apple Music Auth */}
      <div className="header-right">
        {/* Game Mode Switcher */}
        <button
          className="mode-toggle-btn"
          onClick={onToggleGameMode}
          title={`Switch to ${gameMode === 'pro' ? 'Multiple Choice' : 'Pro Typeahead'}`}
        >
          <Zap size={14} className="mode-icon" />
          <span>{gameMode === 'pro' ? 'Pro Search' : '4 Choices'}</span>
        </button>

        {/* Apple Music Login / Subscriber status */}
        <button
          className={`apple-auth-btn ${isAppleMusicAuthorized ? 'connected' : ''}`}
          onClick={onAppleMusicAuthClick}
          title={
            isAppleMusicAuthorized
              ? 'Apple Music Connected (Full Catalog Streaming)'
              : 'Log in with Apple Music for full features'
          }
        >
          <Radio size={14} className="apple-icon" />
          <span>{isAppleMusicAuthorized ? 'Apple Music Active' : 'Apple Music'}</span>
        </button>

        {/* Settings button */}
        <button
          className="icon-button settings-btn"
          onClick={onOpenSettings}
          title="Game & Apple Music Settings"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
