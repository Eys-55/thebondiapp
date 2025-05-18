import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/utils_hooks/usePlayerRoulette';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay'; // Import GameProgressDisplay

const ROULETTE_INTERVAL = 100; // Kept for task roulette
const PLAYER_ROULETTE_DURATION = 2500;
const TASK_ROULETTE_DURATION = 1500;
const RESPONSE_ANIMATION_DURATION = 2500;

function TruthOrDareGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig } = location.state || {};

  const [allTruthsData, setAllTruthsData] = useState({});
  const [allDaresData, setAllDaresData] = useState({});
  
  const [filteredTruthTexts, setFilteredTruthTexts] = useState([]);
  const [filteredDareTexts, setFilteredDareTexts] = useState([]);
  
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [doer, setDoer] = useState(null);
  const [commander, setCommander] = useState(null);
  const [turnsPlayed, setTurnsPlayed] = useState(0);

  const [gamePhase, setGamePhase] = useState('loading');
  // Phases: loading, player_selection_start, doer_selection_roulette,
  // doer_selected_pending_commander_selection, commander_selection_roulette,
  // classic_choice_pending, pair_doer_chooses_type, task_selection_roulette,
  // task_revealed_system, task_revealed_verbal, doer_responds, turn_ended, game_over

  const [currentTask, setCurrentTask] = useState({ type: '', text: '' });
  const [taskSelectionText, setTaskSelectionText] = useState(''); // For task roulette display
  const [responseAnimation, setResponseAnimation] = useState(null);
  
  const taskRouletteIntervalRef = useRef(null);
  const taskRouletteTimeoutRef = useRef(null);
  const isMountedRef = useRef(true); // Component's own mounted ref

  const playerRoulette = usePlayerRoulette(players);

  useEffect(() => {
    isMountedRef.current = true; // Set on mount
    const fetchData = async () => {
      try {
        const truthsRes = await fetch('/src/Games/TruthOrDare/data/truths.json');
        const daresRes = await fetch('/src/Games/TruthOrDare/data/dares.json');
        if (!truthsRes.ok || !daresRes.ok) throw new Error("Failed to load T/D data.");
        const truthsData = await truthsRes.json();
        const daresData = await daresRes.json();
        if (isMountedRef.current) {
          setAllTruthsData(truthsData);
          setAllDaresData(daresData);
        }
      } catch (error) {
        if (isMountedRef.current) {
          toast.error(`Error loading data: ${error.message}`);
          navigate('/truth-or-dare/setup');
        }
      }
    };
    fetchData();
    return () => {
      isMountedRef.current = false; // Set on unmount
      clearInterval(taskRouletteIntervalRef.current);
      clearTimeout(taskRouletteTimeoutRef.current);
      // playerRoulette hook manages its own cleanup
    };
  }, [navigate]);

// Effect A: Handle missing game configuration post-loading
useEffect(() => {
  if (!gameConfig && gamePhase !== 'loading' && isMountedRef.current) {
    toast.error("Game configuration missing. Returning to setup.");
    navigate('/truth-or-dare/setup');
  }
}, [gameConfig, gamePhase, navigate]);

// Effect B: Initialize players, texts, and transition from 'loading' gamePhase
useEffect(() => {
  if (!isMountedRef.current) return; // Safety check

  // Wait for gameConfig and data to be loaded
  if (!gameConfig || Object.keys(allTruthsData).length === 0 || Object.keys(allDaresData).length === 0) {
    return;
  }

  // Set players based on gameConfig.
  setPlayers(gameConfig.players);

  // Set filtered texts based on gameConfig and data.
  if (gameConfig.gameMode === 'classic' && gameConfig.selectedCategory) {
      const categoryTruths = allTruthsData[gameConfig.selectedCategory] || [];
      const categoryDares = allDaresData[gameConfig.selectedCategory] || [];
      setFilteredTruthTexts(categoryTruths.map(item => item.text));
      setFilteredDareTexts(categoryDares.map(item => item.text));
  } else if (gameConfig.gameMode === 'pair') {
      setFilteredTruthTexts([]);
      setFilteredDareTexts([]);
  }

  // Transition from 'loading' phase once everything is ready.
  // This block will only run if gamePhase is 'loading'.
  if (gamePhase === 'loading') {
    playerRoulette.setSelectedPlayer(null); // Reset roulette's selected player before first selection.
    setGamePhase('player_selection_start');
  }
  // Dependencies: This effect re-runs if gameConfig, data, or gamePhase change.
  // All setter functions (setPlayers, setFiltered*, setGamePhase) and
  // playerRoulette.setSelectedPlayer are stable and don't cause re-runs by themselves.
}, [
    gameConfig,
    allTruthsData,
    allDaresData,
    gamePhase,
    // navigate, // Not used in this effect's body
    setPlayers,
    setFilteredTruthTexts,
    setFilteredDareTexts,
    setGamePhase,
    playerRoulette.setSelectedPlayer
]);

  const startDoerSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;

    setGamePhase('doer_selection_roulette');
    setDoer(null);
    setCommander(null);

    let preSelectedDoer = null;
    if (gameConfig.turnProgression === 'sequential' && players.length > 0) {
        preSelectedDoer = players[currentPlayerIndex];
    }

    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selectedByHook) => {
      if (!isMountedRef.current) return;
      
      const finalSelectedDoer = preSelectedDoer || selectedByHook;

      setDoer(finalSelectedDoer);
      playerRoulette.setRouletteDisplayText(finalSelectedDoer.name); // Ensure display text is correct if overridden
      toast.success(`${finalSelectedDoer.name} is the Doer!`);

      if (gameConfig.turnProgression === 'sequential') {
        setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
      }

      if (gameConfig.gameMode === 'classic') {
        setGamePhase('classic_choice_pending');
      } else {
        setGamePhase('doer_selected_pending_commander_selection');
      }
    }, players); // Spin from all players
  }, [players, gameConfig, currentPlayerIndex, playerRoulette]);

  const startCommanderSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || !doer || players.length < 1) {
        toast.error("Error in player setup for Pair Mode.");
        setGamePhase('turn_ended');
        return;
    }
    setGamePhase('commander_selection_roulette');
    const potentialCommanders = players.filter(p => p.id !== doer.id);
    
    if (potentialCommanders.length === 0) {
        const fallbackCommander = (players.length === 1 && players[0].id === doer.id) ? doer : (players.length > 0 ? players[0] : doer); // Broader fallback
        setCommander(fallbackCommander);
        playerRoulette.setRouletteDisplayText(fallbackCommander.name);
        toast.info(`${fallbackCommander.name} will also be the Commander.`);
        setGamePhase('pair_doer_chooses_type');
        return;
    }

    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selectedCommander) => {
      if (!isMountedRef.current) return;
      setCommander(selectedCommander);
      toast.info(`${selectedCommander.name} is the Commander!`);
      setGamePhase('pair_doer_chooses_type');
    }, potentialCommanders);
  }, [players, doer, playerRoulette]);

  useEffect(() => {
    if (gamePhase === 'player_selection_start') {
      startDoerSelectionRoulette();
    } else if (gamePhase === 'doer_selected_pending_commander_selection') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) startCommanderSelectionRoulette();
      }, 2000); // Delay before starting commander selection
      return () => clearTimeout(timer);
    }
  }, [gamePhase, startDoerSelectionRoulette, startCommanderSelectionRoulette]);
  
  useEffect(() => {
    if (responseAnimation && isMountedRef.current) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setResponseAnimation(null);
          setGamePhase('turn_ended');
        }
      }, RESPONSE_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [responseAnimation]);

  const handleClassicChoice = (choice) => {
    startSystemTaskSelectionRoulette(choice);
  };

  const startSystemTaskSelectionRoulette = useCallback((taskType) => {
    if (!isMountedRef.current) return;
    const taskPool = taskType === 'truth' ? filteredTruthTexts : filteredDareTexts;
    if (taskPool.length === 0) {
        toast.error(`No ${taskType}s available in the selected category: ${gameConfig.selectedCategory}!`);
        setGamePhase('classic_choice_pending'); // Go back to choice
        return;
    }
    setGamePhase('task_selection_roulette');
    setCurrentTask({ type: taskType, text: '' });
    setTaskSelectionText(`Choosing a ${taskType}...`); // Use specific state setter
    let currentIndex = 0;
    taskRouletteIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        currentIndex = (currentIndex + 1) % taskPool.length;
        setTaskSelectionText(taskPool[currentIndex].substring(0, 30) + '...'); // Use specific state setter
    }, ROULETTE_INTERVAL);
    taskRouletteTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        clearInterval(taskRouletteIntervalRef.current);
        const selectedTaskText = taskPool[Math.floor(Math.random() * taskPool.length)];
        setCurrentTask({ type: taskType, text: selectedTaskText });
        setGamePhase('task_revealed_system');
    }, TASK_ROULETTE_DURATION);
  }, [filteredTruthTexts, filteredDareTexts, gameConfig]);

  const handlePairDoerChoosesType = (choice) => {
    if (!doer || !commander) {
        toast.error("Error: Doer or Commander not set for Pair Mode.");
        setGamePhase('turn_ended');
        return;
    }
    setCurrentTask({
        type: choice,
        text: `It's time for a ${choice.toUpperCase()}! ${commander.name}, please give ${doer.name} the task verbally.`
    });
    setGamePhase('task_revealed_verbal');
  };
  
  const handleDoerResponse = (accepted) => {
    if (!isMountedRef.current || !doer || !currentTask.type) return;
    setGamePhase('doer_responds'); // Intermediate phase
    if (accepted) {
      toast.info(`${doer.name} accepted the ${currentTask.type}!`);
      setResponseAnimation({ type: 'accepted', doerName: doer.name, taskType: currentTask.type });
    } else {
      toast.warn(`${doer.name} rejected the ${currentTask.type}!`);
      setResponseAnimation({ type: 'rejected', doerName: doer.name, taskType: currentTask.type });
    }
    // useEffect for responseAnimation will handle moving to 'turn_ended'
  };

  const handleNextTurn = () => {
    if (!isMountedRef.current) return;

    const newTurnsPlayed = turnsPlayed + 1;
    setTurnsPlayed(newTurnsPlayed);

    if (gameConfig.numberOfTurns > 0 && newTurnsPlayed >= gameConfig.numberOfTurns) {
      setGamePhase('game_over');
      toast.success("Game Over! Maximum turns reached.");
      return;
    }

    setDoer(null);
    setCommander(null);
    setCurrentTask({ type: '', text: '' });
    playerRoulette.setRouletteDisplayText(''); // Reset player roulette display
    setTaskSelectionText(''); // Reset task roulette display
    setGamePhase('player_selection_start');
  };

  const noTasksAvailableForClassic = gameConfig && gameConfig.gameMode === 'classic' &&
                                   filteredTruthTexts.length === 0 && filteredDareTexts.length === 0 &&
                                   Object.keys(allTruthsData).length > 0 && Object.keys(allDaresData).length > 0;

  if (gamePhase === 'loading' || !gameConfig || players.length === 0 || (Object.keys(allTruthsData).length === 0 && Object.keys(allDaresData).length === 0)) {
    return <div className="text-center py-10 text-xl text-blue-300">Loading Game & Data...</div>;
  }
  
  if (gamePhase === 'game_over') {
    return (
        <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-white text-center">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
            <p className="text-gray-200 mb-6">
              {gameConfig.numberOfTurns > 0 ? `All ${gameConfig.numberOfTurns} turns have been played.` : "Hope you had fun!"}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => navigate('/truth-or-dare/setup')}
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
    );
  }


  if (noTasksAvailableForClassic && gamePhase !== 'loading') {
     return (
        <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-white text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">No Tasks Available!</h2>
            <p className="text-gray-200 mb-6">No truths or dares could be found for the selected category: "{gameConfig.selectedCategory}". Please go back and adjust your category selection.</p>
            <button onClick={() => navigate('/truth-or-dare/setup')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">Back to Setup</button>
        </div>
     );
  }

  // This render function is specifically for the TASK selection roulette
  const renderTaskRouletteScreen = (title, currentSelectionText) => (
    <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-2">{title}</p>
      <p className="text-4xl font-bold text-blue-400 h-12 animate-pulse">{currentSelectionText || '...'}</p>
    </div>
  );

  const renderClassicChoiceScreen = () => doer && (
    <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-3xl font-semibold text-blue-400 mb-6">{doer.name}, it's your turn!</p>
      <p className="text-xl text-gray-200 mb-6">Choose your fate:</p>
      <div className="flex justify-center gap-4">
        <button onClick={() => handleClassicChoice('truth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl" disabled={filteredTruthTexts.length === 0}>Truth</button>
        <button onClick={() => handleClassicChoice('dare')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl" disabled={filteredDareTexts.length === 0}>Dare</button>
      </div>
       {(filteredTruthTexts.length === 0 && filteredDareTexts.length === 0) && <p className="text-red-400 mt-4">No tasks available for the selected category.</p>}
       {filteredTruthTexts.length === 0 && filteredDareTexts.length > 0 && <p className="text-yellow-400 mt-4">No truths available for this category.</p>}
       {filteredDareTexts.length === 0 && filteredTruthTexts.length > 0 && <p className="text-yellow-400 mt-4">No dares available for this category.</p>}
    </div>
  );

  const renderPairDoerChoosesTypeScreen = () => commander && doer && (
    <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-2xl font-semibold text-gray-100 mb-4">
        {doer.name}, what will it be? <span className="text-blue-400">{commander.name}</span> will give you a task.
      </p>
      <div className="flex justify-center gap-4">
        <button onClick={() => handlePairDoerChoosesType('truth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl">Truth</button>
        <button onClick={() => handlePairDoerChoosesType('dare')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl">Dare</button>
      </div>
    </div>
  );
  
  const renderTaskRevealedScreen = () => doer && currentTask.text && (
    <div className="text-center my-6 p-6 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-2xl font-semibold text-blue-400 mb-1">
        {gameConfig.gameMode === 'pair' && commander
          ? `${commander.name}, your turn to assign!`
          : `${doer.name}, your ${currentTask.type} is:`}
      </p>
      
      <div className="bg-gray-700 p-4 rounded-md my-4 min-h-[100px] flex items-center justify-center">
          <p className="text-lg text-white text-center">
            {currentTask.text}
          </p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => handleDoerResponse(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-lg">Accept</button>
        <button onClick={() => handleDoerResponse(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-lg">Reject (Wuss Out)</button>
      </div>
    </div>
  );
  
  const renderTurnEndedScreen = () => doer && (
    <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-4">
        Turn for <span className="font-bold text-blue-400">{doer.name}</span> is over.
      </p>
      <button onClick={handleNextTurn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl">Next Turn</button>
    </div>
  );

  return (
    <>
      {responseAnimation && (
        <div
          className={`fixed inset-0 flex flex-col items-center justify-center z-[1000] animate-fade-in text-white text-center px-4
                      ${responseAnimation.type === 'accepted' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <h2 className="text-6xl font-extrabold mb-6">
            {responseAnimation.type === 'accepted' ? 'Accepted!' : 'Wussed Out!'}
          </h2>
          <p className="text-3xl">
            {responseAnimation.doerName}
            {responseAnimation.type === 'accepted'
              ? ` is taking on the ${responseAnimation.taskType}!`
              : ` chickened out of the ${responseAnimation.taskType}!`}
          </p>
        </div>
      )}
      <div className={`max-w-2xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col space-y-4 ${responseAnimation ? 'filter blur-sm pointer-events-none' : ''}`}>
        <div>
          <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">Truth or Dare!</h2>
          <div className="text-xs text-center text-gray-400 mb-1">
              Mode: {gameConfig.gameMode} | Player Order: {gameConfig.turnProgression}
          </div>
          {gameConfig.gameMode === 'classic' && gameConfig.selectedCategory && (
            <div className="text-xs text-center text-gray-400">
                Category: {gameConfig.selectedCategory}
            </div>
          )}
          {/* GameProgressDisplay for TruthOrDare - already implemented in previous step and aligns with current instructions */}
          {gameConfig && gamePhase !== 'game_over' && gamePhase !== 'loading' && (
            <GameProgressDisplay
              currentTurn={turnsPlayed + 1}
              totalTurns={gameConfig.numberOfTurns === 0 ? undefined : gameConfig.numberOfTurns}
              turnLabel="Turn" // Ensuring turnLabel is explicit if not default
              className="text-sm text-center text-gray-300 mt-1 mb-3"
            />
          )}
        </div>

        {gamePhase === 'doer_selection_roulette' && (
          <PlayerRouletteDisplay
            title="Selecting Doer..."
            displayText={playerRoulette.rouletteDisplayText}
            isSpinning={playerRoulette.isRouletteSpinning}
          />
        )}
        
        {doer && (gamePhase !== 'doer_selection_roulette' && gamePhase !== 'player_selection_start' && gamePhase !== 'loading' && gamePhase !== 'turn_ended' && gamePhase !== 'doer_responds') && (
            <div className={`p-3 bg-gray-700 rounded-lg text-center shadow-md ${gameConfig.gameMode === 'pair' ? 'mb-2' : 'mb-4'}`}>
                <p className="text-lg text-gray-100">Doer: <span className="font-bold text-blue-300">{doer.name}</span></p>
            </div>
        )}
        {gameConfig.gameMode === 'pair' && commander && (gamePhase !== 'doer_selection_roulette' && gamePhase !== 'commander_selection_roulette' && gamePhase !== 'player_selection_start' && gamePhase !== 'loading' && gamePhase !== 'turn_ended' && gamePhase !== 'doer_responds') && (
            <div className="p-3 bg-gray-700 rounded-lg text-center shadow-md mb-4">
                <p className="text-lg text-gray-100">Commander: <span className="font-bold text-blue-300">{commander.name}</span></p>
            </div>
        )}
        
        {gameConfig.gameMode === 'pair' && doer && gamePhase === 'doer_selected_pending_commander_selection' && (
          <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg">
            <p className="text-xl text-gray-300 animate-pulse">Now selecting Commander...</p>
          </div>
        )}
        {gameConfig.gameMode === 'pair' && gamePhase === 'commander_selection_roulette' && (
           <PlayerRouletteDisplay
            title="Selecting Commander..."
            displayText={playerRoulette.rouletteDisplayText}
            isSpinning={playerRoulette.isRouletteSpinning}
          />
        )}

        {gameConfig.gameMode === 'classic' && gamePhase === 'classic_choice_pending' && renderClassicChoiceScreen()}
        {gameConfig.gameMode === 'classic' && gamePhase === 'task_selection_roulette' && renderTaskRouletteScreen(`Choosing a ${currentTask.type}...`, taskSelectionText)}
        {gameConfig.gameMode === 'classic' && gamePhase === 'task_revealed_system' && renderTaskRevealedScreen()}

        {gameConfig.gameMode === 'pair' && gamePhase === 'pair_doer_chooses_type' && renderPairDoerChoosesTypeScreen()}
        {gameConfig.gameMode === 'pair' && gamePhase === 'task_revealed_verbal' && renderTaskRevealedScreen()}
        
        {gamePhase === 'turn_ended' && renderTurnEndedScreen()}
      </div>
    </>
  );
}

export default TruthOrDareGame;