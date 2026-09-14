import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import AudioSnippetPlayer, { SNIPPET_DURATIONS } from './components/AudioSnippetPlayer';
import ArtistGuessInput from './components/ArtistGuessInput';
import RoundResultModal from './components/RoundResultModal';
import SettingsModal from './components/SettingsModal';
import GameSummaryModal from './components/GameSummaryModal';
import AppleMusicGate from './components/AppleMusicGate';

import {
  UK_TOP_10_TRACKS,
  ALL_UK_ARTISTS,
  ERAS,
  ERA_LABELS,
  fetchAppleMusicTrackMetadata,
  preloadTracksMetadata
} from './services/ukChartsCatalog';

import {
  getTodayDateString,
  getDailyNumber,
  getDailyTracks,
  getDailyChoices,
  isDailyChallengeCompleted,
  getDailyChallengeResult,
  saveDailyChallengeResult,
  seededShuffle
} from './services/dailySeed';

import {
  initializeMusicKit,
  isUserAuthorized,
  isMusicKitConfigured,
  loginWithAppleMusic
} from './services/appleMusic';

import {
  playSuccessSound,
  playWrongSound,
  playUnlockSound
} from './services/soundEffects';

const ROUNDS_PER_GAME = 5;
const MAX_ATTEMPTS = SNIPPET_DURATIONS.length; // 5 attempts (1.5s, 3s, 6s, 10s, 15s)

export default function App() {
  // Challenge Mode: 'daily' or 'freeplay'
  const [challengeMode, setChallengeMode] = useState('daily');

  // Game & Mode State
  const [selectedEra, setSelectedEra] = useState(ERAS.ALL);
  const [gameMode, setGameMode] = useState('choice'); // 'choice' or 'pro'
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Round State
  const [roundIndex, setRoundIndex] = useState(0);
  const [trackQueue, setTrackQueue] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guessesHistory, setGuessesHistory] = useState([]);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [isGameFinished, setIsGameFinished] = useState(false);

  // Daily-specific state
  const [dailyAlreadyCompleted, setDailyAlreadyCompleted] = useState(false);
  const [savedDailyResult, setSavedDailyResult] = useState(null);

  // Modals & Apple Music Status
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAppleMusicAuthorized, setIsAppleMusicAuthorized] = useState(false);
  const [isMusicKitLoading, setIsMusicKitLoading] = useState(true);
  const [liveTrackInfo, setLiveTrackInfo] = useState(null);

  // Initialize Apple MusicKit on mount (now fetches developer token from server)
  useEffect(() => {
    let cancelled = false;

    async function setupMusicKit() {
      setIsMusicKitLoading(true);
      try {
        // Wait briefly for MusicKit SDK script to load
        let retries = 0;
        while (!window.MusicKit && retries < 20) {
          await new Promise((r) => setTimeout(r, 250));
          retries++;
        }
        await initializeMusicKit();
        if (!cancelled) {
          setIsAppleMusicAuthorized(isUserAuthorized());
        }
      } catch (err) {
        console.warn('MusicKit setup error:', err);
      } finally {
        if (!cancelled) {
          setIsMusicKitLoading(false);
        }
      }
    }

    setupMusicKit();
    return () => { cancelled = true; };
  }, []);

  // Check daily completion on mount and mode switch
  useEffect(() => {
    if (challengeMode === 'daily') {
      const today = getTodayDateString();
      const completed = isDailyChallengeCompleted(today);
      setDailyAlreadyCompleted(completed);
      if (completed) {
        const result = getDailyChallengeResult(today);
        setSavedDailyResult(result);
        setIsGameFinished(true);
      }
    }
  }, [challengeMode]);

  // ─── initNewGame ────────────────────────────────────────────────────

  const initNewGame = useCallback(
    (eraToUse = selectedEra, mode = challengeMode) => {
      let gameQueue;

      if (mode === 'daily') {
        const today = getTodayDateString();
        // Check if already completed
        if (isDailyChallengeCompleted(today)) {
          setDailyAlreadyCompleted(true);
          setSavedDailyResult(getDailyChallengeResult(today));
          setIsGameFinished(true);
          return;
        }
        gameQueue = getDailyTracks(UK_TOP_10_TRACKS, ROUNDS_PER_GAME, today);
      } else {
        // Freeplay mode — random shuffle filtered by era
        let filtered = UK_TOP_10_TRACKS;
        if (eraToUse !== ERAS.ALL) {
          filtered = UK_TOP_10_TRACKS.filter((t) => t.era === eraToUse);
        }
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        gameQueue = shuffled.slice(0, Math.min(ROUNDS_PER_GAME, shuffled.length));
      }

      preloadTracksMetadata(gameQueue);
      setTrackQueue(gameQueue);
      setRoundIndex(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setGameHistory([]);
      setIsGameFinished(false);
      setDailyAlreadyCompleted(false);
      setSavedDailyResult(null);
      resetRoundState(0, gameQueue);
    },
    [selectedEra, challengeMode]
  );

  const resetRoundState = (rIndex, queue = trackQueue) => {
    setCurrentAttempt(0);
    setGuessesHistory([]);
    setIsRoundOver(false);
    setIsCorrect(false);
    setEarnedPoints(0);
    setLiveTrackInfo(null);

    const track = queue[rIndex];
    if (track) {
      fetchAppleMusicTrackMetadata(track.appleMusicQuery || `${track.artist} ${track.title}`).then(
        (meta) => {
          if (meta) {
            setLiveTrackInfo(meta);
          }
        }
      );
    }
  };

  // Start game on mount, era change, or mode change
  useEffect(() => {
    initNewGame(selectedEra, challengeMode);
  }, [selectedEra, challengeMode, initNewGame]);

  const currentTrack = trackQueue[roundIndex] || UK_TOP_10_TRACKS[0];

  // Active artwork & preview URL (with Apple Music dynamic metadata fallback)
  const activePreviewUrl =
    liveTrackInfo?.previewUrl || currentTrack.fallbackPreview;
  const activeArtworkUrl =
    liveTrackInfo?.artworkUrl || currentTrack.artworkUrl;

  // Generate 4 multiple-choice options for current track
  const currentChoices = useMemo(() => {
    if (!currentTrack) return [];
    const correctArtist = currentTrack.artist;

    if (challengeMode === 'daily') {
      // Deterministic choices for daily mode
      const today = getTodayDateString();
      return getDailyChoices(ALL_UK_ARTISTS, correctArtist, today, roundIndex);
    }

    // Freeplay mode — random choices
    const decoys = ALL_UK_ARTISTS.filter(
      (a) => a.toLowerCase() !== correctArtist.toLowerCase()
    )
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const list = [correctArtist, ...decoys];
    return list.sort(() => Math.random() - 0.5);
  }, [currentTrack, challengeMode, roundIndex]);

  // Handle Guess Submission
  const handleGuess = (guessedArtist) => {
    if (isRoundOver) return;

    const normalize = (str) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const correctNorm = normalize(currentTrack.artist);
    const guessNorm = normalize(guessedArtist);

    const isMatch =
      correctNorm === guessNorm ||
      correctNorm.includes(guessNorm) ||
      guessNorm.includes(correctNorm);

    if (isMatch) {
      // Correct Guess!
      playSuccessSound();
      const pointsLadder = [1000, 750, 500, 350, 200];
      const basePoints = pointsLadder[currentAttempt] || 150;
      const streakMultiplier = 1 + streak * 0.1; // +10% per streak
      const totalPoints = Math.round(basePoints * streakMultiplier);

      const newStreak = streak + 1;
      setScore((prev) => prev + totalPoints);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      setIsCorrect(true);
      setEarnedPoints(totalPoints);
      setIsRoundOver(true);

      const secondsUsed = SNIPPET_DURATIONS[currentAttempt];
      setGuessesHistory((prev) => [
        ...prev,
        { text: guessedArtist, isCorrect: true, seconds: secondsUsed }
      ]);

      setGameHistory((prev) => [
        ...prev,
        {
          track: currentTrack,
          isCorrect: true,
          earnedPoints: totalPoints,
          secondsUsed
        }
      ]);
    } else {
      // Incorrect Guess
      playWrongSound();

      // In choice mode, any guess is FINAL — one shot only
      if (gameMode === 'choice') {
        setGuessesHistory((prev) => [
          ...prev,
          { text: guessedArtist, isCorrect: false }
        ]);
        setIsCorrect(false);
        setEarnedPoints(0);
        setStreak(0);
        setIsRoundOver(true);

        setGameHistory((prev) => [
          ...prev,
          {
            track: currentTrack,
            isCorrect: false,
            earnedPoints: 0,
            secondsUsed: SNIPPET_DURATIONS[currentAttempt] || 15
          }
        ]);
      } else {
        // Pro mode: multiple guess attempts allowed
        const nextAttempt = currentAttempt + 1;
        const updatedGuesses = [
          ...guessesHistory,
          { text: guessedArtist, isCorrect: false }
        ];
        setGuessesHistory(updatedGuesses);

        if (nextAttempt >= MAX_ATTEMPTS) {
          // Out of attempts! Round failed
          setIsCorrect(false);
          setEarnedPoints(0);
          setStreak(0);
          setIsRoundOver(true);

          setGameHistory((prev) => [
            ...prev,
            {
              track: currentTrack,
              isCorrect: false,
              earnedPoints: 0,
              secondsUsed: 15
            }
          ]);
        } else {
          // Unlock next segment duration
          setCurrentAttempt(nextAttempt);
          playUnlockSound();
        }
      }
    }
  };

  // Handle Skip / Unlock more audio
  const handleSkip = () => {
    if (isRoundOver) return;

    const nextAttempt = currentAttempt + 1;

    if (gameMode === 'choice') {
      // Choice mode: skip just unlocks more audio, no guess history entry
      if (nextAttempt >= MAX_ATTEMPTS) {
        // All snippets heard without guessing — round lost
        setIsCorrect(false);
        setEarnedPoints(0);
        setStreak(0);
        setIsRoundOver(true);

        setGameHistory((prev) => [
          ...prev,
          {
            track: currentTrack,
            isCorrect: false,
            earnedPoints: 0,
            secondsUsed: 15
          }
        ]);
      } else {
        setCurrentAttempt(nextAttempt);
      }
    } else {
      // Pro mode: skip counts as a used attempt
      const updatedGuesses = [
        ...guessesHistory,
        { text: 'Skipped (+seconds)', isCorrect: false, isSkipped: true }
      ];
      setGuessesHistory(updatedGuesses);

      if (nextAttempt >= MAX_ATTEMPTS) {
        // Reveal answer
        setIsCorrect(false);
        setEarnedPoints(0);
        setStreak(0);
        setIsRoundOver(true);

        setGameHistory((prev) => [
          ...prev,
          {
            track: currentTrack,
            isCorrect: false,
            earnedPoints: 0,
            secondsUsed: 15
          }
        ]);
      } else {
        setCurrentAttempt(nextAttempt);
      }
    }
  };

  // Proceed to next round
  const handleNextRound = () => {
    const nextRound = roundIndex + 1;
    if (nextRound < trackQueue.length) {
      setRoundIndex(nextRound);
      resetRoundState(nextRound);
    } else {
      // Game finished
      if (challengeMode === 'daily') {
        // Save daily result
        const finalScore = score + earnedPoints;
        saveDailyChallengeResult(getTodayDateString(), {
          score: finalScore,
          bestStreak,
          history: [
            ...gameHistory,
            // the last round was already added in handleGuess
          ]
        });
        setDailyAlreadyCompleted(true);
      }
      setIsGameFinished(true);
    }
  };

  // When game finishes (state update), save daily result
  useEffect(() => {
    if (isGameFinished && challengeMode === 'daily' && !dailyAlreadyCompleted && gameHistory.length > 0) {
      saveDailyChallengeResult(getTodayDateString(), {
        score,
        bestStreak,
        history: gameHistory
      });
      setDailyAlreadyCompleted(true);
      setSavedDailyResult({ score, bestStreak, history: gameHistory, date: getTodayDateString() });
    }
  }, [isGameFinished]);

  // Switch between daily and freeplay
  const handleSwitchMode = (newMode) => {
    setChallengeMode(newMode);
    setIsGameFinished(false);
  };

  // Apple Music Auth Button click
  const handleAppleAuthClick = async () => {
    if (isAppleMusicAuthorized) {
      setIsSettingsOpen(true);
    } else {
      try {
        await loginWithAppleMusic();
        setIsAppleMusicAuthorized(true);
      } catch (e) {
        setIsSettingsOpen(true);
      }
    }
  };

  // Gate login handler
  const handleGateLogin = async () => {
    const res = await loginWithAppleMusic();
    if (res.isAuthorized) {
      setIsAppleMusicAuthorized(true);
    }
  };

  const todayDateString = getTodayDateString();
  const dailyNumber = getDailyNumber(todayDateString);

  // Show login gate if user is not authorized
  if (!isAppleMusicAuthorized) {
    return (
      <AppleMusicGate
        isMusicKitLoading={isMusicKitLoading}
        isMusicKitConfigured={isMusicKitConfigured()}
        onLogin={handleGateLogin}
      />
    );
  }

  return (
    <div className="app-root">
      {/* Dynamic Ambient Background Glow */}
      <div
        className="ambient-backdrop"
        style={{
          backgroundImage: activeArtworkUrl ? `radial-gradient(circle at 50% 30%, rgba(250, 45, 72, 0.18), transparent 70%), url(${activeArtworkUrl})` : undefined
        }}
      />

      <div className="app-layout">
        {/* Header Bar */}
        <Header
          score={score}
          streak={streak}
          bestStreak={bestStreak}
          roundNumber={roundIndex + 1}
          totalRounds={trackQueue.length || ROUNDS_PER_GAME}
          selectedEra={selectedEra}
          onSelectEra={(newEra) => {
            setSelectedEra(newEra);
          }}
          gameMode={gameMode}
          onToggleGameMode={() =>
            setGameMode((m) => (m === 'choice' ? 'pro' : 'choice'))
          }
          onOpenSettings={() => setIsSettingsOpen(true)}
          isAppleMusicAuthorized={isAppleMusicAuthorized}
          onAppleMusicAuthClick={handleAppleAuthClick}
          challengeMode={challengeMode}
          onSwitchChallengeMode={handleSwitchMode}
          dailyNumber={dailyNumber}
        />

        {/* Main Stage */}
        <main className="main-content">
          <div className="quiz-card">
            {/* Header / Intro banner */}
            <div className="quiz-card-header">
              <div className="quiz-title-box">
                <span className="quiz-subtitle">
                  {challengeMode === 'daily'
                    ? `DAILY CHALLENGE #${dailyNumber}`
                    : 'UK TOP 10s CHALLENGE'}
                </span>
                <h1 className="quiz-headline">Guess The UK Chart Artist</h1>
              </div>
              <div className="era-badge-pill">
                {challengeMode === 'daily'
                  ? '🇬🇧 Daily Challenge'
                  : ERA_LABELS[selectedEra]}
              </div>
            </div>

            {/* Audio Snippet Player */}
            <AudioSnippetPlayer
              previewUrl={activePreviewUrl}
              currentAttempt={currentAttempt}
              maxAttempts={MAX_ATTEMPTS}
              isRoundOver={isRoundOver}
              isGameFinished={isGameFinished}
            />

            {/* Guess Input & Choices or Reveal Modal */}
            {!isRoundOver ? (
              <ArtistGuessInput
                mode={gameMode}
                choices={currentChoices}
                onSubmitGuess={handleGuess}
                onSkip={handleSkip}
                guessesHistory={guessesHistory}
                maxAttempts={MAX_ATTEMPTS}
                currentAttempt={currentAttempt}
                isRoundOver={isRoundOver}
                hints={currentTrack.hints}
                year={currentTrack.year}
                ukPeak={currentTrack.ukPeak}
              />
            ) : (
              <RoundResultModal
                isCorrect={isCorrect}
                earnedPoints={earnedPoints}
                currentTrack={{
                  ...currentTrack,
                  artworkUrl: activeArtworkUrl,
                  trackViewUrl: liveTrackInfo?.trackViewUrl
                }}
                secondsUsed={SNIPPET_DURATIONS[currentAttempt] || 15}
                onNextRound={handleNextRound}
                isLastRound={roundIndex >= trackQueue.length - 1}
                onShowSummary={() => setIsGameFinished(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isAppleMusicAuthorized={isAppleMusicAuthorized}
        onAuthStatusChange={(status) => setIsAppleMusicAuthorized(status)}
        isMusicKitLoading={isMusicKitLoading}
      />

      {/* Game Complete Summary Modal */}
      {isGameFinished && (
        <GameSummaryModal
          score={savedDailyResult ? savedDailyResult.score : score}
          bestStreak={savedDailyResult ? savedDailyResult.bestStreak : bestStreak}
          history={savedDailyResult ? savedDailyResult.history : gameHistory}
          onPlayAgain={() => initNewGame(selectedEra, 'freeplay')}
          eraLabel={challengeMode === 'daily' ? `Daily Challenge #${dailyNumber}` : ERA_LABELS[selectedEra]}
          challengeMode={challengeMode}
          dailyNumber={dailyNumber}
          dailyAlreadyCompleted={dailyAlreadyCompleted}
          onSwitchToFreeplay={() => handleSwitchMode('freeplay')}
        />
      )}
      <Analytics />
    </div>
  );
}
