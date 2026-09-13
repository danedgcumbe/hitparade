import React, { useState } from 'react';
import { X, Key, Radio, Volume2, ShieldCheck, Check, Info } from 'lucide-react';
import { getSavedDeveloperToken, saveDeveloperToken, loginWithAppleMusic, logoutAppleMusic } from '../services/appleMusic';

export default function SettingsModal({
  isOpen,
  onClose,
  isAppleMusicAuthorized,
  onAuthStatusChange
}) {
  const [tokenInput, setTokenInput] = useState(getSavedDeveloperToken());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleSaveToken = () => {
    saveDeveloperToken(tokenInput);
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
          {/* Apple Music Section */}
          <div className="settings-section">
            <h3 className="section-title">
              <Radio size={16} /> Apple Music Subscriber Status
            </h3>
            <p className="section-desc">
              Connect your Apple Music account to enjoy full catalog tracks and seamless Apple Music integration.
            </p>

            <div className="auth-box">
              <div className="auth-status-indicator">
                <span className={`status-dot ${isAppleMusicAuthorized ? 'online' : 'preview'}`}></span>
                <span className="status-label">
                  {isAppleMusicAuthorized
                    ? 'Apple Music Subscriber: Active'
                    : 'Mode: High-Fidelity Apple Preview Streams'}
                </span>
              </div>

              <button
                className={`login-action-btn ${isAppleMusicAuthorized ? 'disconnect' : 'connect'}`}
                onClick={handleAppleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn
                  ? 'Connecting to Apple Music...'
                  : isAppleMusicAuthorized
                  ? 'Disconnect Apple Music'
                  : 'Log in with Apple Music'}
              </button>
            </div>

            {authError && <div className="error-alert">{authError}</div>}
          </div>

          {/* Developer Token Input Section */}
          <div className="settings-section">
            <h3 className="section-title">
              <Key size={16} /> Apple MusicKit Developer JWT (Optional)
            </h3>
            <p className="section-desc">
              If you have your own Apple Developer MusicKit private key token, paste it here to authenticate MusicKit JS directly in your browser.
            </p>

            <div className="token-input-group">
              <textarea
                className="token-textarea"
                rows={3}
                placeholder="eyJhbGciOiJFUzI1NiIsImtpZCI6..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button className="save-token-btn" onClick={handleSaveToken}>
                {saveSuccess ? <Check size={16} /> : null}
                <span>{saveSuccess ? 'Saved!' : 'Save Token'}</span>
              </button>
            </div>
          </div>

          {/* Zero-Config Note */}
          <div className="info-notice">
            <Info size={18} className="info-icon" />
            <div className="info-text">
              <strong>Instant Play:</strong> HitParade includes built-in UK Top 10 Apple preview audio samples, so the game is 100% playable immediately even without entering a developer token!
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
