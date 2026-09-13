// Daily Challenge System — deterministic seeded PRNG for Wordle-style daily tracks
// Launch date: 2026-09-13 (Day 1)

const LAUNCH_DATE = '2026-09-13';

/**
 * Get today's date as YYYY-MM-DD string in UTC
 */
export function getTodayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Get the daily challenge number (days since launch)
 */
export function getDailyNumber(dateString = getTodayDateString()) {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateString + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Simple string hash (djb2 algorithm)
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned
}

/**
 * Mulberry32 — a fast 32-bit seeded PRNG
 * Returns a function that produces deterministic floats in [0, 1)
 */
function mulberry32(seed) {
  let t = seed | 0;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle driven by a seeded PRNG
 */
export function seededShuffle(array, seedString) {
  const rng = mulberry32(hashString(seedString));
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get the deterministic daily tracks for a given date.
 * All users calling this with the same date get the same tracks.
 */
export function getDailyTracks(allTracks, count = 5, dateString = getTodayDateString()) {
  const seed = `hitparade-daily-${dateString}`;
  const shuffled = seededShuffle(allTracks, seed);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get deterministic multiple-choice options for a daily round.
 * Uses dateString + roundIndex as seed so each round is different but consistent.
 */
export function getDailyChoices(allArtists, correctArtist, dateString, roundIndex) {
  const seed = `hitparade-choices-${dateString}-round${roundIndex}`;
  const decoys = seededShuffle(
    allArtists.filter((a) => a.toLowerCase() !== correctArtist.toLowerCase()),
    seed
  ).slice(0, 3);

  const options = [correctArtist, ...decoys];
  return seededShuffle(options, seed + '-order');
}

// ─── LocalStorage Helpers for Daily Completion ─────────────────────────

const DAILY_STORAGE_KEY = 'hitparade_daily';

/**
 * Check if the user has already completed today's daily challenge
 */
export function isDailyChallengeCompleted(dateString = getTodayDateString()) {
  try {
    const saved = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved);
    return data.date === dateString && data.completed === true;
  } catch {
    return false;
  }
}

/**
 * Get saved daily result (if any)
 */
export function getDailyChallengeResult(dateString = getTodayDateString()) {
  try {
    const saved = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (data.date === dateString) return data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save the daily challenge result
 */
export function saveDailyChallengeResult(dateString, result) {
  try {
    const payload = {
      date: dateString,
      completed: true,
      score: result.score,
      bestStreak: result.bestStreak,
      history: result.history,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage full
  }
}

/**
 * Get time until next daily reset (midnight UTC)
 */
export function getNextDailyResetTime() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow;
}

/**
 * Format remaining time as HH:MM:SS
 */
export function formatCountdown(targetDate) {
  const now = new Date();
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
