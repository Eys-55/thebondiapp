import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const ROULETTE_INTERVAL = 100;
const PLAYER_ROULETTE_DURATION = 2500;
const TASK_ROULETTE_DURATION = 1500;

function TruthOrDareGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig } = location.state || {};

  const [allTruths, setAllTruths] = useState({});
  const [allDares, setAllDares] = useState({});
  const [filteredTruths, setFilteredTruths] = useState([]);
  const [filteredDares, setFilteredDares] = useState([]);
  
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // For sequential
  const [doer, setDoer] = useState(null); // Player A
  const [commander, setCommander] = useState(null); // Player B (for Pair mode)

  const [gamePhase, setGamePhase] = useState('loading');
  // Phases: loading, player_selection_start, player_selection_roulette,
  // classic_choice_pending, pair_commander_chooses_type,
  // task_selection_roulette, task_revealed_system,
  // pair_commander_defines_task, task_revealed_player_defined,
  // doer_responds, turn_ended

  const [currentTask, setCurrentTask] = useState({ type: '', text: '' }); // type: 'truth' or 'dare'
  const [rouletteDisplayText, setRouletteDisplayText] = useState('');
  const [playerDefinedTaskText, setPlayerDefinedTaskText] = useState('');
  
  const rouletteIntervalRef = useRef(null);
  const rouletteTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Load T/D data
  useEffect(() => {
    isMountedRef.current = true;
    const fetchData = async () => {
      try {
        const truthsRes = await fetch('/src/TruthOrDare/data/truths.json');
        const daresRes = await fetch('/src/TruthOrDare/data/dares.json');
        if (!truthsRes.ok || !daresRes.ok) throw new Error("Failed to load T/D data.");
        const truthsData = await truthsRes.json();
        const daresData = await daresRes.json();
        setAllTruths(truthsData);
        setAllDares(daresData);
      } catch (error) {
        toast.error(`Error loading data: ${error.message}`);
        navigate('/truth-or-dare/setup');
      }
    };
    fetchData();
    return () => { isMountedRef.current = false; };
  }, [navigate]);

  // Initialize game with config
  useEffect(() => {
    if (!gameConfig || Object.keys(allTruths).length === 0 || Object.keys(allDares).length === 0) {
      if (gameConfig && (Object.keys(allTruths).length === 0 || Object.keys(allDares).length === 0) && gamePhase !== 'loading') {
        // Data not loaded yet, but config is there. Wait for data.
      } else if (!gameConfig && gamePhase !== 'loading') {
        toast.error("Game configuration missing. Returning to setup.");
        navigate('/truth-or-dare/setup');
      }
      return;
    }

    setPlayers(gameConfig.players);
    
    const getFilteredItems = (allItems, selectedCategories) => {
      return selectedCategories.reduce((acc, cat) => acc.concat(allItems[cat] || []), []);
    };

    setFilteredTruths(getFilteredItems(allTruths, gameConfig.selectedTruthCategories));
    setFilteredDares(getFilteredItems(allDares, gameConfig.selectedDareCategories));
    
    setGamePhase('player_selection_start');

    return () => {
      clearInterval(rouletteIntervalRef.current);
      clearTimeout(rouletteTimeoutRef.current);
    };
  }, [gameConfig, allTruths, allDares, navigate]); // Removed gamePhase from dependencies


  const startPlayerSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    setGamePhase('player_selection_roulette');
    setDoer(null); setCommander(null); // Reset roles
    
    let namesToSpin = players.map(p => p.name);
    if (gameConfig.gameMode === 'pair') namesToSpin = players.map(p => `${p.name} (Doer?)`);

    setRouletteDisplayText(namesToSpin[0]);
    let currentIndex = 0;
    
    rouletteIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      currentIndex = (currentIndex + 1) % namesToSpin.length;
      setRouletteDisplayText(namesToSpin[currentIndex]);
    }, ROULETTE_INTERVAL);

    rouletteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      clearInterval(rouletteIntervalRef.current);

      let selectedDoer;
      if (gameConfig.turnProgression === 'sequential') {
        selectedDoer = players[currentPlayerIndex];
        setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
      } else { // random
        selectedDoer = players[Math.floor(Math.random() * players.length)];
      }
      setDoer(selectedDoer);
      toast.success(`${selectedDoer.name} is the Doer!`);

      if (gameConfig.gameMode === 'classic') {
        setGamePhase('classic_choice_pending');
      } else { // pair mode
        // Select Commander (must be different from Doer)
        let potentialCommanders = players.filter(p => p.id !== selectedDoer.id);
        if (potentialCommanders.length === 0 && players.length > 0) { // Only one player left, or only one player total (edge case for <2 players)
            potentialCommanders = players; // Allow self-command if only one player (should not happen with MIN_PLAYERS=2)
        }
        const selectedCommander = potentialCommanders[Math.floor(Math.random() * potentialCommanders.length)];
        setCommander(selectedCommander);
        toast.info(`${selectedCommander.name} is the Commander!`);
        setGamePhase('pair_commander_chooses_type');
      }
    }, PLAYER_ROULETTE_DURATION);
  }, [players, gameConfig, currentPlayerIndex]);

  const startTaskSelectionRoulette = useCallback((taskType) => { // 'truth' or 'dare'
    if (!isMountedRef.current) return;
    const taskPool = taskType === 'truth' ? filteredTruths : filteredDares;
    if (taskPool.length === 0) {
        toast.error(`No ${taskType}s available in selected categories!`);
        // Revert to previous choice phase
        if (gameConfig.gameMode === 'classic') setGamePhase('classic_choice_pending');
        else setGamePhase('pair_commander_chooses_type');
        return;
    }
    setGamePhase('task_selection_roulette');
    setCurrentTask({ type: taskType, text: '' });
    setRouletteDisplayText(`Choosing a ${taskType}...`);
    let currentIndex = 0;

    rouletteIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        currentIndex = (currentIndex + 1) % taskPool.length;
        setRouletteDisplayText(taskPool[currentIndex].substring(0, 30) + '...');
    }, ROULETTE_INTERVAL);

    rouletteTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        clearInterval(rouletteIntervalRef.current);
        const selectedTaskText = taskPool[Math.floor(Math.random() * taskPool.length)];
        setCurrentTask({ type: taskType, text: selectedTaskText });
        setGamePhase('task_revealed_system');
    }, TASK_ROULETTE_DURATION);
  }, [filteredTruths, filteredDares, gameConfig]);


  useEffect(() => {
    if (gamePhase === 'player_selection_start') {
      startPlayerSelectionRoulette();
    }
  }, [gamePhase, startPlayerSelectionRoulette]);


  const handleClassicChoice = (choice) => { // 'truth' or 'dare'
    startTaskSelectionRoulette(choice);
  };

  const handleCommanderChoosesType = (choice) => {
    if (gameConfig.pairModeTaskType === 'system') {
      startTaskSelectionRoulette(choice);
    } else { // player_defined
      setCurrentTask({ type: choice, text: '' });
      setGamePhase('pair_commander_defines_task');
    }
  };
  
  const handleCommanderSubmitDefinedTask = () => {
    if (!playerDefinedTaskText.trim()) {
        toast.warn("Commander, please enter a task!");
        return;
    }
    setCurrentTask(prev => ({ ...prev, text: playerDefinedTaskText.trim() }));
    setGamePhase('task_revealed_player_defined');
    setPlayerDefinedTaskText(''); // Clear input
  };

  const handleDoerResponse = (accepted) => {
    if (!isMountedRef.current || !doer) return;
    if (accepted) {
      toast.info(`${doer.name} accepted the challenge!`);
    } else {
      toast.warn(`${doer.name} rejected the challenge! (The group decides the consequence!)`);
    }
    setGamePhase('turn_ended');
  };

  const handleNextTurn = () => {
    if (!isMountedRef.current) return;
    setDoer(null);
    setCommander(null);
    setCurrentTask({ type: '', text: '' });
    setRouletteDisplayText('');
    setGamePhase('player_selection_start');
  };


  // --- Render Logic ---
  if (gamePhase === 'loading' || !gameConfig || players.length === 0 || (filteredTruths.length === 0 && filteredDares.length === 0 && Object.keys(allTruths).length > 0)) {
    return <div className="text-center py-10 text-xl text-purple-300">Loading Game & Data...</div>;
  }
  if (filteredTruths.length === 0 && filteredDares.length === 0 && gamePhase !== 'loading') {
     return (
        <div className="max-w-xl mx-auto p-6 bg-purple-800 rounded-lg shadow-xl text-white text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">No Tasks Available!</h2>
            <p className="text-purple-200 mb-6">No truths or dares could be found for the selected categories. Please go back and adjust your category selections.</p>
            <button onClick={() => navigate('/truth-or-dare/setup')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg">Back to Setup</button>
        </div>
     );
  }


  const renderPlayerSelection = () => (
    <div className="text-center my-10 p-8 bg-purple-800 rounded-lg">
      <p className="text-2xl text-purple-200 mb-2">Selecting Player(s)...</p>
      <p className="text-4xl font-bold text-yellow-400 h-12 animate-pulse">{rouletteDisplayText}</p>
    </div>
  );

  const renderClassicChoice = () => doer && (
    <div className="text-center my-10 p-8 bg-purple-800 rounded-lg">
      <p className="text-3xl font-semibold text-yellow-400 mb-6">{doer.name}, it's your turn!</p>
      <p className="text-xl text-purple-200 mb-6">Choose your fate:</p>
      <div className="flex justify-center gap-4">
        <button onClick={() => handleClassicChoice('truth')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-xl">Truth</button>
        <button onClick={() => handleClassicChoice('dare')} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-xl">Dare</button>
      </div>
    </div>
  );

  const renderPairCommanderChoosesType = () => commander && doer && (
    <div className="text-center my-10 p-8 bg-purple-800 rounded-lg">
      <p className="text-2xl font-semibold text-yellow-400 mb-2">{commander.name} (Commander), choose for {doer.name} (Doer):</p>
      <div className="flex justify-center gap-4 mt-4">
        <button onClick={() => handleCommanderChoosesType('truth')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-xl">Truth</button>
        <button onClick={() => handleCommanderChoosesType('dare')} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-xl">Dare</button>
      </div>
    </div>
  );
  
  const renderTaskSelectionRoulette = () => (
    <div className="text-center my-10 p-8 bg-purple-800 rounded-lg">
      <p className="text-2xl text-purple-200 mb-2">Choosing a {currentTask.type}...</p>
      <p className="text-4xl font-bold text-yellow-400 h-12 animate-pulse">{rouletteDisplayText}</p>
    </div>
  );

  const renderPairCommanderDefinesTask = () => commander && doer && (
    <div className="text-center my-6 p-6 bg-purple-800 rounded-lg">
        <p className="text-2xl font-semibold text-yellow-400 mb-3">{commander.name}, define the {currentTask.type} for {doer.name}:</p>
        <textarea
            value={playerDefinedTaskText}
            onChange={(e) => setPlayerDefinedTaskText(e.target.value)}
            placeholder={`Enter custom ${currentTask.type}...`}
            className="w-full p-2 rounded bg-purple-700 text-white border border-purple-500 focus:ring-yellow-400 focus:border-yellow-400 min-h-[80px]"
        />
        <button onClick={handleCommanderSubmitDefinedTask} className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-lg">Submit Task</button>
    </div>
  );

  const renderTaskRevealed = () => doer && currentTask.text && (
    <div className="text-center my-6 p-6 bg-purple-800 rounded-lg">
      <p className="text-2xl font-semibold text-yellow-400 mb-1">
        {doer.name}, your {currentTask.type} is:
      </p>
      {gamePhase === 'task_revealed_player_defined' && commander && <p className="text-sm text-purple-300 mb-3">(Task defined by {commander.name})</p>}
      <div className="bg-purple-700 p-4 rounded-md my-4 min-h-[100px] flex items-center justify-center">
          <p className="text-lg text-white">{currentTask.text}</p>
      </div>
      <p className="text-xl text-purple-200 mb-5">Will you accept?</p>
      <div className="flex justify-center gap-4">
        <button onClick={() => handleDoerResponse(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-lg">Accept</button>
        <button onClick={() => handleDoerResponse(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-lg">Reject</button>
      </div>
    </div>
  );
  
  const renderTurnEnded = () => doer && (
    <div className="text-center my-10 p-8 bg-purple-800 rounded-lg">
      <p className="text-2xl text-purple-200 mb-4">
        Turn for <span className="font-bold text-yellow-400">{doer.name}</span> is over.
      </p>
      <button onClick={handleNextTurn} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-lg text-xl">Next Turn</button>
    </div>
  );


  return (
    <div className="max-w-2xl mx-auto p-6 bg-purple-900 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col">
      <div className="flex-grow">
        <h2 className="text-3xl font-bold text-center text-purple-300 mb-2">Truth or Dare!</h2>
        <div className="text-xs text-center text-purple-400 mb-4">
            Mode: {gameConfig.gameMode} | Turn: {gameConfig.turnProgression}
            {gameConfig.gameMode === 'pair' && ` | Task: ${gameConfig.pairModeTaskType === 'system' ? 'System' : 'Player-Defined'}`}
        </div>

        {gamePhase === 'player_selection_roulette' && renderPlayerSelection()}
        {gamePhase === 'classic_choice_pending' && renderClassicChoice()}
        {gamePhase === 'pair_commander_chooses_type' && renderPairCommanderChoosesType()}
        {gamePhase === 'task_selection_roulette' && renderTaskSelectionRoulette()}
        {gamePhase === 'pair_commander_defines_task' && renderPairCommanderDefinesTask()}
        {(gamePhase === 'task_revealed_system' || gamePhase === 'task_revealed_player_defined') && renderTaskRevealed()}
        {gamePhase === 'turn_ended' && renderTurnEnded()}
      </div>
    </div>
  );
}

export default TruthOrDareGame;