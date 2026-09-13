// Apple MusicKit JS SDK Service & Fallback Audio Player Manager

const DEV_TOKEN_STORAGE_KEY = 'hitparade_apple_dev_token';

let musicKitInstance = null;
let isMusicKitReady = false;

/**
 * Get stored Apple MusicKit Developer Token if user provided one
 */
export function getSavedDeveloperToken() {
  return localStorage.getItem(DEV_TOKEN_STORAGE_KEY) || '';
}

/**
 * Save custom Apple Developer Token
 */
export function saveDeveloperToken(token) {
  if (token) {
    localStorage.setItem(DEV_TOKEN_STORAGE_KEY, token.trim());
  } else {
    localStorage.removeItem(DEV_TOKEN_STORAGE_KEY);
  }
}

/**
 * Initialize Apple MusicKit JS if SDK is loaded and token is present
 */
export async function initializeMusicKit(customToken = null) {
  const token = customToken || getSavedDeveloperToken();
  
  if (typeof window === 'undefined' || !window.MusicKit) {
    console.log('Apple MusicKit SDK not loaded yet');
    return null;
  }

  try {
    if (token) {
      await window.MusicKit.configure({
        developerToken: token,
        app: {
          name: 'HitParade UK Top 10s',
          build: '1.0.0'
        }
      });
      musicKitInstance = window.MusicKit.getInstance();
      isMusicKitReady = true;
      console.log('Apple MusicKit configured successfully');
      return musicKitInstance;
    }
  } catch (err) {
    console.warn('Failed to configure Apple MusicKit with provided token:', err);
  }

  return null;
}

/**
 * Check if Apple Music user is currently authorized
 */
export function isUserAuthorized() {
  if (!musicKitInstance) return false;
  return musicKitInstance.isAuthorized;
}

/**
 * Authorize / Login user with their Apple Music subscription account
 */
export async function loginWithAppleMusic() {
  if (!musicKitInstance) {
    const token = getSavedDeveloperToken();
    if (!token) {
      throw new Error('Please configure an Apple Music Developer Token in Settings to log into Apple Music.');
    }
    await initializeMusicKit(token);
  }

  if (musicKitInstance) {
    const userToken = await musicKitInstance.authorize();
    return {
      isAuthorized: true,
      userToken
    };
  }
  throw new Error('MusicKit instance not available.');
}

/**
 * Unauthorize / Logout Apple Music session
 */
export async function logoutAppleMusic() {
  if (musicKitInstance && musicKitInstance.isAuthorized) {
    await musicKitInstance.unauthorize();
  }
}

/**
 * Get current MusicKit instance
 */
export function getMusicKit() {
  return musicKitInstance;
}
