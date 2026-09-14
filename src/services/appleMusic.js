// Apple MusicKit JS SDK Service & Fallback Audio Player Manager
// Now with automatic server-side developer token fetching

const DEV_TOKEN_STORAGE_KEY = 'hitparade_apple_dev_token';
const TOKEN_API_ENDPOINT = '/api/apple-music-token';

let musicKitInstance = null;
let isMusicKitReady = false;
let tokenFetchPromise = null;

/**
 * Get stored Apple MusicKit Developer Token (manual override) if user provided one
 */
export function getSavedDeveloperToken() {
  return localStorage.getItem(DEV_TOKEN_STORAGE_KEY) || '';
}

/**
 * Save custom Apple Developer Token (manual override for power users)
 */
export function saveDeveloperToken(token) {
  if (token) {
    localStorage.setItem(DEV_TOKEN_STORAGE_KEY, token.trim());
  } else {
    localStorage.removeItem(DEV_TOKEN_STORAGE_KEY);
  }
}

/**
 * Fetch the developer token from our server-side API endpoint.
 * Returns the JWT string, or null if unavailable.
 * Caches the fetch promise to avoid duplicate requests.
 */
export async function fetchDeveloperToken() {
  // If user has a manual override token, prefer that
  const savedToken = getSavedDeveloperToken();
  if (savedToken) {
    return savedToken;
  }

  // Avoid duplicate fetches
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const res = await fetch(TOKEN_API_ENDPOINT);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn('Failed to fetch developer token from server:', errorData);
        return null;
      }
      const data = await res.json();
      return data.token || null;
    } catch (err) {
      console.warn('Error fetching developer token from server:', err);
      return null;
    }
  })();

  const result = await tokenFetchPromise;
  // Allow re-fetch on next call if it failed
  if (!result) {
    tokenFetchPromise = null;
  }
  return result;
}

/**
 * Initialize Apple MusicKit JS.
 * 1. If a custom token is provided, use it directly.
 * 2. Otherwise, fetch the developer token from our server API.
 * 3. Configure MusicKit with the token.
 *
 * Returns the MusicKit instance or null.
 */
export async function initializeMusicKit(customToken = null) {
  if (typeof window === 'undefined' || !window.MusicKit) {
    console.log('Apple MusicKit SDK not loaded yet');
    return null;
  }

  try {
    // Determine which token to use
    const token = customToken || await fetchDeveloperToken();

    if (!token) {
      console.log('No Apple Music developer token available (server API may not be configured yet)');
      return null;
    }

    await window.MusicKit.configure({
      developerToken: token,
      app: {
        name: 'PopsIQ UK Top 10s',
        build: '1.0.0'
      }
    });
    musicKitInstance = window.MusicKit.getInstance();
    isMusicKitReady = true;
    console.log('Apple MusicKit configured successfully');
    return musicKitInstance;
  } catch (err) {
    console.warn('Failed to configure Apple MusicKit:', err);
    return null;
  }
}

/**
 * Check if MusicKit has been configured successfully
 */
export function isMusicKitConfigured() {
  return isMusicKitReady && musicKitInstance != null;
}

/**
 * Check if Apple Music user is currently authorized
 */
export function isUserAuthorized() {
  if (!musicKitInstance) return false;
  return musicKitInstance.isAuthorized;
}

/**
 * Authorize / Login user with their Apple Music subscription account.
 * If MusicKit isn't configured yet, attempts to initialize it first.
 */
export async function loginWithAppleMusic() {
  if (!musicKitInstance) {
    // Try to initialize MusicKit (will auto-fetch token from server)
    await initializeMusicKit();
  }

  if (!musicKitInstance) {
    throw new Error(
      'Apple Music is not configured. The server may not have Apple Developer credentials set up yet.'
    );
  }

  const userToken = await musicKitInstance.authorize();
  return {
    isAuthorized: true,
    userToken
  };
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
