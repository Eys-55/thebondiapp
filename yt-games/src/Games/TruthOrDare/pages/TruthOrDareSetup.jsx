import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/SetupPageLayout'; // Import the layout
import Modal from '../../Utils/Modal'; // Import the new Modal component

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = [
    { id: "Family", name: "Family" },
    { id: "Friends", name: "Friends" },
    { id: "Relationship", name: "Relationship (18+)" }
];
const SESSION_STORAGE_KEY = 'truthOrDareSetup';

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategory: null,
  turnProgression: 'random',
  gameMode: 'classic',
  rRatedModalConfirmed: false,
};

function TruthOrDareSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  
  const [selectedCategory, setSelectedCategory] = useState(defaultState.selectedCategory);
  const [turnProgression, setTurnProgression] = useState(defaultState.turnProgression);
  const [gameMode, setGameMode] = useState(defaultState.gameMode);
  
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
        setTurnProgression(parsedSettings.turnProgression || defaultState.turnProgression);
        setGameMode(parsedSettings.gameMode || defaultState.gameMode);
        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
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
      turnProgression,
      gameMode,
      rRatedModalConfirmed,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Truth or Dare settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategory, turnProgression, gameMode, rRatedModalConfirmed]);

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

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, gameMode, selectedCategory, rRatedModalConfirmed, showRRatedModal]);

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
    };
    navigate('/truth-or-dare/play', { state: { gameConfig } });
  }, [validateForm, gameMode, selectedCategory, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, turnProgression, navigate]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategory(defaultState.selectedCategory);
    setTurnProgression(defaultState.turnProgression);
    setGameMode(defaultState.gameMode);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
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
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && rRatedCheckPassed;
  }, [validateForm, playerNames, numPlayersUI, gameMode, selectedCategory, rRatedModalConfirmed]);


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
    <SetupPageLayout title="Truth or Dare Setup">
      {/* Player Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">1. Players</h3>
        <div className="mb-4 flex flex-col items-start">
          <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-textSecondary">Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS}):</label>
          <select id="num-players-select" value={numPlayersUI} onChange={handleNumPlayersChange} disabled={isLoading}
            className="w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {Array.from({ length: numPlayersUI }).map((_, index) => (
            <div key={`player-input-${index}`} className="mb-3 flex flex-col items-start">
              <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-textSecondary">Player {index + 1} Name:</label>
              <input type="text" id={`player-name-${index}`} value={playerNames[index] || ''} onChange={(e) => handlePlayerNameChange(index, e.target.value)} maxLength="20" placeholder={`Player ${index + 1} (max 20)`}
                className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-danger' : 'border-gray-500'}`}
                disabled={isLoading} aria-invalid={!!(errors.playerNames && errors.playerNames[index])} />
              {errors.playerNames && errors.playerNames[index] && <p className="mt-1 text-xs text-danger-light">{errors.playerNames[index]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Game Settings */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Game Rules</h3>
        <div className="mb-4 p-3 bg-gray-650 rounded-md border border-gray-600">
          <label className="block text-md font-medium text-gray-200 mb-2">Turn Progression:</label>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                <input type="radio" name="turnProgression" value="random" checked={turnProgression === 'random'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
                <span>Random</span>
            </label>
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                <input type="radio" name="turnProgression" value="sequential" checked={turnProgression === 'sequential'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
                <span>Sequential</span>
            </label>
          </div>
        </div>
        <div className="p-3 bg-gray-650 rounded-md border border-gray-600">
          <label className="block text-md font-medium text-gray-200 mb-2">Game Mode:</label>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                <input type="radio" name="gameMode" value="classic" checked={gameMode === 'classic'} onChange={() => handleGameModeChange('classic')} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
                <span>Classic (System picks tasks)</span>
            </label>
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                <input type="radio" name="gameMode" value="pair" checked={gameMode === 'pair'} onChange={() => handleGameModeChange('pair')} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
                <span>Pair Mode (Players pick tasks)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Category Selection (Conditional) */}
      {gameMode === 'classic' && (
        <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Category (Classic Mode)</h3>
          <div className={`flex flex-wrap gap-3 justify-center p-2 rounded border ${errors.category ? 'border-danger' : 'border-transparent'}`}>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <label key={`category-${cat.id}`} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border ${ isSelected ? 'bg-primary-dark text-white border-primary-light ring-1 ring-primary-light' : 'bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500' } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="radio" name="category" value={cat.id} checked={isSelected} onChange={() => handleCategoryChange(cat.id)} disabled={isLoading}
                    className="form-radio h-4 w-4 text-primary rounded border-gray-400 focus:ring-primary-light disabled:opacity-50 sr-only"/>
                  <span>{cat.name}</span>
                </label>
              );
            })}
          </div>
          {errors.category && <p className="mt-1 text-xs text-danger-light text-left">{errors.category}</p>}
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
    </SetupPageLayout>
  );
}

export default TruthOrDareSetup;