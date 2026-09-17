// Official UK Top 10 Singles Complete Catalogue (1952 - 2024)
// Sourced from Official Charts via Wikipedia lists of UK Top 10 Singles
import rawTracks from '../data/ukTop10Singles.json';
import rawArtists from '../data/ukTop10Artists.json';

export const ERAS = {
  ALL: 'all',
  EARLY_50S_60S: '50s-60s',
  CLASSIC: '70s-80s',
  BRITPOP_90S_00S: '90s-00s',
  HITS_2010S: '2010s',
  MODERN_2020S: '2020s'
};

export const ERA_LABELS = {
  [ERAS.ALL]: '🇬🇧 All-Time UK Top 10s (1952–2024)',
  [ERAS.EARLY_50S_60S]: '📻 50s & 60s Pioneers',
  [ERAS.CLASSIC]: '🎸 70s & 80s Icons',
  [ERAS.BRITPOP_90S_00S]: '💿 90s & 00s Anthems',
  [ERAS.HITS_2010S]: '✨ 2010s Pop & Dance',
  [ERAS.MODERN_2020S]: '🔥 2020s Chart Toppers'
};

export const UK_TOP_10_TRACKS = rawTracks;
export const ALL_UK_ARTISTS = rawArtists;

// In-memory runtime cache for Apple Music metadata
const metadataCache = new Map();

/**
 * Compute consistent cache key from a track object or string query
 */
function getCacheKey(trackOrQuery) {
  if (!trackOrQuery) return '';
  if (typeof trackOrQuery === 'string') {
    return `itunes_meta_${trackOrQuery.trim().toLowerCase()}`;
  }
  if (trackOrQuery.id) {
    return `itunes_meta_id_${trackOrQuery.id}`;
  }
  const query = trackOrQuery.appleMusicQuery || `${trackOrQuery.artist} ${trackOrQuery.title}`;
  return `itunes_meta_${query.trim().toLowerCase()}`;
}

/**
 * Synchronously retrieve cached track metadata from memory or localStorage
 */
export function getCachedTrackMetadata(trackOrQuery) {
  const cacheKey = getCacheKey(trackOrQuery);
  if (!cacheKey) return null;

  // 1. In-memory
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }

  // 2. localStorage
  try {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.previewUrl) {
        metadataCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (e) {
    // localStorage unavailable or full
  }

  return null;
}

/**
 * Low-level helper to query iTunes Search API and extract a track with audio preview
 */
async function queryItunesApi(searchTerm, country = 'gb', limit = 10) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      searchTerm
    )}&country=${country}&media=music&entity=song&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }

    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      // Prioritize results that explicitly have a previewUrl
      const candidate = data.results.find((r) => r.previewUrl) || data.results[0];
      if (candidate && candidate.previewUrl) {
        return {
          previewUrl: candidate.previewUrl,
          artworkUrl:
            candidate.artworkUrl100?.replace('100x100bb.jpg', '600x600bb.jpg') ||
            candidate.artworkUrl100,
          trackViewUrl: candidate.trackViewUrl,
          artistName: candidate.artistName,
          trackName: candidate.trackName,
          collectionName: candidate.collectionName,
          appleTrackId: candidate.trackId
        };
      }
    }
  } catch (err) {
    console.warn(`iTunes search error for "${searchTerm}" in ${country}:`, err);
  }
  return null;
}

/**
 * Fetch live Apple preview URL & artwork for any track query with memory & localStorage caching
 * Supports string queries or track objects, with intelligent fallback strategies.
 */
export async function fetchAppleMusicTrackMetadata(trackOrQuery) {
  if (!trackOrQuery) return null;

  // 1. Check synchronous cache first
  const cached = getCachedTrackMetadata(trackOrQuery);
  if (cached) return cached;

  const cacheKey = getCacheKey(trackOrQuery);

  // 2. Build list of candidate search queries
  const candidates = [];
  if (typeof trackOrQuery === 'string') {
    const clean = trackOrQuery.trim();
    candidates.push(clean);
    if (clean.includes('/')) {
      candidates.push(clean.split('/')[0].trim());
    }
  } else {
    const { artist, title, appleMusicQuery } = trackOrQuery;
    if (appleMusicQuery) candidates.push(appleMusicQuery.trim());
    if (artist && title) {
      candidates.push(`${artist} ${title}`.trim());
      // Handle double A-sides (e.g., "Im Only Sleeping/Off On Holiday")
      if (title.includes('/')) {
        candidates.push(`${artist} ${title.split('/')[0].trim()}`);
      }
      // Handle parenthetical subtitles
      if (title.includes('(') || title.includes(')')) {
        const withoutParens = title.replace(/\(.*?\)/g, '').trim();
        if (withoutParens) {
          candidates.push(`${artist} ${withoutParens}`);
        }
      }
    }
  }

  const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

  // 3. Search with candidates across GB store, then fallback to US store
  let result = null;

  // First pass: try candidates in primary GB store with limit=10
  for (const query of uniqueCandidates) {
    result = await queryItunesApi(query, 'gb', 10);
    if (result) break;
  }

  // Second pass: if still no preview, try candidates in US store
  if (!result) {
    for (const query of uniqueCandidates) {
      result = await queryItunesApi(query, 'us', 10);
      if (result) break;
    }
  }

  // 4. Cache and return if found
  if (result && cacheKey) {
    metadataCache.set(cacheKey, result);
    // Also cache by string query if track object was provided
    if (typeof trackOrQuery !== 'string') {
      const stringKey = getCacheKey(
        trackOrQuery.appleMusicQuery || `${trackOrQuery.artist} ${trackOrQuery.title}`
      );
      if (stringKey && stringKey !== cacheKey) {
        metadataCache.set(stringKey, result);
      }
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      // localStorage quota exceeded
    }
    return result;
  }

  return null;
}

/**
 * Preload metadata for an array of tracks in the background
 */
export function preloadTracksMetadata(tracks) {
  if (!tracks || !Array.isArray(tracks)) return;
  tracks.forEach((track, index) => {
    // Stagger preloads slightly to avoid hitting Apple rate limits
    setTimeout(() => {
      fetchAppleMusicTrackMetadata(track);
    }, index * 200);
  });
}

