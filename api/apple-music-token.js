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

import crypto from 'crypto';

// In-memory cache to avoid regenerating on every request within the same warm instance
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
 * Generate an ES256-signed Apple Music developer JWT
 *
 * Per Apple MusicKit documentation, the 'origin' claim is OPTIONAL.
 * When omitted, the developer token is valid across all domains (popsiq.com,
 * www.popsiq.com, hitparade.vercel.app, preview deployments, and localhost)
 * without triggering Apple Origin validation mismatches or /me/storefront 401 errors.
 */
function generateDeveloperToken({ teamId, keyId, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  // Token valid for 180 days (15,552,000 seconds — safely under Apple's 15,777,000s limit)
  const exp = now + 15552000;

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId.trim(),
  };

  // JWT Claims (no origin restriction so token works seamlessly everywhere)
  const claims = {
    iss: teamId.trim(),
    iat: now,
    exp: exp,
  };

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
  // Aggressively prevent client and CDN caching of tokens so updates take effect immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

  // Cache key based on config so token regenerates immediately if env vars change
  const currentConfigKey = `${teamId}:${keyId}:${privateKey.slice(0, 30)}`;

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
