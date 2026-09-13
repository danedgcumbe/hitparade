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
 * Fetch live Apple preview URL & artwork for any track query with memory & localStorage caching
 */
export async function fetchAppleMusicTrackMetadata(query) {
  if (!query) return null;
  const cleanQuery = query.trim();
  const cacheKey = `itunes_meta_${cleanQuery.toLowerCase()}`;

  // 1. Check in-memory cache
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }

  // 2. Check localStorage cache
  try {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      metadataCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {
    // LocalStorage ignored
  }

  // 3. Fetch from Apple Search API (UK store)
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&country=gb&media=music&entity=song&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      const result = {
        previewUrl: track.previewUrl,
        artworkUrl:
          track.artworkUrl100?.replace('100x100bb.jpg', '600x600bb.jpg') ||
          track.artworkUrl100,
        trackViewUrl: track.trackViewUrl,
        artistName: track.artistName,
        trackName: track.trackName,
        collectionName: track.collectionName,
        appleTrackId: track.trackId
      };

      // Save in cache
      metadataCache.set(cacheKey, result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        // storage full
      }
      return result;
    }
  } catch (err) {
    console.warn('Apple Search API lookup error for query:', cleanQuery, err);
  }
  return null;
}

/**
 * Preload metadata for an array of tracks in the background
 */
export function preloadTracksMetadata(tracks) {
  if (!tracks || !Array.isArray(tracks)) return;
  tracks.forEach((track, index) => {
    // Stagger preloads slightly
    setTimeout(() => {
      fetchAppleMusicTrackMetadata(track.appleMusicQuery || `${track.artist} ${track.title}`);
    }, index * 250);
  });
}
