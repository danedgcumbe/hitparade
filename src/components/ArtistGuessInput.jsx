import React, { useState, useEffect, useRef } from 'react';
import { Search, FastForward, Lightbulb, Check, X, HelpCircle, Headphones, Crosshair, Music } from 'lucide-react';
import { ALL_UK_ARTISTS } from '../services/ukChartsCatalog';
import { playUnlockSound } from '../services/soundEffects';

const POINTS_LADDER = [1000, 750, 500, 350, 200];

export default function ArtistGuessInput({
  mode, // 'pro' (typeahead) | 'choice' (multiple-choice)
  choices, // array of 4 artists if in choice mode
  onSubmitGuess,
  onSkip,
  guessesHistory,
  maxAttempts,
  currentAttempt,
  isRoundOver,
  hints,
  year,
  ukPeak
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter suggestions as user types
  useEffect(() => {
    if (!searchTerm.trim() || mode !== 'pro') {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const cleanQuery = searchTerm.toLowerCase().trim();
    const startsWithMatches = [];
    const containsMatches = [];

    for (let i = 0; i < ALL_UK_ARTISTS.length; i++) {
      const artist = ALL_UK_ARTISTS[i];
      const lower = artist.toLowerCase();
      if (lower.startsWith(cleanQuery)) {
        startsWithMatches.push(artist);
        if (startsWithMatches.length >= 8) break;
      } else if (lower.includes(cleanQuery)) {
        containsMatches.push(artist);
      }
    }

    const filtered = [...startsWithMatches, ...containsMatches].slice(0, 8);

    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [searchTerm, mode]);

  // Reset hint state on round change
  useEffect(() => {
    setShowHint(false);
    setSearchTerm('');
  }, [choices]);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && searchTerm.trim()) {
        handleSubmit(searchTerm.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSubmit(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        handleSubmit(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSubmit = (artistName) => {
    if (!artistName || isRoundOver) return;
    setSearchTerm('');
    setIsOpen(false);
    onSubmitGuess(artistName);
  };

  const handleSkipClick = () => {
    playUnlockSound();
    onSkip();
  };

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const isChoiceMode = mode === 'choice';

  // In choice mode: pills represent snippet stages (listen → listen → ... → guess)
  // In pro mode: pills represent guess attempts (try 1 → try 2 → ...)
  const renderProgressPills = () => {
    if (isChoiceMode) {
      // Show snippet duration stages — each skip = "listened"
      const SNIPPET_LABELS = ['1.5s', '3s', '6s', '10s', '15s'];
      return (
        <div className="guesses-history">
          {SNIPPET_LABELS.map((label, idx) => {
            const isSkipped = idx < currentAttempt;
            const isCurrent = idx === currentAttempt && !isRoundOver;
            const isGuessed = guessesHistory.length > 0 && idx === currentAttempt;
            const guess = isGuessed ? guessesHistory[guessesHistory.length - 1] : null;

            let className = 'guess-pill';
            if (guess && isGuessed) {
              className += guess.isCorrect ? ' correct' : ' incorrect';
            } else if (isSkipped) {
              className += ' skipped';
            } else if (isCurrent) {
              className += ' active';
            } else {
              className += ' empty';
            }

            return (
              <div key={idx} className={className}>
                {guess && isGuessed ? (
                  <>
                    {guess.isCorrect ? <Check size={14} /> : <X size={14} />}
                    <span className="guess-name">{guess.text}</span>
                  </>
                ) : isSkipped ? (
                  <>
                    <Headphones size={13} />
                    <span className="attempt-num">{label}</span>
                  </>
                ) : isCurrent ? (
                  <>
                    <Crosshair size={13} />
                    <span className="attempt-num">{label}</span>
                  </>
                ) : (
                  <span className="attempt-num">{label}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Pro mode: original guess attempt pills
    return (
      <div className="guesses-history">
        {Array.from({ length: maxAttempts }).map((_, idx) => {
          const guess = guessesHistory[idx];
          return (
            <div
              key={idx}
              className={`guess-pill ${
                guess
                  ? guess.isCorrect
                    ? 'correct'
                    : 'incorrect'
                  : idx === guessesHistory.length && !isRoundOver
                  ? 'active'
                  : 'empty'
              }`}
            >
              {guess ? (
                <>
                  {guess.isCorrect ? <Check size={14} /> : <X size={14} />}
                  <span className="guess-name">{guess.text}</span>
                </>
              ) : (
                <span className="attempt-num">Try {idx + 1}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Points at stake indicator for choice mode
  const pointsAtStake = POINTS_LADDER[currentAttempt] || 150;

  return (
    <div className="guess-section">
      {/* Progress Pills */}
      {renderProgressPills()}

      {/* Points at Stake badge (choice mode only) */}
      {isChoiceMode && !isRoundOver && (
        <div className="points-at-stake">
          <Music size={14} className="stake-icon" />
          <span>Lock in now for <strong>{pointsAtStake} pts</strong></span>
          {currentAttempt < maxAttempts - 1 && (
            <span className="stake-next"> · skip to hear more ({POINTS_LADDER[currentAttempt + 1]} pts)</span>
          )}
        </div>
      )}

      {/* Clues / Hint Card */}
      <div className="hints-container">
        <button
          className={`hint-toggle-btn ${showHint ? 'active' : ''}`}
          onClick={toggleHint}
          aria-label="Toggle clue hint"
        >
          <Lightbulb size={16} className="hint-icon" />
          <span>{showHint ? 'Hide Chart Clue' : 'Need a Clue?'}</span>
        </button>

        {showHint && (
          <div className="hint-box">
            <div className="hint-item">
              <strong>UK Chart Peak:</strong> {ukPeak}
            </div>
            <div className="hint-item">
              <strong>Release Era:</strong> {year}
            </div>
            {hints && hints.length > 0 && (
              <div className="hint-item">
                <strong>Clue:</strong> {hints[0]}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode 1: Multiple Choice Grid */}
      {mode === 'choice' && !isRoundOver && (
        <div className="choice-grid">
          {choices.map((artist, i) => (
            <button
              key={artist + i}
              className="choice-card"
              onClick={() => handleSubmit(artist)}
            >
              <span className="choice-index">{String.fromCharCode(65 + i)}</span>
              <span className="choice-title">{artist}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mode 2: Pro Autocomplete Search */}
      {mode === 'pro' && !isRoundOver && (
        <div className="pro-input-wrapper">
          <div className="input-bar" ref={dropdownRef}>
            <Search className="search-icon" size={20} />
            <input
              ref={inputRef}
              type="text"
              className="artist-search-input"
              placeholder="Type UK artist name (e.g. Queen, Adele, Oasis...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchTerm && (
              <button
                className="submit-guess-btn"
                onClick={() => handleSubmit(searchTerm)}
              >
                Guess
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <ul className="suggestions-dropdown">
              {suggestions.map((artist, index) => (
                <li
                  key={artist}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSubmit(artist)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Search size={14} className="sugg-icon" />
                  <span>{artist}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isRoundOver && (
        <div className="guess-actions">
          {isChoiceMode ? (
            <button
              className="skip-btn"
              onClick={handleSkipClick}
              disabled={currentAttempt >= maxAttempts - 1}
            >
              <FastForward size={16} />
              <span>
                {currentAttempt >= maxAttempts - 1
                  ? 'Max Snippet — Pick Your Answer!'
                  : 'Hear More Before Guessing'}
              </span>
            </button>
          ) : (
            <button
              className="skip-btn"
              onClick={handleSkipClick}
            >
              <FastForward size={16} />
              <span>
                {guessesHistory.length >= maxAttempts - 1
                  ? 'Give Up & Reveal'
                  : 'Unlock Longer Snippet (+seconds)'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
