import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout';
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition'; // Import transition component
import CategorySelectionModal from '../../Utils/utils_components/CategorySelectionModal';
import SelectedCategoriesDisplay from '../../Utils/utils_setup/SelectedCategoriesDisplay';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

const SESSION_STORAGE_KEY = 'charadesGameSettings'; // Define session storage key

const AVAILABLE_MAIN_CATEGORIES = [
  { id: 'animals', name: 'Animals' },
  { id: 'places', name: 'Places' },
  { id: 'activities', name: 'Activities' },
];

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  taskAssignmentMode: 'system_assigned', // formerly 'system_word'
  selectedMainCategories: ['animals'], // Default to 'animals' selected
  numRounds: 2, // Default number of rounds per player
  actingTimeSeconds: 90, // Default acting time per turn
};

function CharadesSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [taskAssignmentMode, setTaskAssignmentMode] = useState(defaultState.taskAssignmentMode);
  const [selectedMainCategories, setSelectedMainCategories] = useState(defaultState.selectedMainCategories);
  const [numRounds, setNumRounds] = useState(defaultState.numRounds);
  const [actingTimeSeconds, setActingTimeSeconds] = useState(defaultState.actingTimeSeconds);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // New state for transition
  const [transitionGameConfig, setTransitionGameConfig] = useState(null); // Store config for transition
  const gameRoutePath = '/charades/play'; // Define game route path

  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
        setTaskAssignmentMode(parsedSettings.taskAssignmentMode || defaultState.taskAssignmentMode);
        setSelectedMainCategories(parsedSettings.selectedMainCategories || defaultState.selectedMainCategories);
        setNumRounds(parsedSettings.numRounds || defaultState.numRounds);
        setActingTimeSeconds(parsedSettings.actingTimeSeconds || defaultState.actingTimeSeconds);
      }
    } catch (error) {
      console.error("Failed to load Charades settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      numPlayersUI,
      playerNames,
      taskAssignmentMode,
      selectedMainCategories,
      numRounds,
      actingTimeSeconds,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Charades settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, taskAssignmentMode, selectedMainCategories, numRounds, actingTimeSeconds]);

  const validateForm = useCallback((updateState = true) => {
    const newErrors = {};
    const currentPlayersToValidate = playerNames.slice(0, numPlayersUI);
    currentPlayersToValidate.forEach((name, index) => {
      if (!name.trim()) {
        if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
        newErrors.playerNames[index] = `Player ${index + 1} name is required.`;
      } else if (name.trim().length > 20) {
        if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
        newErrors.playerNames[index] = `Player ${index + 1} name max 20 chars.`;
      }
    });
    if (newErrors.playerNames && !newErrors.playerNames.some(e => e)) {
      delete newErrors.playerNames;
    }

    if (taskAssignmentMode === 'system_assigned' && selectedMainCategories.length === 0) {
      newErrors.selectedMainCategories = 'Please select at least one game category.';
    }

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, taskAssignmentMode, selectedMainCategories]);

  const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    if (errors.playerNames && errors.playerNames[index]) {
      const updatedPlayerErrors = [...(errors.playerNames || [])];
      updatedPlayerErrors[index] = null;
      setErrors(prev => ({ ...prev, playerNames: updatedPlayerErrors.some(e => e) ? updatedPlayerErrors : null }));
    }
  };

  const handleNumPlayersChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayersUI(count);
    const newPlayerNames = Array(count).fill('').map((_, i) => playerNames[i] || '');
    setPlayerNames(newPlayerNames);
    if (errors.playerNames) setErrors(prev => ({ ...prev, playerNames: null }));
  };

  const handleTaskAssignmentModeChange = (mode) => {
    setTaskAssignmentMode(mode);
    if (mode === 'player_assigned' && errors.selectedMainCategories) {
      setErrors(prev => ({ ...prev, selectedMainCategories: null }));
    }
  };

  // const handleSelectedMainCategoriesChange = (value, isChecked) => { // Old handler
  //   setSelectedMainCategories(prev =>
  //     isChecked
  //       ? [...prev, value]
  //       : prev.filter(c => c !== value)
  //   );
  //   if (errors.selectedMainCategories) {
  //       setErrors(prev => ({ ...prev, selectedMainCategories: null }));
  //   }
  // };

  const handleOpenCategoryModal = () => setIsCategoryModalOpen(true);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

  const handleConfirmCategorySelection = (newlySelectedIds) => {
    setSelectedMainCategories(Array.isArray(newlySelectedIds) ? newlySelectedIds : []);
    setIsCategoryModalOpen(false);
    if (errors.selectedMainCategories) {
        setErrors(prev => ({ ...prev, selectedMainCategories: null }));
    }
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
      score: 0,
      roundsPlayed: 0,
    }));
    const gameConfig = {
      players: activePlayers,
      taskAssignmentMode: taskAssignmentMode,
      selectedMainCategories: taskAssignmentMode === 'system_assigned' ? selectedMainCategories : [],
      numRounds,
      actingTimeSeconds,
      turnProgression: 'random', // Explicitly set
    };
    setTransitionGameConfig(gameConfig);
    setIsTransitioning(true);
  }, [validateForm, playerNames, numPlayersUI, taskAssignmentMode, selectedMainCategories, numRounds, actingTimeSeconds]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setTaskAssignmentMode(defaultState.taskAssignmentMode);
    setSelectedMainCategories(defaultState.selectedMainCategories);
    setNumRounds(defaultState.numRounds);
    setActingTimeSeconds(defaultState.actingTimeSeconds);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);
  
  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    const categoriesValid = taskAssignmentMode === 'player_assigned' || (taskAssignmentMode === 'system_assigned' && selectedMainCategories.length > 0);
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && categoriesValid;
  }, [validateForm, playerNames, numPlayersUI, taskAssignmentMode, selectedMainCategories]);

  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading || isTransitioning,
    isValidToStart: isTransitioning ? false : isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isTransitioning, isValidToStartValue]);

  const registerNavbarActionsRef = useRef(registerNavbarActions);
  const unregisterNavbarActionsRef = useRef(unregisterNavbarActions);

  useEffect(() => {
    registerNavbarActionsRef.current = registerNavbarActions;
    unregisterNavbarActionsRef.current = unregisterNavbarActions;
  }, [registerNavbarActions, unregisterNavbarActions]);

  useEffect(() => {
    const currentRegister = registerNavbarActionsRef.current;
    if (currentRegister) {
      currentRegister(navbarConfig);
    }
    return () => {
      const currentUnregister = unregisterNavbarActionsRef.current;
      if (currentUnregister) {
        currentUnregister();
      }
    };
  }, [navbarConfig]);

  const handleTransitionComplete = useCallback(() => {
    if (transitionGameConfig && gameRoutePath) {
      navigate(gameRoutePath, { state: { gameConfig: transitionGameConfig } });
    } else {
      console.error("CharadesSetup: Transition complete but game config or path missing.");
      toast.error("Failed to start game. Please try again.");
      setIsTransitioning(false);
      setIsLoading(false);
    }
  }, [navigate, transitionGameConfig, gameRoutePath]);

  if (isTransitioning) {
    return (
      <GameStartTransition
        gameName="Charades"
        onComplete={handleTransitionComplete}
      />
    );
  }

  return (
    <SetupPageLayout>
      {/* Player Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">1. Players</h3>
        <PlayerSetup
          minPlayers={MIN_PLAYERS}
          maxPlayers={MAX_PLAYERS}
          numPlayersUI={numPlayersUI}
          onNumPlayersChange={handleNumPlayersChange}
          playerNames={playerNames}
          onPlayerNameChange={handlePlayerNameChange}
          playerNameErrors={errors.playerNames}
          isLoading={isLoading}
        />
      </div>

      {/* Game Settings */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Word Source</h3>
        <GameOptionSelector
          label="How are words chosen?"
          options={[
            { id: 'system_assigned', value: 'system_assigned', name: 'System Assigns Word' },
            { id: 'player_assigned', value: 'player_assigned', name: 'Player Chooses Own Word' },
          ]}
          selectedOption={taskAssignmentMode}
          onOptionChange={(value) => handleTaskAssignmentModeChange(value)}
          type="radio"
          groupName="charadesTaskAssignmentMode"
          isLoading={isLoading}
        />
      </div>
      
      {/* Game Categories (conditional) */}
      {taskAssignmentMode === 'system_assigned' && (
        <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">
            Game Categories (Select at least one)
          </h3>
          <SelectedCategoriesDisplay
            selectedCategories={selectedMainCategories}
            allCategoriesData={AVAILABLE_MAIN_CATEGORIES}
            onManageCategoriesClick={handleOpenCategoryModal}
            error={errors.selectedMainCategories}
            disabled={isLoading}
            isLoading={isLoading}
            containerClass="bg-gray-700 p-0 border-none"
            buttonText="Manage Categories"
          />
        </div>
      )}
      {/* This modal can be outside the conditional rendering block if preferred,
          as its visibility is controlled by isCategoryModalOpen state,
          which would only be true if taskAssignmentMode === 'system_assigned' anyway */}
      {taskAssignmentMode === 'system_assigned' && (
        <CategorySelectionModal
          isOpen={isCategoryModalOpen}
          onClose={handleCloseCategoryModal}
          onConfirm={handleConfirmCategorySelection}
          title="Select Game Categories"
          allCategories={AVAILABLE_MAIN_CATEGORIES}
          initiallySelectedCategories={selectedMainCategories}
          allowMultiple={true}
        />
      )}


      {/* Number of Rounds Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Turns</h3>
        <div className="flex flex-col items-start">
          <label htmlFor="num-rounds-select" className="mb-1 text-sm font-medium text-textSecondary">Turns per Player (1-5):</label>
          <select
            id="num-rounds-select"
            value={numRounds}
            onChange={(e) => setNumRounds(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Acting Time Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">4. Turn Timer</h3>
        <div className="flex flex-col items-start">
          <label htmlFor="acting-time-select" className="mb-1 text-sm font-medium text-textSecondary">Time per Turn:</label>
          <select
            id="acting-time-select"
            value={actingTimeSeconds}
            onChange={(e) => setActingTimeSeconds(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500"
          >
            <option value="60">1 Minute</option>
            <option value="90">1 Minute 30 Seconds</option>
            <option value="120">2 Minutes</option>
            <option value="150">2 Minutes 30 Seconds</option>
            <option value="180">3 Minutes</option>
          </select>
        </div>
      </div>
    </SetupPageLayout>
  );
}

export default CharadesSetup;