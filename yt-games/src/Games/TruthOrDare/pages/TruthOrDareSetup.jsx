import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout'; // Import the layout
import Modal from '../../Utils/utils_components/Modal'; // Import the new Modal component
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = [
    { id: "Family", name: "👨‍👩‍👧‍👦 Family" },
    { id: "Friends", name: "🧑‍🤝‍🧑 Friends" },
    { id: "Relationship", name: "❤️‍🔥 Relationship (18+)" }
];
const SESSION_STORAGE_KEY = 'truthOrDareSetup';
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategory: null,
  // turnProgression is now fixed to 'random' and not part of default state for user selection
  gameMode: 'classic',
  rRatedModalConfirmed: false,
  numberOfTurns: 10, // 0 for unlimited
};

function TruthOrDareSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  
  const [selectedCategory, setSelectedCategory] = useState(defaultState.selectedCategory);
  // turnProgression is now fixed to 'random' and not a state variable for user selection.
  const turnProgression = 'random'; // Always random
  const [gameMode, setGameMode] = useState(defaultState.gameMode);
  const [numberOfTurns, setNumberOfTurns] = useState(defaultState.numberOfTurns);
  
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(defaultState.rRatedModalConfirmed);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
        setSelectedCategory(parsedSettings.selectedCategory || defaultState.selectedCategory);
        // turnProgression is fixed, no need to load/set from storage for this
        setGameMode(parsedSettings.gameMode || defaultState.gameMode);
        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
        setNumberOfTurns(parsedSettings.numberOfTurns === undefined ? defaultState.numberOfTurns : parsedSettings.numberOfTurns);
        // turnProgression is a const, no need to load from session storage
        }
        } catch (error) {
      console.error("Failed to load Truth or Dare settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      numPlayersUI,
      playerNames,
      selectedCategory,
      // turnProgression is fixed, but can be saved for consistency if needed elsewhere, though not user-configurable
      turnProgression: 'random',
      gameMode,
      rRatedModalConfirmed,
      numberOfTurns,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Truth or Dare settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategory, gameMode, rRatedModalConfirmed, numberOfTurns]);

  useEffect(() => {
    if (gameMode === 'pair') {
      setSelectedCategory(null);
      setRRatedModalConfirmed(false);
      setShowRRatedModal(false); // Fixed typo: setShowRRedirectModal -> setShowRRatedModal
      if (errors.category) setErrors(prev => ({ ...prev, category: null }));
    }
  }, [gameMode, errors.category]);

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

    if (gameMode === 'classic' && !selectedCategory) {
      newErrors.category = 'Please select a category for Classic mode.';
    }
    
    if (gameMode === 'classic' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
        newErrors.category = 'Please confirm age restriction for Relationship category.';
        if (updateState && !showRRatedModal) setShowRRatedModal(true);
    }

    if (numberOfTurns < 0 || numberOfTurns > 50) {
      newErrors.numberOfTurns = 'Number of turns must be between 0 (unlimited) and 50.';
    } else if (!Number.isInteger(numberOfTurns)) {
      newErrors.numberOfTurns = 'Number of turns must be a whole number.';
    }

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, gameMode, selectedCategory, rRatedModalConfirmed, showRRatedModal, numberOfTurns]);

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

  const handleCategoryChange = (categoryValue) => {
    setSelectedCategory(categoryValue);
    setRRatedModalConfirmed(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    if (categoryValue === 'Relationship') {
      setShowRRatedModal(true);
    } else {
      setShowRRatedModal(false);
    }
  };
  
  const handleGameModeChange = (mode) => {
    setGameMode(mode);
    setSelectedCategory(null); // Reset category when mode changes
    setShowRRatedModal(false);
    setRRatedModalConfirmed(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalCancel = () => {
    setSelectedCategory(null); // Deselect Relationship category
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    toast.info("Relationship category deselected. Please choose a category or confirm age if you reselect Relationship.");
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }
    if (gameMode === 'classic' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
        if (!showRRatedModal) setShowRRatedModal(true);
        toast.warn("Please confirm age restriction for Relationship category.");
        return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
    }));
    const gameConfig = {
      players: activePlayers,
      turnProgression,
      gameMode,
      selectedCategory: gameMode === 'classic' ? selectedCategory : null,
      numberOfTurns,
    };
    navigate('/truth-or-dare/play', { state: { gameConfig } });
  }, [validateForm, gameMode, selectedCategory, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, turnProgression, navigate, numberOfTurns]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategory(defaultState.selectedCategory);
    // turnProgression is a const, no need to reset
    setGameMode(defaultState.gameMode);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
    setNumberOfTurns(defaultState.numberOfTurns);
    setShowRRatedModal(false);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    let rRatedCheckPassed = true;
    if (gameMode === 'classic' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
      rRatedCheckPassed = false;
    }
    const numberOfTurnsValid = numberOfTurns >= 0 && numberOfTurns <= 50 && Number.isInteger(numberOfTurns);
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && rRatedCheckPassed && numberOfTurnsValid;
  }, [validateForm, playerNames, numPlayersUI, gameMode, selectedCategory, rRatedModalConfirmed, numberOfTurns]);


  // Memoize isValidToStartValue
  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  // Memoize navbarConfig
  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading,
    isValidToStart: isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isValidToStartValue]);

  // Ref pattern for prop callbacks
  const registerNavbarActionsRef = useRef(registerNavbarActions);
  const unregisterNavbarActionsRef = useRef(unregisterNavbarActions);

  useEffect(() => {
    // Keep refs updated with the latest props
    registerNavbarActionsRef.current = registerNavbarActions;
    unregisterNavbarActionsRef.current = unregisterNavbarActions;
  }, [registerNavbarActions, unregisterNavbarActions]);

  // Main useEffect for registering actions, now depends on the memoized navbarConfig
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
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Game Rules</h3>
        <GameOptionSelector
          label="Game Mode:"
          options={[
            { id: 'classic', value: 'classic', name: 'Classic (System assigns Truths & Dares)' },
            { id: 'pair', value: 'pair', name: 'Pair Mode (Players pick tasks)' },
          ]}
          selectedOption={gameMode}
          onOptionChange={(value) => handleGameModeChange(value)}
          type="radio"
          groupName="truthOrDareGameMode"
          isLoading={isLoading}
        />
      </div>

      {/* Category Selection (Conditional) */}
      {gameMode === 'classic' && (
        <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Category (Classic Mode)</h3>
          <GameOptionSelector
            options={CATEGORIES.map(cat => ({ id: cat.id, value: cat.id, name: cat.name }))}
            selectedOption={selectedCategory}
            onOptionChange={(value) => handleCategoryChange(value)}
            type="radio"
            groupName="truthOrDareCategory"
            isLoading={isLoading}
            error={errors.category}
            layoutClass="flex flex-wrap gap-3 justify-center p-2 rounded" // Custom layout for categories
            containerClass="bg-transparent border-none p-0" // Override default container for categories
          />
        </div>
      )}

      <Modal
        isOpen={showRRatedModal && selectedCategory === 'Relationship'}
        onClose={handleRRatedModalCancel}
        title="Age Restriction Warning!"
        titleColor="text-yellow-400"
        footerContent={
          <>
            <button onClick={handleRRatedModalCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">
              Go Back / Choose Another
            </button>
            <button onClick={handleRRatedModalConfirm} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md transition-colors">
              Confirm (All Players 18+)
            </button>
          </>
        }
      >
        <p>
          The "Relationship" category may contain content intended for players aged 18 and above.
          Please ensure all players meet this age requirement before proceeding.
        </p>
      </Modal>

      {/* Game Length Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">4. Game Length</h3>
        <StyledNumberInput
          id="number-of-turns"
          label="Number of Turns (1-50, 0 for unlimited):"
          value={numberOfTurns}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
                setNumberOfTurns(0); // Default to unlimited if input is not a number
            } else {
                setNumberOfTurns(Math.max(0, Math.min(50, val))); // Clamp between 0 and 50
            }
            if (errors.numberOfTurns) setErrors(prev => ({ ...prev, numberOfTurns: null }));
          }}
          min={0}
          max={50}
          step="1"
          disabled={isLoading}
          error={errors.numberOfTurns}
          containerClassName="flex flex-col items-start w-full sm:w-1/2"
          labelClassName="mb-2 text-sm font-medium text-gray-200"
          inputClassName="text-center"
        />
      </div>

    </SetupPageLayout>
  );
}

export default TruthOrDareSetup;