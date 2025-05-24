import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/utils_hooks/usePlayerRoulette';
import useItemSelector from '../../Utils/utils_hooks/useItemSelector';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';
import useGameTimer, { formatTime } from '../../Utils/utils_hooks/useGameTimer';
// import GameTimerDisplay from '../../Utils/utils_gameplay/GameTimerDisplay'; // Not directly used in this file anymore
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

// Import main category data
import actionsVerbsData from '../data/actions_verbs.json';
import activitiesData from '../data/activities.json';
import animalsData from '../data/animals.json';
import booksData from '../data/books.json';
import emotionsFeelingsData from '../data/emotions_feelings.json';
import famousPeopleData from '../data/famous_people.json';
import foodDrinksData from '../data/food_drinks.json';
import householdObjectsData from '../data/household_objects.json';
import moviesData from '../data/movies.json';
import mythologyFolkloreData from '../data/mythology_folklore.json';
import occupationsData from '../data/occupations.json';
import placesData from '../data/places.json';
import songsData from '../data/songs.json';
import sportsHobbiesData from '../data/sports_hobbies.json';
import tvShowsData from '../data/tv_shows.json';


// Import phase components
import CharadesGameOver from '../components/CharadesGameOver';
import CharadesActorSelection from '../components/CharadesActorSelection';
import CharadesDifficultySelection from '../components/CharadesDifficultySelection';
import CharadesWordAssignment from '../components/CharadesWordAssignment';
import CharadesReadyToAct from '../components/CharadesReadyToAct';
import CharadesActing from '../components/CharadesActing';
import CharadesRoundOver from '../components/CharadesRoundOver';

const ALL_CHARADES_DATA = {
  actions_verbs: actionsVerbsData,
  activities: activitiesData,
  animals: animalsData,
  books: booksData,
  emotions_feelings: emotionsFeelingsData,
  famous_people: famousPeopleData,
  food_drinks: foodDrinksData,
  household_objects: householdObjectsData,
  movies: moviesData,
  mythology_folklore: mythologyFolkloreData,
  occupations: occupationsData,
  places: placesData,
  songs: songsData,
  sports_hobbies: sportsHobbiesData,
  tv_shows: tvShowsData,
};

const PLAYER_ROULETTE_DURATION = 2500;
const OWN_WORD_BASE_SCORE = 25;

function CharadesGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig } = location.state || {};
  console.log('CharadesGame: Initial render. gameConfig:', gameConfig);

  const [players, setPlayers] = useState([]);
  const [playerScores, setPlayerScores] = useState({});
  const [actor, setActor] = useState(null);
  const [numRounds, setNumRounds] = useState(2);
  const [totalTurnsCompleted, setTotalTurnsCompleted] = useState(0);
  const [gamePhase, setGamePhaseState] = useState('loading');
  const [currentRoundMainCategoryInfo, setCurrentRoundMainCategoryInfo] = useState(null); // { id, name, data }
  const [isWordVisible, setIsWordVisible] = useState(false);

  const isMountedRef = useRef(true);

  const setGamePhase = (newPhase, reason = "") => {
    console.log(`CharadesGame: GamePhase from '${gamePhase}' to '${newPhase}'. Reason: ${reason || 'N/A'}`);
    if (gamePhase !== newPhase) {
      setGamePhaseState(newPhase);
    }
  };

  useEffect(() => {
    console.log(`CharadesGame: Game phase actually changed to: '${gamePhase}'`);
  }, [gamePhase]);
  
  const playerRoulette = usePlayerRoulette(players);
  
  const actingTime = gameConfig?.actingTimeSeconds || 90;
  const gameTimer = useGameTimer({
    maxSeconds: actingTime,
    onTimeout: () => {
      if (isMountedRef.current && gamePhase === 'acting_in_progress') {
        handleRoundEnd(false);
      }
    },
    countUp: true,
  });

  const itemSelector = useItemSelector({
    itemsData: currentRoundMainCategoryInfo?.data || null, // Dynamic data based on selected main category
    options: {
      itemKey: 'words', // Key for the array of words/phrases within each difficulty
      allowPlayerChoice: gameConfig?.taskAssignmentMode === 'player_assigned',
      playerChoiceDefaultData: { baseScore: OWN_WORD_BASE_SCORE },
      // defaultCategory: 'easy' // Optional: default difficulty (sub-category)
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
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
      setPlayers(gameConfig.players || []);
      setNumRounds(gameConfig.numRounds || 2);
    }
    
    if (gamePhase === 'loading' && isMountedRef.current && gameConfig.players?.length > 0) {
      const initialScores = {};
      gameConfig.players.forEach(p => {
        initialScores[p.id] = { name: p.name, totalScore: 0, roundsPlayed: 0 };
      });
      setPlayerScores(initialScores);
      setTotalTurnsCompleted(0);
      playerRoulette.setSelectedPlayer(null); 
      setGamePhase('actor_selection_start', 'Game initialized');
    }
  }, [gameConfig, navigate, gamePhase]); // playerRoulette.setSelectedPlayer removed from deps

  const onActorSelected = useCallback((selectedActor) => {
    if (!isMountedRef.current) return;
    if (!selectedActor) {
      toast.error("Failed to select an actor.");
      setGamePhase('actor_selection_start', 'Actor selection failed');
      return;
    }

    setActor(selectedActor);
    toast.success(`${selectedActor.name} is the Actor!`);
    itemSelector.resetSelection(); // Reset any previous item/sub-category selection

    if (gameConfig.taskAssignmentMode === 'system_assigned') {
      const mainCategoriesToChooseFrom = (gameConfig.selectedMainCategories || []).filter(catId => ALL_CHARADES_DATA[catId]);
      
      if (mainCategoriesToChooseFrom.length === 0) {
        toast.error("No valid game categories selected or data missing!");
        setGamePhase('game_over', 'No valid categories for system_assigned mode');
        return;
      }
      
      const chosenMainCatId = mainCategoriesToChooseFrom[Math.floor(Math.random() * mainCategoriesToChooseFrom.length)];
      // Find the category name from the setup config, or derive it
      const categoryConfig = gameConfig.availableMainCategories?.find(cat => cat.id === chosenMainCatId);
      const categoryName = categoryConfig?.name || chosenMainCatId.charAt(0).toUpperCase() + chosenMainCatId.slice(1).replace(/_/g, ' ');

      const newMainCategoryInfo = {
        id: chosenMainCatId,
        name: categoryName,
        data: ALL_CHARADES_DATA[chosenMainCatId],
      };
      setCurrentRoundMainCategoryInfo(newMainCategoryInfo);
      // itemSelector's useEffect will pick up newMainCategoryInfo.data
      toast.info(`${selectedActor.name} will act from the "${newMainCategoryInfo.name}" category!`);
      setGamePhase('difficulty_selection', 'Main category assigned');

    } else { // player_assigned mode
      setCurrentRoundMainCategoryInfo({ id: 'player_assigned', name: "Player's Choice", data: null });
      itemSelector.setPlayerChosenItem({ baseScore: OWN_WORD_BASE_SCORE });
      toast.info(`Base score for this round: ${OWN_WORD_BASE_SCORE} (Player's Choice)`);
      setGamePhase('word_assignment', 'Actor selected for player_assigned mode');
    }
  }, [gameConfig, itemSelector, isMountedRef]);


  const startActorSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    
    setGamePhase('actor_selection_roulette', 'Starting actor selection');
    setActor(null);
    // itemSelector.resetSelection(); // Moved to onActorSelected to ensure it runs after main category is set
    setIsWordVisible(false);
    gameTimer.resetTimer();
    setCurrentRoundMainCategoryInfo(null); // Clear previous main category for the round

    let eligiblePlayers = [];
    if (Object.keys(playerScores).length === players.length) {
      const minTurns = Math.min(...Object.values(playerScores).map(ps => ps.roundsPlayed));
      eligiblePlayers = players.filter(p => playerScores[p.id]?.roundsPlayed === minTurns);
    }
    if (eligiblePlayers.length === 0) eligiblePlayers = [...players]; // Fallback

    if (eligiblePlayers.length === 0 && totalTurnsCompleted < players.length * numRounds) {
        toast.error("Critical error: Could not determine next player.");
        setGamePhase('game_over', 'Critical error in actor selection');
        return;
    }
    
    if (eligiblePlayers.length === 1) {
      onActorSelected(eligiblePlayers[0]);
    } else if (eligiblePlayers.length > 0) {
      playerRoulette.spinPlayerRoulette(PLAYER_ROULETTE_DURATION, onActorSelected, eligiblePlayers);
    }
  }, [players, playerScores, numRounds, totalTurnsCompleted, onActorSelected, gameTimer, playerRoulette, isMountedRef]);

  useEffect(() => {
    if (
      gamePhase === 'actor_selection_start' &&
      !playerRoulette.isRouletteSpinning &&
      !actor &&
      players.length > 0 &&
      Object.keys(playerScores).length === players.length
    ) {
       const maxPossibleTurns = players.length * numRounds;
       if (totalTurnsCompleted < maxPossibleTurns) {
          startActorSelectionRoulette();
       } else {
          setGamePhase('game_over', 'All turns completed');
       }
    }
  }, [gamePhase, actor, playerRoulette.isRouletteSpinning, startActorSelectionRoulette, players.length, totalTurnsCompleted, numRounds, playerScores]);

  // Difficulty is the sub-category e.g. "easy", "medium", "hard"
  const handleDifficultySelect = (difficulty) => {
    if (!isMountedRef.current || gameConfig.taskAssignmentMode !== 'system_assigned' || !currentRoundMainCategoryInfo?.data?.[difficulty]) {
        toast.error("Invalid difficulty selection or data missing.");
        return;
    }
    itemSelector.selectCategory(difficulty); // This sets itemSelector.currentCategory to the difficulty
    setGamePhase('word_assignment', 'Difficulty selected by user');
  };

  // Item Drawing useEffect (when difficulty is selected for system_assigned)
  useEffect(() => {
    if (gamePhase === 'word_assignment' &&
      gameConfig.taskAssignmentMode === 'system_assigned' &&
      itemSelector.currentCategory && // currentCategory is now difficulty (e.g. "easy")
      !itemSelector.selectedItem && 
      currentRoundMainCategoryInfo?.data && // Ensure main category data is loaded
      isMountedRef.current) {
      itemSelector.drawItem();
    }
  }, [gamePhase, gameConfig?.taskAssignmentMode, itemSelector.currentCategory, itemSelector.selectedItem, itemSelector.drawItem, currentRoundMainCategoryInfo?.data, isMountedRef]);

  // Toast for Item Drawn
  useEffect(() => {
    if (gamePhase === 'word_assignment' &&
      gameConfig.taskAssignmentMode === 'system_assigned' &&
      itemSelector.selectedItem &&
      itemSelector.selectedItem.categoryName && // This is the difficulty/sub-category
      actor &&
      currentRoundMainCategoryInfo?.name && // Main category name
      isMountedRef.current) {

      const difficultyName = itemSelector.selectedItem.categoryName;
      const baseScore = itemSelector.selectedItem.baseScore;
      
      if (baseScore !== undefined) {
        toast.info(`${actor.name} selected ${difficultyName.toUpperCase()} difficulty from "${currentRoundMainCategoryInfo.name}" (Base Score: ${baseScore})`);
      } else {
        toast.error(`Error determining base score for ${difficultyName} in ${currentRoundMainCategoryInfo.name}.`);
      }
    }
  }, [gamePhase, gameConfig?.taskAssignmentMode, itemSelector.selectedItem, actor, currentRoundMainCategoryInfo?.name, isMountedRef]);

  const handleShowWord = () => {
    if (gameConfig.taskAssignmentMode === 'system_assigned' && itemSelector.selectedItem?.rawItem) {
      setIsWordVisible(true);
      setGamePhase('ready_to_act', 'Word shown to actor');
    }
  };
  
  const handleActorReadyWithOwnWord = () => {
     if (gameConfig.taskAssignmentMode === 'player_assigned' && actor) {
        setGamePhase('ready_to_act', 'Actor ready with own word');
        toast.info(`${actor.name} is ready with their word/phrase!`);
     }
  };

  const handleStartActing = () => {
    if (!isMountedRef.current || !actor) return;
    gameTimer.resetTimer();
    gameTimer.startTimer();
    setGamePhase('acting_in_progress', 'Acting started');
  };

  const handleWordGuessed = () => {
    if (!isMountedRef.current || !actor) return;
    gameTimer.stopTimer();
    handleRoundEnd(true);
  };

  const handleRoundEnd = (guessedSuccessfully) => {
    if (!isMountedRef.current || !actor) {
        if (!actor) setGamePhase('actor_selection_start', 'Error: Round ended without actor.');
        return;
    }
    gameTimer.stopTimer();
    const timeTaken = Math.max(1, gameTimer.currentTime);
    let roundScore = 0;
    const baseScoreForRound = itemSelector.selectedItem?.baseScore || 0; 

    if (guessedSuccessfully && baseScoreForRound > 0) {
      const maxTime = gameConfig?.actingTimeSeconds || actingTime;
      roundScore = Math.round(baseScoreForRound * (maxTime / timeTaken));
      toast.success(`Guessed! ${actor.name} scored ${roundScore} pts! (Time: ${formatTime(timeTaken)})`);
    } else {
      const wordDisplay = itemSelector.selectedItem?.rawItem || (itemSelector.selectedItem?.isPlayerChoice ? "(Player's Choice)" : "(Word not set)");
      const reason = guessedSuccessfully ? `No base score for ${actor.name}! Word: ${wordDisplay}.` : `Time's up for ${actor.name}! Word: ${wordDisplay}.`;
      toast.warn(`${reason} No points.`);
    }
    
    setPlayerScores(prevScores => ({
      ...prevScores,
      [actor.id]: {
        ...prevScores[actor.id],
        totalScore: (prevScores[actor.id]?.totalScore || 0) + roundScore,
        roundsPlayed: (prevScores[actor.id]?.roundsPlayed || 0) + 1,
      }
    }));
    setTotalTurnsCompleted(prev => prev + 1);
    setGamePhase('round_over', `Round ended for ${actor.name}`);
  };

  const handleNextRound = () => {
    if (!isMountedRef.current) return;
    const maxPossibleTurns = players.length * numRounds;
    if (players.length > 0 && totalTurnsCompleted >= maxPossibleTurns) {
      setGamePhase('game_over', 'All rounds completed');
    } else if (players.length === 0) {
      setGamePhase('game_over', 'No players');
    } else {
      setActor(null); 
      setGamePhase('actor_selection_start', 'Next round');
    }
  };
  
  if (gamePhase === 'loading' || !gameConfig || players.length === 0) {
    return <div className="text-center py-10 text-xl text-blue-300">Loading Charades Game... (Phase: {gamePhase})</div>;
  }

  const charadesLeaderboardFormatter = (player, scoreData, rank) => (
    <li key={player.id} className="flex justify-between items-center p-2 bg-gray-600 rounded">
      <span className="text-gray-100">{rank}. {player.name}</span>
      <span className="text-sm text-blue-300">
        Score: {scoreData?.totalScore || 0} (Rounds: {scoreData?.roundsPlayed || 0})
      </span>
    </li>
  );
  
  // const displayMainCategoryName = currentRoundMainCategoryInfo?.name || "N/A"; // Not needed here anymore
  // const displayDifficulty = itemSelector.currentCategory || "N/A"; // Not needed here anymore

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 text-white rounded-lg shadow-2xl min-h-[calc(100vh-150px)] flex flex-col space-y-4">
      <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">Charades!</h2>
      <div className="text-xs text-center text-gray-400 mb-1">
          Mode: {gameConfig.taskAssignmentMode === 'system_assigned' ? 'System Assigned' : 'Player Assigned'}
          {gameConfig.taskAssignmentMode === 'system_assigned' && currentRoundMainCategoryInfo?.name && gamePhase !== 'actor_selection_roulette' && gamePhase !== 'difficulty_selection' && ` | Current Main Category: ${currentRoundMainCategoryInfo.name}`}
          {' | '}Max Time: {formatTime(actingTime)}
      </div>
      {players.length > 0 && numRounds > 0 && gamePhase !== 'game_over' && gamePhase !== 'loading' && (
        <GameProgressDisplay
          currentTurn={totalTurnsCompleted + 1}
          totalTurns={players.length * numRounds}
        />
      )}

      {gamePhase === 'game_over' && (
        <CharadesGameOver
          players={players}
          playerScores={playerScores}
          onPlayAgain={() => navigate('/charades/setup')}
          onGoHome={() => navigate('/')}
          leaderboardFormatter={charadesLeaderboardFormatter}
        />
      )}

      {gamePhase !== 'game_over' && actor && !['actor_selection_roulette', 'loading'].includes(gamePhase) && (
        <div className="p-3 bg-gray-700 rounded-lg text-center shadow-md mb-4">
          <p className="text-lg text-gray-100">Actor: <span className="font-bold text-blue-300">{actor.name}</span></p>
          
          {gameConfig.taskAssignmentMode === 'system_assigned' && currentRoundMainCategoryInfo?.name && (
             <p className="text-sm text-gray-300">
              Main Category: <span className="font-semibold text-yellow-300">{currentRoundMainCategoryInfo.name}</span>
            </p>
          )}

          {gameConfig.taskAssignmentMode === 'system_assigned' && itemSelector.currentCategory && ( // itemSelector.currentCategory is the difficulty
            <p className="text-sm text-gray-300">
              Difficulty: <span className="font-semibold text-yellow-300">{itemSelector.currentCategory.toUpperCase()}</span>
              {itemSelector.selectedItem && ` (Base: ${itemSelector.selectedItem.baseScore ?? 'N/A'} pts)`}
            </p>
          )}

          {gameConfig.taskAssignmentMode === 'player_assigned' && itemSelector.selectedItem?.isPlayerChoice && (
            <p className="text-sm text-gray-300">
              Mode: <span className="font-semibold text-yellow-300">Player's Choice</span>
              (Base: {itemSelector.selectedItem?.baseScore || OWN_WORD_BASE_SCORE} pts)
            </p>
          )}
        </div>
      )}

      {gamePhase === 'actor_selection_roulette' && (
        <CharadesActorSelection
          displayText={playerRoulette.rouletteDisplayText}
          isSpinning={playerRoulette.isRouletteSpinning}
        />
      )}

      {gamePhase === 'difficulty_selection' && actor && gameConfig.taskAssignmentMode === 'system_assigned' && (
        <CharadesDifficultySelection
          actorName={actor.name}
          onDifficultySelect={handleDifficultySelect}
          mainCategoryData={currentRoundMainCategoryInfo?.data} // Pass the data for the current main category
          mainCategoryName={currentRoundMainCategoryInfo?.name}
        />
      )}

      {gamePhase === 'word_assignment' && actor && (
        <CharadesWordAssignment
          actorName={actor.name}
          taskAssignmentMode={gameConfig.taskAssignmentMode}
          currentDifficulty={itemSelector.currentCategory} // This is difficulty (e.g. "easy")
          mainCategoryName={currentRoundMainCategoryInfo?.name}
          selectedItem={itemSelector.selectedItem}
          isWordVisible={isWordVisible}
          onShowWord={handleShowWord}
          onActorReadyWithOwnWord={handleActorReadyWithOwnWord}
        />
      )}
      
      {gamePhase === 'ready_to_act' && actor && (
        <CharadesReadyToAct
          actorName={actor.name}
          taskAssignmentMode={gameConfig.taskAssignmentMode}
          isWordVisible={isWordVisible}
          selectedItem={itemSelector.selectedItem}
          currentDifficulty={itemSelector.currentCategory} // This is difficulty
          mainCategoryName={currentRoundMainCategoryInfo?.name}
          onStartActing={handleStartActing}
        />
      )}

      {gamePhase === 'acting_in_progress' && actor && (
        <CharadesActing
          taskAssignmentMode={gameConfig.taskAssignmentMode}
          isWordVisible={isWordVisible}
          selectedItem={itemSelector.selectedItem}
          currentDifficulty={itemSelector.currentCategory} // This is difficulty
          mainCategoryName={currentRoundMainCategoryInfo?.name}
          ownWordBaseScore={OWN_WORD_BASE_SCORE}
          formattedTimerTime={gameTimer.formattedTime}
          actingTime={actingTime}
          onWordGuessed={handleWordGuessed}
        />
      )}

      {gamePhase === 'round_over' && actor && (
        <CharadesRoundOver
          actorName={actor.name}
          totalTurnsCompleted={totalTurnsCompleted}
          maxTurns={players.length * numRounds}
          onNextRound={handleNextRound}
          players={players}
          playerScores={playerScores}
          leaderboardFormatter={charadesLeaderboardFormatter}
        />
      )}
      
      {!['game_over', 'round_over', 'loading', 'actor_selection_roulette', 'difficulty_selection'].includes(gamePhase) && players.length > 0 && (
        <Leaderboard
          title="Current Scores"
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