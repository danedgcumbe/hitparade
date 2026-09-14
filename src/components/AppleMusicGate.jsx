import React, { useState } from 'react';
import { Music2, Radio, Loader, AlertCircle } from 'lucide-react';

export default function AppleMusicGate({
  isMusicKitLoading,
  isMusicKitConfigured,
  onLogin
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
          Connect with Apple Music to start playing.
        </p>

        {/* Login Button or Loading State */}
        <div className="gate-action">
          {isMusicKitLoading ? (
            <div className="gate-loading">
              <Loader size={20} className="gate-spinner" />
              <span>Connecting to Apple Music...</span>
            </div>
          ) : !isMusicKitConfigured ? (
            <div className="gate-unavailable">
              <AlertCircle size={18} />
              <span>Apple Music is not available right now. Please try again later.</span>
            </div>
          ) : (
            <button
              className="gate-login-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <Radio size={20} className="gate-btn-icon" />
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Apple Music'}</span>
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
          Requires an active Apple Music subscription.
          <br />
          Your credentials are handled securely by Apple — we never see your password.
        </p>
      </div>
    </div>
  );
}
