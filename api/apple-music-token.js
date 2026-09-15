// Vercel Serverless Function: Apple Music Developer Token Generator
// Endpoint: GET /api/apple-music-token
//
// Generates an ES256-signed JWT for MusicKit JS using your Apple Developer credentials.
// Credentials are read from Vercel environment variables (never committed to code).
//
// Required env vars:
//   APPLE_TEAM_ID     — 10-char Apple Developer Team ID
//   APPLE_KEY_ID      — 10-char MusicKit Key ID  
//   APPLE_PRIVATE_KEY — Full .p8 private key contents (with newlines)
//   APPLE_MUSIC_ORIGIN — (Optional) Comma-separated allowed origins or omit/set '*' for universal access

import crypto from 'crypto';

// In-memory cache to avoid regenerating on every request
let cachedToken = null;
let cachedTokenExpiry = 0;
let cachedConfigKey = '';

/**
 * Base64url encode a buffer (JWT-safe base64 without padding)
 */
function base64urlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Parse and normalize allowed origins for the Apple developer token JWT.
 * Apple strictly compares the request's Origin header against the origin claim array.
 * Trailing slashes (e.g. "https://domain.com/") cause 401 Unauthorized errors because
 * browsers RFC 6454 Origin headers never include trailing slashes.
 *
 * If origins is omitted or set to wildcard/all/none, we return an empty array.
 * When the origin claim is omitted from the JWT, Apple permits the token from all domains.
 */
function parseAndNormalizeOrigins(originsEnv) {
  if (!originsEnv) return [];
  const trimmed = originsEnv.trim();
  if (
    trimmed === '*' ||
    trimmed.toLowerCase() === 'all' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'false'
  ) {
    return [];
  }

  const originsSet = new Set();
  const list = trimmed.split(',').map((o) => o.trim()).filter(Boolean);

  for (let origin of list) {
    // Strip all trailing slashes
    origin = origin.replace(/\/+$/, '');
    if (!origin) continue;

    // Ensure protocol
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      origin = `https://${origin}`;
    }

    originsSet.add(origin);

    // Automatically expand apex <-> www variations
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname;
      if (host.startsWith('www.')) {
        const apex = `${parsed.protocol}//${host.slice(4)}${parsed.port ? ':' + parsed.port : ''}`;
        originsSet.add(apex);
      } else if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        const www = `${parsed.protocol}//www.${host}${parsed.port ? ':' + parsed.port : ''}`;
        originsSet.add(www);
      }
    } catch (e) {
      // Ignore URL parse error
    }
  }

  // Always include standard production origins when origin restriction is enabled
  originsSet.add('https://popsiq.com');
  originsSet.add('https://www.popsiq.com');
  originsSet.add('https://hitparade.vercel.app');

  return Array.from(originsSet);
}

/**
 * Generate an ES256-signed Apple Music developer JWT
 */
function generateDeveloperToken({ teamId, keyId, privateKey, origins }) {
  const now = Math.floor(Date.now() / 1000);
  // Token valid for 180 days (15,552,000 seconds — safely under Apple's 15,777,000s hard limit to prevent clock skew rejection)
  const exp = now + 15552000;

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId.trim(),
  };

  // JWT Claims
  const claims = {
    iss: teamId.trim(),
    iat: now,
    exp: exp,
  };

  // Add origin claim only if configured (optional in Apple MusicKit spec)
  if (origins && origins.length > 0) {
    claims.origin = origins;
  }

  // Encode header and claims
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaims = base64urlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  // Sign with ES256 (ECDSA P-256 + SHA-256)
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  // The private key from .p8 is in PKCS#8 PEM format
  const signature = sign.sign(
    { key: privateKey, dsaEncoding: 'ieee-p1363' },
  );

  const encodedSignature = base64urlEncode(signature);

  return {
    token: `${signingInput}.${encodedSignature}`,
    expiresAt: exp,
  };
}

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  // Avoid CDN caching of stale JWT tokens
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Read credentials from environment
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyEnv = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKeyEnv) {
    return res.status(500).json({
      error: 'Apple Music credentials not configured',
      details: 'Set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY in Vercel environment variables.',
    });
  }

  // Handle escaped newlines, quotes, or carriage returns in env var
  let privateKey = privateKeyEnv.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

  // Parse and normalize origins (strips trailing slashes, adds apex & www variants)
  const origins = parseAndNormalizeOrigins(process.env.APPLE_MUSIC_ORIGIN);

  // Cache key based on config so token regenerates immediately when env vars change
  const currentConfigKey = `${teamId}:${keyId}:${origins.join(',')}`;

  // Return cached token if still valid (with 1 hour buffer) and config hasn't changed
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedToken &&
    cachedTokenExpiry > now + 3600 &&
    cachedConfigKey === currentConfigKey
  ) {
    return res.status(200).json({ token: cachedToken });
  }

  try {
    const { token, expiresAt } = generateDeveloperToken({
      teamId,
      keyId,
      privateKey,
      origins,
    });

    // Cache the generated token
    cachedToken = token;
    cachedTokenExpiry = expiresAt;
    cachedConfigKey = currentConfigKey;

    return res.status(200).json({ token });
  } catch (err) {
    console.error('Failed to generate Apple Music developer token:', err);
    return res.status(500).json({
      error: 'Failed to generate developer token',
      details: err.message,
    });
  }
}
