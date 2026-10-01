import React, { useState } from 'react';
import { X, Radio } from 'lucide-react';
import {
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
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const musicKitReady = isMusicKitConfigured();

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
              {isAppleMusicAuthorized
                ? 'Your Apple Music subscription is connected and active.'
                : 'An Apple Music subscription is required to play PopsIQ. Sign in to stream full-quality audio snippets.'}
            </p>

            <div className="auth-box">
              <div className="auth-status-indicator">
                <span
                  className={`status-dot ${
                    isAppleMusicAuthorized ? 'online' : 'preview'
                  }`}
                ></span>
                <span className="status-label">
                  {isAppleMusicAuthorized
                    ? 'Apple Music Subscriber: Active'
                    : 'Audio Mode: Free Apple Music 30s Previews'}
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
                      ? 'Sign in with Apple Music'
                      : isMusicKitLoading
                        ? 'Connecting...'
                        : 'Apple Music Sign-In Unavailable'}
              </button>
            </div>

            {authError && <div className="error-alert">{authError}</div>}
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

