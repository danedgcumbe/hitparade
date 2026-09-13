import React, { useState } from 'react';
import { X, Key, Radio, Volume2, ShieldCheck, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getSavedDeveloperToken,
  saveDeveloperToken,
  loginWithAppleMusic,
  logoutAppleMusic,
  isMusicKitConfigured
} from '../services/appleMusic';

export default function SettingsModal({
  isOpen,
  onClose,
  isAppleMusicAuthorized,
  onAuthStatusChange,
  isMusicKitLoading
}) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokenInput, setTokenInput] = useState(getSavedDeveloperToken());

  if (!isOpen) return null;

  const musicKitReady = isMusicKitConfigured();

  const handleSaveToken = () => {
    saveDeveloperToken(tokenInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearToken = () => {
    setTokenInput('');
    saveDeveloperToken('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAppleLogin = async () => {
    setAuthError('');
    setIsLoggingIn(true);
    try {
      if (isAppleMusicAuthorized) {
        await logoutAppleMusic();
        onAuthStatusChange(false);
      } else {
        const res = await loginWithAppleMusic();
        if (res.isAuthorized) {
          onAuthStatusChange(true);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication error with Apple Music.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Radio className="modal-icon" size={20} />
            <h2>Apple Music & App Settings</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Apple Music Connection Section */}
          <div className="settings-section">
            <h3 className="section-title">
              <Radio size={16} /> Apple Music Connection
            </h3>
            <p className="section-desc">
              {musicKitReady
                ? 'Apple Music is ready. Log in with your Apple ID to enjoy full catalog tracks and seamless integration.'
                : isMusicKitLoading
                ? 'Connecting to Apple Music services...'
                : 'Apple Music connection is being set up. The game works instantly with built-in preview audio.'}
            </p>

            <div className="auth-box">
              <div className="auth-status-indicator">
                <span className={`status-dot ${
                  isAppleMusicAuthorized ? 'online' :
                  musicKitReady ? 'ready' :
                  isMusicKitLoading ? 'loading' : 'preview'
                }`}></span>
                <span className="status-label">
                  {isAppleMusicAuthorized
                    ? 'Apple Music Subscriber: Active'
                    : musicKitReady
                    ? 'Ready — Log in to access full catalog'
                    : isMusicKitLoading
                    ? 'Connecting to Apple Music...'
                    : 'Mode: High-Fidelity Apple Preview Streams'}
                </span>
              </div>

              <button
                className={`login-action-btn ${isAppleMusicAuthorized ? 'disconnect' : 'connect'}`}
                onClick={handleAppleLogin}
                disabled={isLoggingIn || isMusicKitLoading || (!musicKitReady && !isAppleMusicAuthorized)}
              >
                {isLoggingIn
                  ? 'Connecting to Apple Music...'
                  : isAppleMusicAuthorized
                  ? 'Disconnect Apple Music'
                  : musicKitReady
                  ? 'Log in with Apple Music'
                  : 'Apple Music Not Available'}
              </button>
            </div>

            {authError && <div className="error-alert">{authError}</div>}
          </div>

          {/* Advanced: Custom Developer Token (collapsed by default) */}
          <div className="settings-section">
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Key size={16} />
              <span>Advanced: Custom Developer Token</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvanced && (
              <div className="advanced-content">
                <p className="section-desc">
                  Override the automatic server token with your own Apple MusicKit developer JWT. Only use this if you know what you're doing.
                </p>

                <div className="token-input-group">
                  <textarea
                    className="token-textarea"
                    rows={3}
                    placeholder="eyJhbGciOiJFUzI1NiIsImtpZCI6..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                  <div className="token-actions">
                    <button className="save-token-btn" onClick={handleSaveToken}>
                      {saveSuccess ? <Check size={16} /> : null}
                      <span>{saveSuccess ? 'Saved!' : 'Save Token'}</span>
                    </button>
                    {tokenInput && (
                      <button className="clear-token-btn" onClick={handleClearToken}>
                        <span>Clear Override</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Notice */}
          <div className="info-notice">
            <Info size={18} className="info-icon" />
            <div className="info-text">
              <strong>Instant Play:</strong> HitParade includes built-in UK Top 10 Apple preview audio samples, so the game is 100% playable immediately — Apple Music login adds full catalog streaming!
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
