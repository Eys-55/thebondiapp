import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/usePlayerRoulette';
import PlayerRouletteDisplay from '../../Utils/PlayerRouletteDisplay';
import useGameTimer, { formatTime } from '../../Utils/useGameTimer';
import GameTimerDisplay from '../../Utils/GameTimerDisplay';
import Leaderboard from '../../Utils/Leaderboard';

const PLAYER_ROULETTE_DURATION = 2500;
const OWN_WORD_BASE_SCORE = 25; // Default base score for 'own_word' mode

function CharadesGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig } = location.state || {};

  const [allWords, setAllWords] = useState({ easy: { words: [], baseScore: 10 }, medium: { words: [], baseScore: 25 }, hard: { words: [], baseScore: 50 } });
  const [players, setPlayers] = useState([]);
  const [playerScores, setPlayerScores] = useState({}); // { playerId: { name: 'Player', totalScore: 0, roundsPlayed: 0 } }
  
  const [actor, setActor] = useState(null);
  const [numRounds, setNumRounds] = useState(2);
  const [totalTurnsCompleted, setTotalTurnsCompleted] = useState(0);
  
  const [gamePhase, setGamePhase] = useState('loading');
  // Phases: loading,
  // actor_selection_start, actor_selection_roulette,
  // difficulty_selection (system_word only),
  // word_assignment,
  // ready_to_act,
  // acting_in_progress,
  // round_over,
  // game_over

  const [currentWord, setCurrentWord] = useState('');
  const [isWordVisible, setIsWordVisible] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null); // 'easy', 'medium', 'hard', or null for 'own_word'
  const [currentDifficultyBaseScore, setCurrentDifficultyBaseScore] = useState(0);

  const isMountedRef = useRef(true);
  const playerRoulette = usePlayerRoulette(players);
  
  const actingTime = gameConfig?.actingTimeSeconds || 90;
  const gameTimer = useGameTimer({
    maxSeconds: actingTime,
    onTimeout: () => {
      if (isMountedRef.current) {
        handleRoundEnd(false); // Timeout
      }
    },
    countUp: true,
  });

  useEffect(() => {
    isMountedRef.current = true;
    const fetchData = async () => {
      try {
        const wordsRes = await fetch('/src/Games/Charades/data/words.json');
        if (!wordsRes.ok) throw new Error("Failed to load words data.");
        const wordsData = await wordsRes.json();
        if (isMountedRef.current) {
          setAllWords(wordsData);
        }
      } catch (error) {
        if (isMountedRef.current) {
          toast.error(`Error loading words: ${error.message}.`);
        }
      }
    };
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!gameConfig) {
      if (gamePhase !== 'loading' && isMountedRef.current) {
        toast.error("Game configuration missing. Returning to setup.");
        navigate('/charades/setup');
      }
      return;
    }

    // This part updates players and numRounds if gameConfig changes or other relevant dependencies trigger a re-run.
    if (isMountedRef.current) {
      setPlayers(gameConfig.players);
      if (gameConfig.numRounds) {
        setNumRounds(gameConfig.numRounds);
      }
    }
    
    // This block handles the initial setup when gamePhase is 'loading' with a valid gameConfig.
    // It initializes scores, total turns, resets roulette selection, and moves to the first game phase.
    if (gamePhase === 'loading' && isMountedRef.current) { // gameConfig is confirmed present by the check above
      const initialScores = {};
      gameConfig.players.forEach(p => {
        initialScores[p.id] = { name: p.name, totalScore: 0, roundsPlayed: 0 };
      });
      setPlayerScores(initialScores);
      setTotalTurnsCompleted(0);
      playerRoulette.setSelectedPlayer(null); // Reset roulette selection at the start of game logic
      setGamePhase('actor_selection_start');
    }
  }, [gameConfig, navigate, gamePhase, playerRoulette.setSelectedPlayer]);

  const startActorSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    setGamePhase('actor_selection_roulette');
    setActor(null);
    setCurrentWord('');
    setIsWordVisible(false);
    setSelectedDifficulty(null);
    setCurrentDifficultyBaseScore(0);
    gameTimer.resetTimer();

    // Determine eligible players for the roulette
    let eligiblePlayers = [];
    if (players.length > 0 && Object.keys(playerScores).length === players.length) {
      // Main path: playerScores and players are in sync.
      const minTurnsActedByAnyPlayer = Math.min(
        ...Object.values(playerScores).map(ps => ps.roundsPlayed)
      );
      
      eligiblePlayers = players.filter(p =>
        playerScores[p.id] && playerScores[p.id].roundsPlayed === minTurnsActedByAnyPlayer
      );

      // Nested fallback: This should ideally not be hit if the primary logic is sound and data is consistent.
      // If eligiblePlayers is empty here, it implies a potential inconsistency in playerScores data
      // (e.g., roundsPlayed values are not as expected, or minTurnsActedByAnyPlayer didn't match any player).
      if (eligiblePlayers.length === 0 && totalTurnsCompleted < players.length * numRounds) {
        console.warn(
          "CharadesGame: eligiblePlayers list was unexpectedly empty after filtering, despite game not being over. Defaulting to all players. This may indicate a data consistency issue with playerScores.",
          { playerScores, players, totalTurnsCompleted, minTurnsActedByAnyPlayer }
        );
        eligiblePlayers = [...players];
      }
    } else if (players.length > 0) {
      // Fallback path: playerScores and players array lengths are out of sync.
      // This might happen briefly during initial load if state updates are not fully settled,
      // but if it occurs consistently or mid-game, it indicates a problem.
      console.warn(
        "CharadesGame: playerScores and players array potentially out of sync during actor selection (lengths differ). Defaulting to all players. This could lead to incorrect actor selection if it happens mid-round.",
        { numPlayerScores: Object.keys(playerScores).length, numPlayers: players.length, playerScores, players }
      );
      eligiblePlayers = [...players];
    } else {
      // players.length is 0, function should have returned earlier, but as a safeguard:
      eligiblePlayers = [];
    }
    
    // Ensure we have players to spin. If players.length > 0, eligiblePlayers should also not be empty
    // due to the fallbacks ensuring it becomes [...players] if necessary.
    const playersToActuallySpin = eligiblePlayers.length > 0 ? eligiblePlayers : (players.length > 0 ? [...players] : []);
    
    // If, after all fallbacks, playersToActuallySpin is still empty (e.g. initial players array was empty),
    // the roulette hook itself will handle this by not spinning.
    // We log here if we intend to spin with an empty list from this component's perspective.
    if (playersToActuallySpin.length === 0 && players.length > 0) {
        console.warn("CharadesGame: playersToActuallySpin is empty, but there are players in the game. This is unexpected.", { players, eligiblePlayers });
    }

    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selected) => {
      if (isMountedRef.current) {
        setActor(selected);
        toast.success(`${selected.name} is the Actor!`);
        if (gameConfig.gameMode === 'system_word') {
          setGamePhase('difficulty_selection');
        } else { // own_word mode
          setSelectedDifficulty(null); // Explicitly null for own_word
          setCurrentDifficultyBaseScore(OWN_WORD_BASE_SCORE);
          toast.info(`Base score for this round: ${OWN_WORD_BASE_SCORE} (Player's Choice)`);
          setGamePhase('word_assignment');
        }
      }
    }, playersToActuallySpin);
  }, [players, gameTimer, playerRoulette, gameConfig?.gameMode, playerScores, numRounds, totalTurnsCompleted]);

  useEffect(() => {
    if (gamePhase === 'actor_selection_start') {
      startActorSelectionRoulette();
    } else if (gamePhase === 'word_assignment' && actor) {
      if (gameConfig.gameMode === 'system_word' && selectedDifficulty) {
        const difficultyWords = allWords[selectedDifficulty]?.words || [];
        if (difficultyWords.length > 0) {
          const randomWord = difficultyWords[Math.floor(Math.random() * difficultyWords.length)];
          setCurrentWord(randomWord);
        } else {
          toast.error(`No words loaded for ${selectedDifficulty} difficulty. Actor needs to choose a word.`);
          setCurrentWord(''); // Or handle error more gracefully
        }
      } else if (gameConfig.gameMode === 'own_word') {
        setCurrentWord(''); // Actor will think of one
      }
    }
  }, [gamePhase, actor, selectedDifficulty, gameConfig?.gameMode, allWords, startActorSelectionRoulette]);

  const handleDifficultySelect = (difficulty) => {
    if (!isMountedRef.current || !allWords[difficulty] || gameConfig.gameMode !== 'system_word') return;
    setSelectedDifficulty(difficulty);
    setCurrentDifficultyBaseScore(allWords[difficulty].baseScore);
    toast.info(`${actor.name} selected ${difficulty.toUpperCase()} difficulty (Base Score: ${allWords[difficulty].baseScore})`);
    setGamePhase('word_assignment');
  };

  const handleShowWord = () => {
    if (gameConfig.gameMode === 'system_word' && currentWord) {
      setIsWordVisible(true);
      setGamePhase('ready_to_act');
    }
  };
  
  const handleActorReadyWithOwnWord = () => {
     if (gameConfig.gameMode === 'own_word') {
        setGamePhase('ready_to_act');
        toast.info(`${actor.name} is ready with their word/phrase!`);
     }
  };

  const handleStartActing = () => {
    if (!isMountedRef.current) return;
    gameTimer.resetTimer();
    gameTimer.startTimer();
    setGamePhase('acting_in_progress');
  };

  const handleWordGuessed = () => {
    if (!isMountedRef.current) return;
    gameTimer.stopTimer();
    handleRoundEnd(true);
  };

  const handleRoundEnd = (guessedSuccessfully) => {
    if (!isMountedRef.current || !actor) return;
    const timeTaken = Math.max(1, gameTimer.currentTime);
    let roundScore = 0;

    // currentDifficultyBaseScore is set during difficulty selection for system_word
    // or set to OWN_WORD_BASE_SCORE for own_word mode during actor selection
    if (guessedSuccessfully && currentDifficultyBaseScore > 0) {
      const maxTime = gameConfig?.actingTimeSeconds || actingTime;
      roundScore = Math.round(currentDifficultyBaseScore * (maxTime / timeTaken));
      toast.success(`Guessed! ${actor.name} scored ${roundScore} points! (Time: ${formatTime(timeTaken)})`);
      
      setPlayerScores(prevScores => {
        const currentActorScoreData = prevScores[actor.id] || { name: actor.name, totalScore: 0, roundsPlayed: 0 };
        return {
          ...prevScores,
          [actor.id]: {
            ...currentActorScoreData,
            totalScore: (currentActorScoreData.totalScore || 0) + roundScore,
            roundsPlayed: (currentActorScoreData.roundsPlayed || 0) + 1,
          }
        };
      });
    } else {
      const wordDisplay = currentWord || (gameConfig.gameMode === 'own_word' ? "(chosen by player)" : "(word not set)");
      toast.warn(`Time's up for ${actor.name}! Word was: ${wordDisplay}. No points this round.`);
       setPlayerScores(prevScores => {
        const currentActorScoreData = prevScores[actor.id] || { name: actor.name, totalScore: 0, roundsPlayed: 0 };
        return {
          ...prevScores,
          [actor.id]: {
            ...currentActorScoreData,
            totalScore: currentActorScoreData.totalScore || 0, // Ensure totalScore remains a number
            roundsPlayed: (currentActorScoreData.roundsPlayed || 0) + 1,
          }
        };
      });
    }
    setTotalTurnsCompleted(prev => prev + 1);
    setGamePhase('round_over');
  };

  const handleNextRound = () => {
    if (!isMountedRef.current) return;
    if (players.length > 0 && totalTurnsCompleted >= players.length * numRounds) {
      setGamePhase('game_over');
    } else {
      setGamePhase('actor_selection_start');
    }
  };
  
  if (gamePhase === 'loading' || !gameConfig || players.length === 0) {
    return <div className="text-center py-10 text-xl text-blue-300">Loading Charades Game...</div>;
  }

  const charadesLeaderboardFormatter = (player, scoreData, rank) => (
    <li key={player.id} className="flex justify-between items-center p-2 bg-gray-600 rounded">
      <span className="text-gray-100">{rank}. {player.name}</span>
      <span className="text-sm text-blue-300">
        Score: {scoreData?.totalScore || 0} (Rounds: {scoreData?.roundsPlayed || 0})
      </span>
    </li>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col space-y-4">
      <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">Charades!</h2>
      <div className="text-xs text-center text-gray-400 mb-1">
          Mode: {gameConfig.gameMode === 'system_word' ? 'System Word' : 'Player Choice'} | Max Time: {formatTime(actingTime)}
      </div>
      {players.length > 0 && numRounds > 0 && gamePhase !== 'game_over' && gamePhase !== 'loading' && (
        <div className="text-sm text-center text-gray-300 mb-3">
            Turn: {Math.min(totalTurnsCompleted + 1, players.length * numRounds)} / {players.length * numRounds}
        </div>
      )}

      {gamePhase === 'game_over' && (
        <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-4xl font-bold text-green-400 mb-6">Game Over!</h3>
          <Leaderboard
            title="Final Scores"
            players={players}
            playerScores={playerScores}
            primarySortField="totalScore"
            secondarySortField="roundsPlayed"
            secondarySortOrder="asc"
            displayFormatter={charadesLeaderboardFormatter}
          />
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate('/charades/setup')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              Play Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg text-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {gamePhase !== 'game_over' && actor && (gamePhase !== 'actor_selection_roulette' && gamePhase !== 'loading') && (
        <div className="p-3 bg-gray-700 rounded-lg text-center shadow-md mb-4">
          <p className="text-lg text-gray-100">Current Actor: <span className="font-bold text-blue-300">{actor.name}</span></p>
          {gameConfig.gameMode === 'system_word' && selectedDifficulty &&
            <p className="text-sm text-gray-300">Difficulty: <span className="font-semibold text-yellow-300">{selectedDifficulty.toUpperCase()}</span> (Base: {currentDifficultyBaseScore} pts)</p>
          }
          {gameConfig.gameMode === 'own_word' &&
            <p className="text-sm text-gray-300">Mode: <span className="font-semibold text-yellow-300">Player's Choice</span> (Base: {currentDifficultyBaseScore} pts)</p>
          }
        </div>
      )}

      {gamePhase === 'actor_selection_roulette' && (
        <PlayerRouletteDisplay
          title="Selecting Actor..."
          displayText={playerRoulette.rouletteDisplayText}
          isSpinning={playerRoulette.isRouletteSpinning}
        />
      )}

      {gamePhase === 'difficulty_selection' && actor && gameConfig.gameMode === 'system_word' && (
        <div className="text-center my-6 p-6 bg-gray-800 rounded-lg shadow-lg">
          <p className="text-xl text-gray-200 mb-4">{actor.name}, choose your difficulty:</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {['easy', 'medium', 'hard'].map(diff => (
              <button
                key={diff}
                onClick={() => handleDifficultySelect(diff)}
                className={`flex-1 font-bold py-3 px-5 rounded-lg text-lg transition-transform hover:scale-105
                            ${diff === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}
                            ${diff === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' : ''}
                            ${diff === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}
                          `}
              >
                {diff.toUpperCase()} (Base: {allWords[diff]?.baseScore || 'N/A'} pts)
              </button>
            ))}
          </div>
        </div>
      )}

      {gamePhase === 'word_assignment' && actor && (
        <div className="text-center my-6 p-6 bg-gray-800 rounded-lg shadow-lg">
          {gameConfig.gameMode === 'system_word' && selectedDifficulty && (
            <p className="text-xl text-gray-200 mb-4">{actor.name}, get ready for a <span className="font-bold text-yellow-300">{selectedDifficulty.toUpperCase()}</span> challenge!</p>
          )}
          {gameConfig.gameMode === 'own_word' && (
             <p className="text-xl text-gray-200 mb-4">{actor.name}, time to think of a word/phrase!</p>
          )}

          {gameConfig.gameMode === 'system_word' && currentWord && !isWordVisible && (
            <>
              <p className="text-gray-300 mb-4">A word/phrase has been chosen for you.</p>
              <button onClick={handleShowWord} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                Show Word/Phrase (Actor Only!)
              </button>
            </>
          )}
          {gameConfig.gameMode === 'system_word' && !currentWord && selectedDifficulty && (allWords[selectedDifficulty]?.words.length === 0 || !allWords[selectedDifficulty]) && (
            <>
             <p className="text-red-400 mb-4">Error: No words available for {selectedDifficulty}. Please try another difficulty or go back.</p>
            </>
          )}
          {gameConfig.gameMode === 'own_word' && (
            <>
              <p className="text-gray-300 mb-4">Please think of a word or phrase to act out.</p>
              <button onClick={handleActorReadyWithOwnWord} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                I Have My Word/Phrase!
              </button>
            </>
          )}
        </div>
      )}
      
      {gamePhase === 'ready_to_act' && actor && (
        <div className="text-center my-6 p-6 bg-gray-800 rounded-lg shadow-lg">
          {gameConfig.gameMode === 'system_word' && isWordVisible && currentWord && selectedDifficulty && (
            <div className="mb-6">
              <p className="text-gray-300 mb-1">Your word/phrase ({selectedDifficulty.toUpperCase()}):</p>
              <p className="text-3xl font-bold text-yellow-400 bg-gray-700 p-3 rounded-md">{currentWord}</p>
            </div>
          )}
           {gameConfig.gameMode === 'own_word' && (
            <p className="text-xl text-gray-200 mb-6">{actor.name}, get ready to act out your chosen word/phrase!</p>
           )}
          <button onClick={handleStartActing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-xl">
            Start Acting!
          </button>
        </div>
      )}

      {gamePhase === 'acting_in_progress' && actor && (
        <div className="text-center my-6 p-6 bg-gray-800 rounded-lg shadow-lg">
          <p className="text-2xl text-yellow-400 mb-2 animate-pulse">ACTING!</p>
          {gameConfig.gameMode === 'system_word' && currentWord && (
             <p className="text-sm text-gray-500 mb-1">(Word: {isWordVisible ? currentWord : "Hidden"})</p>
          )}
          {gameConfig.gameMode === 'system_word' && selectedDifficulty &&
            <p className="text-sm text-gray-400 mb-2">Difficulty: {selectedDifficulty.toUpperCase()} | Base Score: {currentDifficultyBaseScore}</p>
          }
          {gameConfig.gameMode === 'own_word' &&
             <p className="text-sm text-gray-400 mb-2">Player's Choice | Base Score for timing: {currentDifficultyBaseScore}</p>
          }
          <GameTimerDisplay formattedTime={gameTimer.formattedTime} />
          <p className="text-sm text-gray-400 mb-6">Max Time: {formatTime(actingTime)}</p>
          <button onClick={handleWordGuessed} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
            Word Guessed!
          </button>
        </div>
      )}

      {gamePhase === 'round_over' && actor && (
        <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
          <p className="text-2xl text-gray-200 mb-4">
            Round over for <span className="font-bold text-blue-400">{actor.name}</span>!
          </p>
          <button onClick={handleNextRound} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl mb-4">
            {totalTurnsCompleted >= players.length * numRounds ? 'Show Final Scores' : 'Next Round'}
          </button>
          <Leaderboard
            players={players}
            playerScores={playerScores}
            primarySortField="totalScore"
            secondarySortField="roundsPlayed"
            secondarySortOrder="asc"
            displayFormatter={charadesLeaderboardFormatter}
          />
        </div>
      )}
      
      {(gamePhase !== 'game_over' && gamePhase !== 'round_over' && gamePhase !== 'loading' && gamePhase !== 'actor_selection_roulette' && gamePhase !== 'difficulty_selection' && players.length > 0) && (
        <Leaderboard
            players={players}
            playerScores={playerScores}
            primarySortField="totalScore"
            secondarySortField="roundsPlayed"
            secondarySortOrder="asc"
            displayFormatter={charadesLeaderboardFormatter}
        />
      )}

    </div>
  );
}

export default CharadesGame;