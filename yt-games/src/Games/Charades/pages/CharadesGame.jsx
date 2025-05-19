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
  console.log('CharadesGame: Initial render or location/state change. gameConfig from location.state:', gameConfig);


  const [players, setPlayers] = useState([]);
  const [playerScores, setPlayerScores] = useState({}); // { playerId: { name: 'Player', totalScore: 0, roundsPlayed: 0 } }
  
  const [actor, setActor] = useState(null);
  const [numRounds, setNumRounds] = useState(2);
  const [totalTurnsCompleted, setTotalTurnsCompleted] = useState(0);
  
  const [gamePhase, setGamePhaseState] = useState('loading');
  // Custom setter for gamePhase to log changes
  const setGamePhase = (newPhase, reason = "") => {
    console.log(`CharadesGame: Attempting to set gamePhase from '${gamePhase}' to '${newPhase}'. Reason: ${reason || 'N/A'}`);
    if (gamePhase !== newPhase) {
      setGamePhaseState(newPhase);
    } else {
      // console.log(`CharadesGame: gamePhase is already '${newPhase}'. No change needed.`);
    }
  };

  useEffect(() => {
    console.log(`CharadesGame: Game phase actually changed to: '${gamePhase}'`);
  }, [gamePhase]);


  const [isWordVisible, setIsWordVisible] = useState(false);

  const isMountedRef = useRef(true);
  const playerRoulette = usePlayerRoulette(players); // Assuming players array is stable or hook handles changes
  
  const actingTime = gameConfig?.actingTimeSeconds || 90;
  const gameTimer = useGameTimer({
    maxSeconds: actingTime,
    onTimeout: () => {
      console.log('CharadesGame: GameTimer TIMEOUT. isMountedRef:', isMountedRef.current, 'Current gamePhase:', gamePhase);
      if (isMountedRef.current && gamePhase === 'acting_in_progress') { // Ensure timeout only triggers round end if acting
        handleRoundEnd(false); // Timeout
      } else {
        console.warn('CharadesGame: GameTimer TIMEOUT occurred but not in acting_in_progress or component unmounted.');
      }
    },
    countUp: true,
  });

  const itemSelectorOptions = useMemo(() => {
    const options = {
      allowPlayerChoice: gameConfig?.gameMode === 'own_word',
      playerChoiceDefaultData: { baseScore: OWN_WORD_BASE_SCORE },
      itemKey: 'words',
    };
    console.log('CharadesGame: useMemo for itemSelectorOptions recomputed. New options:', options, 'gameConfig.gameMode:', gameConfig?.gameMode);
    return options;
  }, [gameConfig?.gameMode]);

  const itemSelector = useItemSelector({
    itemsData: wordsData, 
    options: itemSelectorOptions,
  });

  useEffect(() => {
    console.log('CharadesGame: Component did mount.');
    isMountedRef.current = true;
    return () => {
      console.log('CharadesGame: Component will unmount.');
      isMountedRef.current = false;
    };
  }, []);


  useEffect(() => {
    console.log('CharadesGame: gameConfig useEffect triggered. gameConfig:', gameConfig, 'current gamePhase:', gamePhase, 'isMountedRef:', isMountedRef.current);
    if (!gameConfig) {
      if (gamePhase !== 'loading' && isMountedRef.current) {
        console.error("CharadesGame: Game configuration missing in useEffect. Navigating to setup.");
        toast.error("Game configuration missing. Returning to setup.");
        navigate('/charades/setup');
      }
      return;
    }

    if (isMountedRef.current) {
      console.log('CharadesGame: [gameConfig useEffect] Setting players from gameConfig:', gameConfig.players);
      setPlayers(gameConfig.players); // Assuming direct state update is fine
      if (gameConfig.numRounds) {
        console.log('CharadesGame: [gameConfig useEffect] Setting numRounds from gameConfig:', gameConfig.numRounds);
        setNumRounds(gameConfig.numRounds);
      }
    }
    
    if (gamePhase === 'loading' && isMountedRef.current && gameConfig.players && gameConfig.players.length > 0) { 
      console.log('CharadesGame: [gameConfig useEffect] Initializing game state (scores, turns). Players:', gameConfig.players);
      const initialScores = {};
      gameConfig.players.forEach(p => {
        initialScores[p.id] = { name: p.name, totalScore: 0, roundsPlayed: 0 };
      });
      console.log('CharadesGame: [gameConfig useEffect] Initializing playerScores:', initialScores);
      setPlayerScores(initialScores);
      console.log('CharadesGame: [gameConfig useEffect] Resetting totalTurnsCompleted to 0.');
      setTotalTurnsCompleted(0);
      console.log('CharadesGame: [gameConfig useEffect] Resetting playerRoulette.selectedPlayer.');
      playerRoulette.setSelectedPlayer(null); 
      setGamePhase('actor_selection_start', 'Game initialized from gameConfig');
    } else if (gamePhase === 'loading' && (!gameConfig.players || gameConfig.players.length === 0)) {
        console.warn('CharadesGame: [gameConfig useEffect] In loading phase, but gameConfig has no players. Waiting or error.');
    }
  }, [gameConfig, navigate, gamePhase]); // Removed playerRoulette.setSelectedPlayer as it's a setter, usually stable

  const onActorSelected = useCallback((selectedActor) => {
    console.log('CharadesGame: onActorSelected callback invoked. selectedActor:', selectedActor, 'isMountedRef:', isMountedRef.current);
    if (!isMountedRef.current) {
        console.warn('CharadesGame: onActorSelected called but component unmounted.');
        return;
    }

    if (!selectedActor) {
      console.error("CharadesGame: onActorSelected called with no actor. gameConfig present:", !!gameConfig);
      toast.error("Failed to select an actor. Please try again.");
      setGamePhase('actor_selection_start', 'Actor selection failed (no actor returned)');
      return;
    }

    console.log(`CharadesGame: Actor selected: ${selectedActor.name}. Updating actor state.`);
    setActor(selectedActor);
    toast.success(`${selectedActor.name} is the Actor!`);

    if (gameConfig.gameMode === 'system_word') {
      console.log('CharadesGame: [onActorSelected] Game mode is system_word. Transitioning to difficulty_selection.');
      setGamePhase('difficulty_selection', 'Actor selected for system_word mode');
    } else { // own_word mode
      console.log('CharadesGame: [onActorSelected] Game mode is own_word. Setting player chosen item and transitioning to word_assignment.');
      itemSelector.setPlayerChosenItem({ baseScore: OWN_WORD_BASE_SCORE }); // Hook manages its own state
      toast.info(`Base score for this round: ${OWN_WORD_BASE_SCORE} (Player's Choice)`);
      setGamePhase('word_assignment', 'Actor selected for own_word mode');
    }
  }, [gameConfig?.gameMode, itemSelector, /*setActor, setGamePhase are stable setters,*/ OWN_WORD_BASE_SCORE, isMountedRef]); // isMountedRef is stable


  const startActorSelectionRoulette = useCallback(() => {
    console.log(`CharadesGame: startActorSelectionRoulette called. isMountedRef: ${isMountedRef.current}, players.length: ${players.length}, playerScores:`, JSON.stringify(playerScores), `totalTurnsCompleted: ${totalTurnsCompleted}, numRounds: ${numRounds}`);
    if (!isMountedRef.current || players.length === 0) {
        console.warn('CharadesGame: startActorSelectionRoulette - cannot start, component unmounted or no players.');
        return;
    }
    setGamePhase('actor_selection_roulette', 'Starting actor selection process via roulette/direct');
    console.log('CharadesGame: [startActorSelectionRoulette] Resetting actor, itemSelector, word visibility, gameTimer.');
    setActor(null);
    itemSelector.resetSelection(); 
    setIsWordVisible(false);
    gameTimer.resetTimer();

    let eligiblePlayers = [];
    if (players.length > 0 && Object.keys(playerScores).length === players.length) {
      const minTurnsActedByAnyPlayer = Math.min(
        ...Object.values(playerScores).map(ps => ps.roundsPlayed)
      );
      console.log('CharadesGame: [startActorSelectionRoulette] Calculating eligible players. Min turns acted:', minTurnsActedByAnyPlayer);
      
      eligiblePlayers = players.filter(p =>
        playerScores[p.id] && playerScores[p.id].roundsPlayed === minTurnsActedByAnyPlayer
      );
      console.log('CharadesGame: [startActorSelectionRoulette] Filtered eligible players:', eligiblePlayers.map(p=>p.name));

      if (eligiblePlayers.length === 0 && totalTurnsCompleted < players.length * numRounds) {
        console.warn(
          "CharadesGame: [startActorSelectionRoulette] eligiblePlayers list was empty after filtering, defaulting to all players. Data:",
          { playerScores, players, totalTurnsCompleted, minTurnsActedByAnyPlayer }
        );
        eligiblePlayers = [...players];
      }
    } else if (players.length > 0) {
      console.warn(
        "CharadesGame: [startActorSelectionRoulette] playerScores and players array potentially out of sync or not fully initialized. Defaulting to all players. Data:",
        { numPlayerScores: Object.keys(playerScores).length, numPlayers: players.length, playerScores, players }
      );
      eligiblePlayers = [...players]; // Fallback if playerScores isn't ready
    }
    
    const playersToActuallySpin = eligiblePlayers.length > 0 ? eligiblePlayers : (players.length > 0 ? [...players] : []);
    console.log('CharadesGame: [startActorSelectionRoulette] Players to actually spin:', playersToActuallySpin.map(p=>p.name));
    
    if (playersToActuallySpin.length === 0 && players.length > 0 && totalTurnsCompleted < players.length * numRounds) {
        console.error("CharadesGame: [startActorSelectionRoulette] CRITICAL ERROR: playersToActuallySpin is empty, but game is not over.", { players, eligiblePlayers, totalTurnsCompleted, numRounds });
        toast.error("Critical error: Could not determine next player.");
        setGamePhase('game_over', 'Critical error in actor selection logic');
        return;
    }
    
    if (playersToActuallySpin.length === 1) {
      console.log('CharadesGame: [startActorSelectionRoulette] Only one eligible player. Selecting directly:', playersToActuallySpin[0].name);
      onActorSelected(playersToActuallySpin[0]);
    } else if (playersToActuallySpin.length > 0) {
      console.log('CharadesGame: [startActorSelectionRoulette] Spinning roulette for players:', playersToActuallySpin.map(p=>p.name));
      playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, onActorSelected, playersToActuallySpin);
    } else {
      if (totalTurnsCompleted < players.length * numRounds) {
           console.error("CharadesGame: [startActorSelectionRoulette] No players available to spin, but game not over. This is a critical state.", { totalTurnsCompleted, maxTurns: players.length * numRounds, players, playerScores });
           toast.error("Critical error: Could not determine next player. Game cannot continue.");
           setGamePhase('game_over', 'No players for spin, game not over');
      } else {
          console.log("CharadesGame: [startActorSelectionRoulette] No players to spin; game likely over based on turns. Max turns may have been reached.", { totalTurnsCompleted, maxTurns: players.length * numRounds });
          // This scenario should ideally be caught by the game_over check in handleNextRound or the useEffect below.
          // If it reaches here, it implies a state where the game should be ending.
      }
    }
  }, [players, playerScores, numRounds, totalTurnsCompleted, itemSelector, onActorSelected, gameTimer, playerRoulette /* Other setters are stable */, isMountedRef]);


  useEffect(() => {
    console.log(
        `CharadesGame: Actor selection trigger useEffect. Phase: '${gamePhase}', RouletteSpinning: ${playerRoulette.isRouletteSpinning}, ActorSet: ${!!actor}, Players: ${players.length}, TurnsCompleted: ${totalTurnsCompleted}, NumRounds: ${numRounds}, PlayerScores keys: ${Object.keys(playerScores).length}`
    );

    if (
      gamePhase === 'actor_selection_start' &&
      !playerRoulette.isRouletteSpinning &&
      !actor && // No actor currently selected for this new turn
      players.length > 0 && // We have players to select from
      Object.keys(playerScores).length === players.length // Ensure playerScores is initialized for all players
    ) {
       const maxPossibleTurns = players.length * numRounds;
       console.log(`CharadesGame: [Actor selection trigger useEffect] Conditions met. Turns: ${totalTurnsCompleted}/${maxPossibleTurns}`);
       if (totalTurnsCompleted < maxPossibleTurns) {
          console.log("CharadesGame: [Actor selection trigger useEffect] Calling startActorSelectionRoulette.");
          startActorSelectionRoulette();
       } else {
          console.log(`CharadesGame: [Actor selection trigger useEffect] All turns completed (${totalTurnsCompleted} >= ${maxPossibleTurns}). Transitioning to game_over.`);
          setGamePhase('game_over', 'All turns completed per actor selection trigger');
       }
    } else {
        let logReason = "CharadesGame: [Actor selection trigger useEffect] Conditions NOT met. ";
        if (gamePhase !== 'actor_selection_start') logReason += `Phase is ${gamePhase}. `;
        if (playerRoulette.isRouletteSpinning) logReason += "Roulette spinning. ";
        if (actor) logReason += `Actor already ${actor.name}. `;
        if (players.length === 0) logReason += "No players. ";
        if (Object.keys(playerScores).length !== players.length) logReason += `PlayerScores not fully init (${Object.keys(playerScores).length}/${players.length}). `;
        console.log(logReason);
    }
  }, [
      gamePhase,
      actor, // If an actor gets set, this effect re-runs.
      playerRoulette.isRouletteSpinning,
      startActorSelectionRoulette, // Callback, depends on many things
      players.length, // Crucial for max turns
      totalTurnsCompleted, // Crucial for game progress
      numRounds, // Crucial for max turns
      // setGamePhase, // React setter, stable
      playerScores, // Crucial for eligible player calculation in startActorSelectionRoulette
    ]);

  const handleDifficultySelect = (difficulty) => {
    console.log('CharadesGame: handleDifficultySelect called with:', difficulty, 'isMountedRef:', isMountedRef.current, 'gameMode:', gameConfig.gameMode);
    if (!isMountedRef.current || !wordsData[difficulty] || gameConfig.gameMode !== 'system_word') {
        console.warn('CharadesGame: handleDifficultySelect - conditions not met or invalid call.');
        return;
    }
    console.log('CharadesGame: [handleDifficultySelect] Selecting category in itemSelector:', difficulty);
    itemSelector.selectCategory(difficulty);
    setGamePhase('word_assignment', 'Difficulty selected by user');
  };

  useEffect(() => {
    console.log(
      `CharadesGame: Item draw useEffect. Phase: '${gamePhase}', Mode: ${gameConfig?.gameMode}, Category: ${itemSelector.currentCategory}, ItemSelected: ${!!itemSelector.selectedItem}, Mounted: ${isMountedRef.current}`
    );
    if (gamePhase === 'word_assignment' &&
      gameConfig.gameMode === 'system_word' &&
      itemSelector.currentCategory && 
      !itemSelector.selectedItem && 
      isMountedRef.current) {
      console.log('CharadesGame: [Item draw useEffect] Conditions met. Drawing item for category:', itemSelector.currentCategory);
      itemSelector.drawItem(); // This should update itemSelector.selectedItem
    } else {
      // console.log('CharadesGame: [Item draw useEffect] Conditions not met or item already selected/drawn.');
    }
  }, [gamePhase, gameConfig?.gameMode, itemSelector.currentCategory, itemSelector.selectedItem, itemSelector.drawItem, isMountedRef]);

  useEffect(() => {
    console.log(
      `CharadesGame: Item drawn toast useEffect. Phase: '${gamePhase}', Mode: ${gameConfig?.gameMode}, SelectedItem: ${JSON.stringify(itemSelector.selectedItem)}, Actor: ${actor?.name}, Mounted: ${isMountedRef.current}`
    );
    if (gamePhase === 'word_assignment' &&
      gameConfig.gameMode === 'system_word' &&
      itemSelector.selectedItem && // An item has been successfully drawn
      itemSelector.selectedItem.categoryName && // It's a system word with category info
      actor && // Actor is set
      isMountedRef.current) {

      const difficulty = itemSelector.selectedItem.categoryName;
      const baseScore = itemSelector.selectedItem.baseScore;
      console.log(`CharadesGame: [Item drawn toast useEffect] Item drawn: ${itemSelector.selectedItem.rawItem}, Category: ${difficulty}, Base Score: ${baseScore}. Showing toast.`);

      if (baseScore !== undefined) {
        toast.info(`${actor.name} selected ${difficulty.toUpperCase()} difficulty (Base Score: ${baseScore})`);
      } else {
        const fallbackBaseScore = wordsData[difficulty]?.baseScore;
        console.warn(`CharadesGame: [Item drawn toast useEffect] Base score undefined in selectedItem, trying fallback. Fallback: ${fallbackBaseScore}`);
        if (fallbackBaseScore !== undefined) {
          toast.info(`${actor.name} selected ${difficulty.toUpperCase()} difficulty (Base Score: ${fallbackBaseScore}, fallback)`);
        } else {
          toast.error(`Error determining base score for ${difficulty}.`);
        }
      }
    } else {
        // console.log('CharadesGame: [Item drawn toast useEffect] Conditions not met for showing toast.');
    }
  }, [gamePhase, gameConfig?.gameMode, itemSelector.selectedItem, actor, wordsData, isMountedRef]);

  const handleShowWord = () => {
    console.log('CharadesGame: handleShowWord called. gameMode:', gameConfig.gameMode, 'selectedItem:', itemSelector.selectedItem?.rawItem);
    if (gameConfig.gameMode === 'system_word' && itemSelector.selectedItem?.rawItem) {
      setIsWordVisible(true);
      setGamePhase('ready_to_act', 'Word shown to actor (system_word)');
    } else {
        console.warn('CharadesGame: handleShowWord - conditions not met (not system_word or no item).');
    }
  };
  
  const handleActorReadyWithOwnWord = () => {
     console.log('CharadesGame: handleActorReadyWithOwnWord called. gameMode:', gameConfig.gameMode, 'actor:', actor?.name);
     if (gameConfig.gameMode === 'own_word' && actor) {
        setGamePhase('ready_to_act', 'Actor confirmed ready (own_word)');
        toast.info(`${actor.name} is ready with their word/phrase!`);
     } else {
         console.warn('CharadesGame: handleActorReadyWithOwnWord - not own_word mode or no actor.');
     }
  };

  const handleStartActing = () => {
    console.log('CharadesGame: handleStartActing called. isMountedRef:', isMountedRef.current, 'Actor:', actor?.name);
    if (!isMountedRef.current || !actor) {
        console.warn('CharadesGame: handleStartActing - component unmounted or no actor.');
        return;
    }
    console.log('CharadesGame: [handleStartActing] Resetting and starting game timer.');
    gameTimer.resetTimer();
    gameTimer.startTimer();
    setGamePhase('acting_in_progress', 'Acting phase started by actor');
  };

  const handleWordGuessed = () => {
    console.log('CharadesGame: handleWordGuessed called. isMountedRef:', isMountedRef.current, 'Actor:', actor?.name);
    if (!isMountedRef.current || !actor) {
        console.warn('CharadesGame: handleWordGuessed - component unmounted or no actor.');
        return;
    }
    console.log('CharadesGame: [handleWordGuessed] Stopping game timer, word guessed.');
    gameTimer.stopTimer(); // Stop timer immediately
    handleRoundEnd(true); // Pass true for guessedSuccessfully
  };

  const handleRoundEnd = (guessedSuccessfully) => {
    console.log(`CharadesGame: handleRoundEnd called. Guessed: ${guessedSuccessfully}, Actor: ${actor?.name}, isMountedRef: ${isMountedRef.current}, CurrentTime: ${gameTimer.currentTime}`);
    if (!isMountedRef.current || !actor) {
        console.warn('CharadesGame: handleRoundEnd - component unmounted or no actor, cannot process round end.');
        // If no actor, something is very wrong, perhaps try to recover or go to error state.
        // For now, just log and return to prevent crashes.
        if (!actor) {
            setGamePhase('actor_selection_start', 'Error: Round ended without an actor.');
        }
        return;
    }
    gameTimer.stopTimer(); // Ensure timer is stopped if not already (e.g. timeout already did)
    const timeTaken = Math.max(1, gameTimer.currentTime); // Use current time from timer
    let roundScore = 0;

    const baseScoreForRound = itemSelector.selectedItem?.baseScore || 0; 
    console.log(`CharadesGame: [handleRoundEnd] Details - Time taken: ${timeTaken}s, Base score for round: ${baseScoreForRound}`);

    if (guessedSuccessfully && baseScoreForRound > 0) {
      const maxTime = gameConfig?.actingTimeSeconds || actingTime;
      roundScore = Math.round(baseScoreForRound * (maxTime / timeTaken));
      console.log(`CharadesGame: [handleRoundEnd] Guessed successfully. Score calculated: ${roundScore}. Max time: ${maxTime}.`);
      toast.success(`Guessed! ${actor.name} scored ${roundScore} points! (Time: ${formatTime(timeTaken)})`);
      
      setPlayerScores(prevScores => {
        console.log(`CharadesGame: [handleRoundEnd] Updating playerScores for ${actor.id}. Prev:`, prevScores[actor.id]);
        const currentActorScoreData = prevScores[actor.id] || { name: actor.name, totalScore: 0, roundsPlayed: 0 };
        const newScores = {
          ...prevScores,
          [actor.id]: {
            ...currentActorScoreData,
            totalScore: (currentActorScoreData.totalScore || 0) + roundScore,
            roundsPlayed: (currentActorScoreData.roundsPlayed || 0) + 1,
          }
        };
        console.log(`CharadesGame: [handleRoundEnd] New playerScores for ${actor.id}:`, newScores[actor.id]);
        return newScores;
      });
    } else {
      const wordDisplay = itemSelector.selectedItem?.rawItem || (itemSelector.selectedItem?.isPlayerChoice ? "(chosen by player)" : "(word not set)");
      console.log(`CharadesGame: [handleRoundEnd] Guessed unsuccessfully or no base score. Word was: ${wordDisplay}. No points for ${actor.name}.`);
      toast.warn(guessedSuccessfully ? `No base score for ${actor.name}! Word: ${wordDisplay}. No points.` : `Time's up for ${actor.name}! Word was: ${wordDisplay}. No points this round.`);
       setPlayerScores(prevScores => {
        console.log(`CharadesGame: [handleRoundEnd] Updating playerScores (roundsPlayed) for ${actor.id}. Prev:`, prevScores[actor.id]);
        const currentActorScoreData = prevScores[actor.id] || { name: actor.name, totalScore: 0, roundsPlayed: 0 };
        const newScores = {
          ...prevScores,
          [actor.id]: {
            ...currentActorScoreData,
            totalScore: currentActorScoreData.totalScore || 0, 
            roundsPlayed: (currentActorScoreData.roundsPlayed || 0) + 1,
          }
        };
        console.log(`CharadesGame: [handleRoundEnd] New playerScores (roundsPlayed) for ${actor.id}:`, newScores[actor.id]);
        return newScores;
      });
    }
    setTotalTurnsCompleted(prev => {
      const newTotal = prev + 1;
      console.log(`CharadesGame: [handleRoundEnd] Incrementing totalTurnsCompleted from ${prev} to ${newTotal}`);
      return newTotal;
    });
    setGamePhase('round_over', `Round ended for ${actor.name}. Guessed: ${guessedSuccessfully}`);
  };

  const handleNextRound = () => {
    console.log(`CharadesGame: handleNextRound called. isMountedRef: ${isMountedRef.current}, totalTurnsCompleted: ${totalTurnsCompleted}, players.length: ${players.length}, numRounds: ${numRounds}`);
    if (!isMountedRef.current) {
        console.warn('CharadesGame: handleNextRound - component unmounted.');
        return;
    }
    const maxPossibleTurns = players.length * numRounds;
    if (players.length > 0 && totalTurnsCompleted >= maxPossibleTurns) {
      console.log(`CharadesGame: [handleNextRound] Game over condition met. Total turns (${totalTurnsCompleted}) >= Max turns (${maxPossibleTurns}).`);
      setGamePhase('game_over', 'All rounds completed as determined by handleNextRound');
    } else if (players.length === 0) {
      console.error('CharadesGame: [handleNextRound] No players found, cannot proceed. Setting to game_over.');
      setGamePhase('game_over', 'No players in game');
    } else {
      console.log(`CharadesGame: [handleNextRound] Proceeding to next round. Current turns: ${totalTurnsCompleted}, Max turns: ${maxPossibleTurns}.`);
      // Actor is reset implicitly when actor_selection_start phase begins and startActorSelectionRoulette runs.
      // Explicitly set actor to null here to ensure the condition `!actor` in the useEffect for actor selection is met.
      setActor(null); 
      setGamePhase('actor_selection_start', 'Transitioning to next round setup');
    }
  };
  
  if (gamePhase === 'loading' || !gameConfig || players.length === 0) {
    // This log might be noisy if it re-renders often in loading state
    // console.log(`CharadesGame: Rendering Loading state. Phase: ${gamePhase}, Config: ${!!gameConfig}, Players: ${players.length}`);
    return <div className="text-center py-10 text-xl text-blue-300">Loading Charades Game... (Phase: {gamePhase}, Players: {players.length})</div>;
  }
  // console.log(`CharadesGame: Rendering main UI for gamePhase: ${gamePhase}`);

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
          {console.log("CharadesGame: Rendering GAME OVER section. playerScores:", JSON.stringify(playerScores))}
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
              onClick={() => {
                console.log("CharadesGame: Play Again button clicked.");
                navigate('/charades/setup');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              Play Again
            </button>
            <button
              onClick={() => {
                console.log("CharadesGame: Back to Home button clicked.");
                navigate('/');
              }}
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
          {gameConfig.gameMode === 'system_word' && itemSelector.currentCategory && (
            <>
              <p className="text-sm text-gray-300">Difficulty: <span className="font-semibold text-yellow-300">{itemSelector.currentCategory.toUpperCase()}</span> (Base: {itemSelector.selectedItem?.baseScore || 'N/A'} pts)</p>
            </>
          )}
          {gameConfig.gameMode === 'own_word' && itemSelector.selectedItem?.isPlayerChoice && (
            <>
              <p className="text-sm text-gray-300">Mode: <span className="font-semibold text-yellow-300">Player's Choice</span> (Base: {itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} pts)</p>
            </>
          )}
        </div>
      )}

      {gamePhase === 'actor_selection_roulette' && (
        <>
          {console.log("CharadesGame: Rendering PlayerRouletteDisplay. isSpinning:", playerRoulette.isRouletteSpinning, "displayText:", playerRoulette.rouletteDisplayText)}
          <PlayerRouletteDisplay
            title="Selecting Actor..."
            displayText={playerRoulette.rouletteDisplayText}
            isSpinning={playerRoulette.isRouletteSpinning}
          />
        </>
      )}

      {gamePhase === 'difficulty_selection' && actor && gameConfig.gameMode === 'system_word' && (
        <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
          {console.log("CharadesGame: Rendering difficulty_selection UI for actor:", actor.name)}
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
          {console.log("CharadesGame: Rendering word_assignment UI for actor:", actor.name, "Mode:", gameConfig.gameMode, "Selected Item:", JSON.stringify(itemSelector.selectedItem))}
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
             <p className="text-red-400 mb-4">Error: No words available for {itemSelector.currentCategory}. Please try another difficulty or check data.</p>
          )}
           {gameConfig.gameMode === 'system_word' && !itemSelector.currentCategory && ( 
             <p className="text-yellow-400 mb-4">Awaiting word assignment... this usually means itemSelector is still processing or category was not set properly.</p>
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
          {console.log("CharadesGame: Rendering ready_to_act UI for actor:", actor.name, "Mode:", gameConfig.gameMode, "WordVisible:", isWordVisible, "Item:", JSON.stringify(itemSelector.selectedItem))}
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
          {console.log("CharadesGame: Rendering acting_in_progress UI. Actor:", actor.name, "Timer:", gameTimer.formattedTime)}
          <p className="text-2xl text-yellow-400 mb-2 animate-pulse">ACTING!</p>
          {gameConfig.gameMode === 'system_word' && itemSelector.selectedItem?.rawItem && ( 
             <p className="text-sm text-gray-500 mb-1">(Word: {isWordVisible ? itemSelector.selectedItem.rawItem : "Hidden from guessers"})</p>
          )}
          {gameConfig.gameMode === 'system_word' && itemSelector.currentCategory && (
            <p className="text-sm text-gray-400 mb-2">Difficulty: {itemSelector.currentCategory.toUpperCase()} | Base Score: {itemSelector.selectedItem?.baseScore || 'N/A'} pts</p>
          )}
          {gameConfig.gameMode === 'own_word' && itemSelector.selectedItem?.isPlayerChoice && (
             <p className="text-sm text-gray-400 mb-2">Player's Choice | Base Score for timing: {itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} pts</p>
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
          {console.log("CharadesGame: Rendering round_over UI. Actor:", actor.name, "TotalTurnsCompleted:", totalTurnsCompleted, "MaxTurns:", players.length * numRounds)}
          <p className="text-2xl text-gray-200 mb-4">
            Round over for <span className="font-bold text-blue-400">{actor.name}</span>!
          </p>
          <button onClick={handleNextRound} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl mb-4">
            {totalTurnsCompleted >= players.length * numRounds ? 'Show Final Scores' : 'Next Round'}
          </button>
          {console.log("CharadesGame: Rendering ROUND OVER Leaderboard. playerScores:", JSON.stringify(playerScores))}
          <Leaderboard
            title="Current Scores"
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
        <>
          {console.log("CharadesGame: Rendering MID-GAME Leaderboard for phase:", gamePhase, "playerScores:", JSON.stringify(playerScores))}
          <Leaderboard
            title="Current Scores"
            players={players}
            playerScores={playerScores}
            primarySortField="totalScore"
            secondarySortField="roundsPlayed"
            secondarySortOrder="asc"
            displayFormatter={charadesLeaderboardFormatter}
          />
        </>
      )}

    </div>
  );
}

export default CharadesGame;