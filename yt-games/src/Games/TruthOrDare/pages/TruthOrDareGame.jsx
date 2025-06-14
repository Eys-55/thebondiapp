import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/utils_hooks/usePlayerRoulette';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';

// Import new UI components
import TruthOrDareHeader from '../components/TruthOrDareHeader';
import TruthOrDarePlayerInfo from '../components/TruthOrDarePlayerInfo';
import TruthOrDareLoading from '../components/TruthOrDareLoading';
import TruthOrDareError from '../components/TruthOrDareError';
import TruthOrDareGameOver from '../components/TruthOrDareGameOver';
import TruthOrDareResponseAnimation from '../components/TruthOrDareResponseAnimation';
import TruthOrDareClassicChoice from '../components/TruthOrDareClassicChoice';
import TruthOrDareTaskSelection from '../components/TruthOrDareTaskSelection';
import TruthOrDarePairChoice from '../components/TruthOrDarePairChoice';
import TruthOrDareTaskReveal from '../components/TruthOrDareTaskReveal';
import TruthOrDareTurnEnd from '../components/TruthOrDareTurnEnd';
import TruthOrDarePendingAsker from '../components/TruthOrDarePendingAsker';


const ROULETTE_INTERVAL = 100;
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
  const [asker, setAsker] = useState(null);
  const [turnsPlayed, setTurnsPlayed] = useState(0);

  const [gamePhase, setGamePhase] = useState('loading');

  const [currentTask, setCurrentTask] = useState({ type: '', text: '' });
  const [taskSelectionText, setTaskSelectionText] = useState('');
  const [responseAnimation, setResponseAnimation] = useState(null);
  
  const taskRouletteIntervalRef = useRef(null);
  const taskRouletteTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const playerRoulette = usePlayerRoulette(players);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchData = async () => {
      try {
        // Ensure paths are correct for fetching within public or served assets
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
      isMountedRef.current = false;
      clearInterval(taskRouletteIntervalRef.current);
      clearTimeout(taskRouletteTimeoutRef.current);
    };
  }, [navigate]);

  useEffect(() => {
    if (!gameConfig && gamePhase !== 'loading' && isMountedRef.current) {
      toast.error("Game configuration missing. Returning to setup.");
      navigate('/truth-or-dare/setup');
    }
  }, [gameConfig, gamePhase, navigate]);

  useEffect(() => {
    if (!isMountedRef.current || !gameConfig || Object.keys(allTruthsData).length === 0 || Object.keys(allDaresData).length === 0) {
      return;
    }
    setPlayers(gameConfig.players);
    if (gameConfig.taskAssignmentMode === 'system_assigned' && gameConfig.selectedCategory) {
        const categoryTruths = allTruthsData[gameConfig.selectedCategory] || [];
        const categoryDares = allDaresData[gameConfig.selectedCategory] || [];
        setFilteredTruthTexts(categoryTruths.map(item => item.text));
        setFilteredDareTexts(categoryDares.map(item => item.text));
    } else if (gameConfig.taskAssignmentMode === 'player_assigned') {
        setFilteredTruthTexts([]); // Player assigned mode doesn't use pre-filtered lists from categories
        setFilteredDareTexts([]);
    }
    if (gamePhase === 'loading') {
      playerRoulette.setSelectedPlayer(null);
      setGamePhase('player_selection_start');
    }
  }, [gameConfig, allTruthsData, allDaresData, gamePhase, playerRoulette]);

  const startDoerSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    setGamePhase('doer_selection_roulette');
    setDoer(null);
    setAsker(null);
    let preSelectedDoer = null;
    if (gameConfig.turnProgression === 'sequential' && players.length > 0) {
        preSelectedDoer = players[currentPlayerIndex];
    }
    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selectedByHook) => {
      if (!isMountedRef.current) return;
      const finalSelectedDoer = preSelectedDoer || selectedByHook;
      setDoer(finalSelectedDoer);
      playerRoulette.setRouletteDisplayText(finalSelectedDoer.name);
      toast.success(`${finalSelectedDoer.name} is the Doer!`);
      if (gameConfig.turnProgression === 'sequential') {
        setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
      }
      if (gameConfig.taskAssignmentMode === 'system_assigned') {
        setGamePhase('classic_choice_pending');
      } else { // player_assigned
        setGamePhase('doer_selected_pending_asker_selection');
      }
    }, players);
  }, [players, gameConfig, currentPlayerIndex, playerRoulette]);

  const startAskerSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || !doer || players.length < 1) {
        toast.error("Error in player setup for Pair Mode.");
        setGamePhase('turn_ended');
        return;
    }
    setGamePhase('asker_selection_roulette');
    const potentialAskers = players.filter(p => p.id !== doer.id);
    if (potentialAskers.length === 0) {
        const fallbackAsker = (players.length === 1 && players[0].id === doer.id) ? doer : (players.length > 0 ? players[0] : doer);
        setAsker(fallbackAsker);
        playerRoulette.setRouletteDisplayText(fallbackAsker.name);
        toast.info(`${fallbackAsker.name} will also be the Asker.`);
        setGamePhase('pair_doer_chooses_type');
        return;
    }
    playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, (selectedAsker) => {
      if (!isMountedRef.current) return;
      setAsker(selectedAsker);
      toast.info(`${selectedAsker.name} is the Asker!`);
      setGamePhase('pair_doer_chooses_type');
    }, potentialAskers);
  }, [players, doer, playerRoulette]);

  useEffect(() => {
    if (gamePhase === 'player_selection_start') {
      startDoerSelectionRoulette();
    } else if (gamePhase === 'doer_selected_pending_asker_selection') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) startAskerSelectionRoulette();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, startDoerSelectionRoulette, startAskerSelectionRoulette]);
  
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
        setGamePhase('classic_choice_pending');
        return;
    }
    setGamePhase('task_selection_roulette');
    setCurrentTask({ type: taskType, text: '' });
    setTaskSelectionText(`Choosing a ${taskType}...`);
    let currentIndex = 0;
    taskRouletteIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        currentIndex = (currentIndex + 1) % taskPool.length;
        setTaskSelectionText(taskPool[currentIndex].substring(0, 30) + '...');
    }, ROULETTE_INTERVAL);
    taskRouletteTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        clearInterval(taskRouletteIntervalRef.current);
        const selectedTaskText = taskPool[Math.floor(Math.random() * taskPool.length)];
        setCurrentTask({ type: taskType, text: selectedTaskText });
        setGamePhase('task_revealed_system');
    }, TASK_ROULETTE_DURATION);
  }, [filteredTruthTexts, filteredDareTexts]);

  const handlePairDoerChoosesType = (choice) => {
    if (!doer || !asker) {
        toast.error("Error: Doer or Asker not set for Pair Mode.");
        setGamePhase('turn_ended');
        return;
    }
    setCurrentTask({
        type: choice,
        text: `It's time for a ${choice.toUpperCase()}! ${asker.name}, please give ${doer.name} the task verbally.`
    });
    setGamePhase('task_revealed_verbal');
  };
  
  const handleDoerResponse = (accepted) => {
    if (!isMountedRef.current || !doer || !currentTask.type) return;
    setGamePhase('doer_responds');
    if (accepted) {
      toast.info(`${doer.name} accepted the ${currentTask.type}!`);
      setResponseAnimation({ type: 'accepted', doerName: doer.name, taskType: currentTask.type });
    } else {
      toast.warn(`${doer.name} rejected the ${currentTask.type}!`);
      setResponseAnimation({ type: 'rejected', doerName: doer.name, taskType: currentTask.type });
    }
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
    setAsker(null);
    setCurrentTask({ type: '', text: '' });
    playerRoulette.setRouletteDisplayText('');
    setTaskSelectionText('');
    setGamePhase('player_selection_start');
  };

  const noTasksAvailableForClassic = gameConfig && gameConfig.taskAssignmentMode === 'system_assigned' &&
                                   filteredTruthTexts.length === 0 && filteredDareTexts.length === 0 &&
                                   Object.keys(allTruthsData).length > 0 && Object.keys(allDaresData).length > 0;

  // === Render Logic ===
  if (gamePhase === 'loading' || !gameConfig || players.length === 0 || (Object.keys(allTruthsData).length === 0 && Object.keys(allDaresData).length === 0)) {
    return <TruthOrDareLoading />;
  }
  
  if (gamePhase === 'game_over') {
    return <TruthOrDareGameOver
             numberOfTurns={gameConfig.numberOfTurns}
             onPlayAgain={() => navigate('/truth-or-dare/setup')}
             onGoHome={() => navigate('/')}
           />;
  }

  if (noTasksAvailableForClassic && gamePhase !== 'loading') {
     return <TruthOrDareError
              message="No truths or dares could be found for the selected category."
              category={gameConfig.selectedCategory}
              onGoToSetup={() => navigate('/truth-or-dare/setup')}
            />;
  }

  return (
    <>
      {responseAnimation && (
        <TruthOrDareResponseAnimation
          type={responseAnimation.type}
          doerName={responseAnimation.doerName}
          taskType={responseAnimation.taskType}
        />
      )}
      <div className={`max-w-2xl mx-auto p-6 bg-gray-800 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col space-y-4 ${responseAnimation ? 'filter blur-sm pointer-events-none' : ''}`}>
        <TruthOrDareHeader gameConfig={gameConfig} turnsPlayed={turnsPlayed} />

        {(gamePhase === 'doer_selection_roulette' || gamePhase === 'asker_selection_roulette') && (
          <PlayerRouletteDisplay
            title={`Selecting ${gamePhase === 'doer_selection_roulette' ? 'Doer' : 'Asker'}...`}
            displayText={playerRoulette.rouletteDisplayText}
            isSpinning={playerRoulette.isRouletteSpinning}
          />
        )}
        
        {doer && (gamePhase !== 'doer_selection_roulette' && gamePhase !== 'player_selection_start' && gamePhase !== 'loading' && gamePhase !== 'turn_ended' && gamePhase !== 'doer_responds' && gamePhase !== 'asker_selection_roulette') && (
          <TruthOrDarePlayerInfo doer={doer} asker={asker} taskAssignmentMode={gameConfig.taskAssignmentMode} />
        )}
        
        {gameConfig.taskAssignmentMode === 'player_assigned' && doer && gamePhase === 'doer_selected_pending_asker_selection' && (
          <TruthOrDarePendingAsker />
        )}

        {gameConfig.taskAssignmentMode === 'system_assigned' && gamePhase === 'classic_choice_pending' && doer && (
          <TruthOrDareClassicChoice
            doerName={doer.name}
            onChoice={handleClassicChoice}
            truthDisabled={filteredTruthTexts.length === 0}
            dareDisabled={filteredDareTexts.length === 0}
          />
        )}
        {gameConfig.taskAssignmentMode === 'system_assigned' && gamePhase === 'task_selection_roulette' && (
          <TruthOrDareTaskSelection
            title={`Choosing a ${currentTask.type}...`}
            currentSelectionText={taskSelectionText}
          />
        )}
        {(gamePhase === 'task_revealed_system' || gamePhase === 'task_revealed_verbal') && doer && currentTask.text && (
          <TruthOrDareTaskReveal
            taskAssignmentMode={gameConfig.taskAssignmentMode}
            doerName={doer.name}
            askerName={asker?.name}
            taskType={currentTask.type}
            taskText={currentTask.text}
            onResponse={handleDoerResponse}
          />
        )}

        {gameConfig.taskAssignmentMode === 'player_assigned' && gamePhase === 'pair_doer_chooses_type' && asker && doer && (
          <TruthOrDarePairChoice
            doerName={doer.name}
            askerName={asker.name}
            onChoice={handlePairDoerChoosesType}
          />
        )}
        
        {gamePhase === 'turn_ended' && doer && (
          <TruthOrDareTurnEnd doerName={doer.name} onNextTurn={handleNextTurn} />
        )}
      </div>
    </>
  );
}

export default TruthOrDareGame;