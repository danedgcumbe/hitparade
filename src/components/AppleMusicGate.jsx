import React, { useState } from 'react';
import { Music2, Radio, Loader, AlertCircle, Sparkles } from 'lucide-react';

export default function AppleMusicGate({
  isMusicKitLoading,
  isMusicKitConfigured,
  onLogin,
  onContinuePreviews
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setIsLoggingIn(true);
    try {
      await onLogin();
    } catch (err) {
      setError(err.message || 'Failed to connect to Apple Music. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="gate-container">
      <div className="gate-backdrop" />

      <div className="gate-content">
        {/* Animated Logo */}
        <div className="gate-logo">
          <div className="gate-logo-ring">
            <div className="gate-logo-ring-inner" />
          </div>
          <Music2 className="gate-logo-icon" size={44} />
        </div>

        {/* Title */}
        <h1 className="gate-title">PopsIQ</h1>
        <p className="gate-subtitle">UK Top 10s • Apple Music Guessing Game</p>

        {/* Description */}
        <p className="gate-desc">
          Listen to opening snippets of iconic UK chart hits and guess the artist.
          Play instantly with Apple Music 30-second previews, or sign in with your Apple Music subscription.
        </p>

        {/* Actions */}
        <div className="gate-action">
          {onContinuePreviews && (
            <button
              className="gate-preview-btn"
              onClick={onContinuePreviews}
            >
              <Sparkles size={18} className="gate-btn-icon" />
              <span>Play with Free 30s Previews</span>
            </button>
          )}

          {isMusicKitLoading ? (
            <div className="gate-loading">
              <Loader size={20} className="gate-spinner" />
              <span>Connecting to Apple Music...</span>
            </div>
          ) : !isMusicKitConfigured ? null : (
            <button
              className="gate-login-btn secondary"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <Radio size={18} className="gate-btn-icon" />
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Apple Music (Optional)'}</span>
              {isLoggingIn && <Loader size={16} className="gate-spinner" />}
            </button>
          )}
        </div>

        {error && (
          <div className="gate-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Note */}
        <p className="gate-footer">
          Official 30-second audio previews are powered by Apple Music.
          <br />
          Signing in with Apple Music is optional for subscribers.
        </p>
      </div>
    </div>
  );
}
