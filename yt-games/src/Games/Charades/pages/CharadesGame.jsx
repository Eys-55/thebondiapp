import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/utils_hooks/usePlayerRoulette';
import useItemSelector from '../../Utils/utils_hooks/useItemSelector';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';
import useGameTimer, { formatTime } from '../../Utils/utils_hooks/useGameTimer';
import GameTimerDisplay from '../../Utils/utils_gameplay/GameTimerDisplay';
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';
import wordsData from '../data/words.json'; // Import wordsData directly

const PLAYER_ROULETTE_DURATION = 2500;
const OWN_WORD_BASE_SCORE = 25; // Default base score for 'own_word' mode

function CharadesGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig } = location.state || {};

  // const [allWords, setAllWords] = useState({ easy: { words: [], baseScore: 10 }, medium: { words: [], baseScore: 25 }, hard: { words: [], baseScore: 50 } }); // Removed state
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

  const [isWordVisible, setIsWordVisible] = useState(false);

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

  const itemSelectorOptions = useMemo(() => ({
    allowPlayerChoice: gameConfig?.gameMode === 'own_word',
    playerChoiceDefaultData: { baseScore: OWN_WORD_BASE_SCORE },
    itemKey: 'words',
  }), [gameConfig?.gameMode]);

  const itemSelector = useItemSelector({
    itemsData: wordsData, // Use imported wordsData
    options: itemSelectorOptions,
  });

  // useEffect to fetch words.json is removed as it's now imported directly.
  // The isMountedRef setup is kept for other async operations or effects if any.
  useEffect(() => {
    isMountedRef.current = true;
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

    if (isMountedRef.current) {
      setPlayers(gameConfig.players);
      if (gameConfig.numRounds) {
        setNumRounds(gameConfig.numRounds);
      }
    }
    
    if (gamePhase === 'loading' && isMountedRef.current) { 
      const initialScores = {};
      gameConfig.players.forEach(p => {
        initialScores[p.id] = { name: p.name, totalScore: 0, roundsPlayed: 0 };
      });
      setPlayerScores(initialScores);
      setTotalTurnsCompleted(0);
      playerRoulette.setSelectedPlayer(null); 
      setGamePhase('actor_selection_start');
    }
  }, [gameConfig, navigate, gamePhase, playerRoulette.setSelectedPlayer]);

  const startActorSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    setGamePhase('actor_selection_roulette');
    setActor(null);
    itemSelector.resetSelection(); 
    setIsWordVisible(false);
    gameTimer.resetTimer();

    let eligiblePlayers = [];
    if (players.length > 0 && Object.keys(playerScores).length === players.length) {
      const minTurnsActedByAnyPlayer = Math.min(
        ...Object.values(playerScores).map(ps => ps.roundsPlayed)
      );
      
      eligiblePlayers = players.filter(p =>
        playerScores[p.id] && playerScores[p.id].roundsPlayed === minTurnsActedByAnyPlayer
      );

      if (eligiblePlayers.length === 0 && totalTurnsCompleted < players.length * numRounds) {
        console.warn(
          "CharadesGame: eligiblePlayers list was unexpectedly empty after filtering, despite game not being over. Defaulting to all players. This may indicate a data consistency issue with playerScores.",
          { playerScores, players, totalTurnsCompleted, minTurnsActedByAnyPlayer }
        );
        eligiblePlayers = [...players];
      }
    } else if (players.length > 0) {
      console.warn(
        "CharadesGame: playerScores and players array potentially out of sync during actor selection (lengths differ). Defaulting to all players. This could lead to incorrect actor selection if it happens mid-round.",
        { numPlayerScores: Object.keys(playerScores).length, numPlayers: players.length, playerScores, players }
      );
      eligiblePlayers = [...players];
    } else {
      eligiblePlayers = [];
    }
    
    const playersToActuallySpin = eligiblePlayers.length > 0 ? eligiblePlayers : (players.length > 0 ? [...players] : []);
    
    if (playersToActuallySpin.length === 0 && players.length > 0) {
        console.warn("CharadesGame: playersToActuallySpin is empty, but there are players in the game. This is unexpected.", { players, eligiblePlayers });
    }

    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selected) => {
      if (isMountedRef.current) {
        setActor(selected);
        toast.success(`${selected.name} is the Actor!`);
        if (gameConfig.gameMode === 'system_word') {
          setGamePhase('difficulty_selection');
        } else { 
          itemSelector.setPlayerChosenItem({ baseScore: OWN_WORD_BASE_SCORE });
          toast.info(`Base score for this round: ${itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} (Player's Choice)`);
          setGamePhase('word_assignment'); 
        }
      }
    }, playersToActuallySpin);
  }, [players, gameTimer, playerRoulette, gameConfig?.gameMode, playerScores, numRounds, totalTurnsCompleted, itemSelector]);

  useEffect(() => {
    if (gamePhase === 'actor_selection_start' && !playerRoulette.isRouletteSpinning && !actor) { // ensure it only runs if not already spinning and no actor
      startActorSelectionRoulette();
    }
  }, [gamePhase, actor, playerRoulette.isRouletteSpinning, startActorSelectionRoulette]);

  const handleDifficultySelect = (difficulty) => {
    if (!isMountedRef.current || !wordsData[difficulty] || gameConfig.gameMode !== 'system_word') return;
    itemSelector.selectCategory(difficulty);
    // itemSelector.drawItem(); // Removed: Will be handled by useEffect
    // toast.info(...) // Removed: Will be handled by useEffect
    setGamePhase('word_assignment');
  };

  // useEffect to draw item when category is selected and game phase expects it
  useEffect(() => {
    if (gamePhase === 'word_assignment' &&
      gameConfig.gameMode === 'system_word' &&
      itemSelector.currentCategory && // Ensures category is set in the hook
      !itemSelector.selectedItem && // Only draw if no item is selected yet for this phase/category
      isMountedRef.current) {
      itemSelector.drawItem();
    }
  }, [gamePhase, gameConfig?.gameMode, itemSelector.currentCategory, itemSelector.selectedItem, itemSelector.drawItem]);

  // useEffect to show toast after item is drawn
  useEffect(() => {
    if (gamePhase === 'word_assignment' &&
      gameConfig.gameMode === 'system_word' &&
      itemSelector.selectedItem && // An item has been successfully drawn
      itemSelector.selectedItem.categoryName && // It's a system word with category info
      actor &&
      isMountedRef.current) {

      const difficulty = itemSelector.selectedItem.categoryName;
      const baseScore = itemSelector.selectedItem.baseScore;

      if (baseScore !== undefined) {
        toast.info(`${actor.name} selected ${difficulty.toUpperCase()} difficulty (Base Score: ${baseScore})`);
      } else {
        // Fallback or error if baseScore wasn't part of the selectedItem
        const fallbackBaseScore = wordsData[difficulty]?.baseScore;
        if (fallbackBaseScore !== undefined) {
          toast.info(`${actor.name} selected ${difficulty.toUpperCase()} difficulty (Base Score: ${fallbackBaseScore}, fallback)`);
        } else {
          toast.error(`Error determining base score for ${difficulty}.`);
        }
      }
    }
  }, [gamePhase, gameConfig?.gameMode, itemSelector.selectedItem, actor, wordsData]);

  const handleShowWord = () => {
    if (gameConfig.gameMode === 'system_word' && itemSelector.selectedItem?.rawItem) {
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

    const baseScoreForRound = itemSelector.selectedItem?.baseScore || 0; 
    if (guessedSuccessfully && baseScoreForRound > 0) {
      const maxTime = gameConfig?.actingTimeSeconds || actingTime;
      roundScore = Math.round(baseScoreForRound * (maxTime / timeTaken));
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
      const wordDisplay = itemSelector.selectedItem?.rawItem || (itemSelector.selectedItem?.isPlayerChoice ? "(chosen by player)" : "(word not set)");
      toast.warn(`Time's up for ${actor.name}! Word was: ${wordDisplay}. No points this round.`);
       setPlayerScores(prevScores => {
        const currentActorScoreData = prevScores[actor.id] || { name: actor.name, totalScore: 0, roundsPlayed: 0 };
        return {
          ...prevScores,
          [actor.id]: {
            ...currentActorScoreData,
            totalScore: currentActorScoreData.totalScore || 0, 
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
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col space-y-4">
      <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">Charades!</h2>
      <div className="text-xs text-center text-gray-400 mb-1">
          Mode: {gameConfig.gameMode === 'system_word' ? 'System Word' : 'Player Choice'} | Max Time: {formatTime(actingTime)}
      </div>
      {players.length > 0 && numRounds > 0 && gamePhase !== 'game_over' && gamePhase !== 'loading' && (
        <GameProgressDisplay
          currentTurn={totalTurnsCompleted + 1}
          totalTurns={players.length * numRounds}
        />
      )}

      {gamePhase === 'game_over' && (
        <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
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
          {gameConfig.gameMode === 'system_word' && itemSelector.currentCategory && ( // Use itemSelector.currentCategory
            <>
              <p className="text-sm text-gray-300">Difficulty: <span className="font-semibold text-yellow-300">{itemSelector.currentCategory.toUpperCase()}</span> (Base: {itemSelector.selectedItem?.baseScore || 'N/A'} pts)</p>
              {/* Use itemSelector.selectedItem.baseScore */}
            </>
          )}
          {gameConfig.gameMode === 'own_word' && itemSelector.selectedItem?.isPlayerChoice && ( // Check if player choice item is set
            <>
              <p className="text-sm text-gray-300">Mode: <span className="font-semibold text-yellow-300">Player's Choice</span> (Base: {itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} pts)</p>
              {/* Use itemSelector.selectedItem.baseScore */}
            </>
          )}
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
        <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
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
                {diff.toUpperCase()} (Base: {wordsData[diff]?.baseScore || 'N/A'} pts)
              </button>
            ))}
          </div>
        </div>
      )}

      {gamePhase === 'word_assignment' && actor && (
        <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
          {gameConfig.gameMode === 'system_word' && itemSelector.currentCategory && ( 
            <p className="text-xl text-gray-200 mb-4">{actor.name}, get ready for a <span className="font-bold text-yellow-300">{itemSelector.currentCategory.toUpperCase()}</span> challenge!</p>
          )}
          {gameConfig.gameMode === 'own_word' && (
             <p className="text-xl text-gray-200 mb-4">{actor.name}, time to think of a word/phrase!</p>
          )}

          {gameConfig.gameMode === 'system_word' && itemSelector.selectedItem?.rawItem && !isWordVisible && ( 
            <>
              <p className="text-gray-300 mb-4">A word/phrase has been chosen for you.</p>
              <button onClick={handleShowWord} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                Show Word/Phrase (Actor Only!)
              </button>
            </>
          )}
          {gameConfig.gameMode === 'system_word' && !itemSelector.selectedItem && itemSelector.currentCategory && ( 
            <>
             <p className="text-red-400 mb-4">Error: No words available for {itemSelector.currentCategory}. Please try another difficulty or go back.</p>
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
        <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
          {gameConfig.gameMode === 'system_word' && isWordVisible && itemSelector.selectedItem?.rawItem && itemSelector.currentCategory && ( 
            <div className="mb-6">
              <p className="text-gray-300 mb-1">Your word/phrase ({itemSelector.currentCategory.toUpperCase()}):</p>
              <p className="text-3xl font-bold text-yellow-400 bg-gray-700 p-3 rounded-md">{itemSelector.selectedItem.rawItem}</p>
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
        <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
          <p className="text-2xl text-yellow-400 mb-2 animate-pulse">ACTING!</p>
          {gameConfig.gameMode === 'system_word' && itemSelector.selectedItem?.rawItem && ( 
             <p className="text-sm text-gray-500 mb-1">(Word: {isWordVisible ? itemSelector.selectedItem.rawItem : "Hidden"})</p>
          )}
          {gameConfig.gameMode === 'system_word' && itemSelector.currentCategory && (
            <p className="text-sm text-gray-400 mb-2">Difficulty: {itemSelector.currentCategory.toUpperCase()} | Base Score: {itemSelector.selectedItem?.baseScore || 'N/A'} pts)</p>
          )}
          {gameConfig.gameMode === 'own_word' && itemSelector.selectedItem?.isPlayerChoice && (
             <p className="text-sm text-gray-400 mb-2">Player's Choice | Base Score for timing: {itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} pts)</p>
          )}
          <GameTimerDisplay formattedTime={gameTimer.formattedTime} />
          <p className="text-sm text-gray-400 mb-6">Max Time: {formatTime(actingTime)}</p>
          <button onClick={handleWordGuessed} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
            Word Guessed!
          </button>
        </div>
      )}

      {gamePhase === 'round_over' && actor && (
        <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
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