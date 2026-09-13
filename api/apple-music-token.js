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
//   APPLE_MUSIC_ORIGIN — (Optional) Comma-separated allowed origins

import crypto from 'crypto';

// In-memory cache to avoid regenerating on every request
let cachedToken = null;
let cachedTokenExpiry = 0;

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
 * Generate an ES256-signed Apple Music developer JWT
 */
function generateDeveloperToken({ teamId, keyId, privateKey, origins }) {
  const now = Math.floor(Date.now() / 1000);
  // Token valid for 180 days (Apple max is ~6 months / 15777000 seconds)
  const exp = now + 15777000;

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId,
  };

  // JWT Claims
  const claims = {
    iss: teamId,
    iat: now,
    exp: exp,
  };

  // Add origin claim if configured (recommended for web apps)
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
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

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

  // Handle escaped newlines in env var (Vercel sometimes stores \n as literal backslash-n)
  const privateKey = privateKeyEnv.replace(/\\n/g, '\n');

  // Parse optional origins
  const originsEnv = process.env.APPLE_MUSIC_ORIGIN;
  const origins = originsEnv
    ? originsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  // Return cached token if still valid (with 1 hour buffer)
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry > now + 3600) {
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

    return res.status(200).json({ token });
  } catch (err) {
    console.error('Failed to generate Apple Music developer token:', err);
    return res.status(500).json({
      error: 'Failed to generate developer token',
      details: err.message,
    });
  }
}
