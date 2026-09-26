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
      {/* Primary Row: Brand Identity & Global Action Controls */}
      <div className="header-primary-row">
        <div className="app-brand">
          <div className="brand-icon-wrapper">
            <Music2 className="brand-icon" size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-title">PopsIQ</span>
            <span className="brand-subtitle">UK Top 10 hits</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
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
            className={`apple-auth-btn ${isAppleMusicAuthorized ? 'connected' : 'preview-mode'}`}
            onClick={onAppleMusicAuthClick}
            title={
              isAppleMusicAuthorized
                ? 'Apple Music Connected (Active)'
                : 'Playing with Apple Music 30s previews. Sign in is optional.'
            }
          >
            <Radio size={14} className="apple-icon" />
            <span>{isAppleMusicAuthorized ? 'Apple Music Active' : '30s Previews'}</span>
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
      </div>

      {/* Secondary Row: Game Mode Navigation & Live Stats */}
      <div className="header-secondary-row">
        <div className="header-nav-group">
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

        {/* Live Round & Game Stats */}
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
      </div>
    </header>
  );
}
