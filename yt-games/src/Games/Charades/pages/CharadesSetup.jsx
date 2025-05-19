import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout';
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition'; // Import transition component

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

const SESSION_STORAGE_KEY = 'charadesGameSettings'; // Define session storage key

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  gameMode: 'system_word', // 'system_word' or 'own_word'
  numRounds: 2, // Default number of rounds per player
  actingTimeSeconds: 90, // Default acting time per turn
};

function CharadesSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [gameMode, setGameMode] = useState(defaultState.gameMode);
  const [numRounds, setNumRounds] = useState(defaultState.numRounds);
  const [actingTimeSeconds, setActingTimeSeconds] = useState(defaultState.actingTimeSeconds);
  
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
        setGameMode(parsedSettings.gameMode || defaultState.gameMode);
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
      gameMode,
      numRounds,
      actingTimeSeconds,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Charades settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, gameMode, numRounds, actingTimeSeconds]);

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

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI]);

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

  const handleGameModeChange = (mode) => {
    setGameMode(mode);
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
      score: 0, // Initial score or time
      roundsPlayed: 0,
    }));
    const gameConfig = {
      players: activePlayers,
      gameMode,
      numRounds,
      actingTimeSeconds,
      turnProgression: 'random', // Charades typically has random actor selection or sequential turns
    };
    // Instead of navigating directly, set up for transition
    setTransitionGameConfig(gameConfig);
    setIsTransitioning(true);
    // setIsLoading(true); // Keep form disabled
  }, [validateForm, playerNames, numPlayersUI, gameMode, numRounds, actingTimeSeconds]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setGameMode(defaultState.gameMode);
    setNumRounds(defaultState.numRounds);
    setActingTimeSeconds(defaultState.actingTimeSeconds);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);
  
  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled;
  }, [validateForm, playerNames, numPlayersUI]);

  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading || isTransitioning, // Navbar loading during transition
    isValidToStart: isTransitioning ? false : isValidToStartValue, // Not valid to start again during transition
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
      setIsTransitioning(false); // Revert to setup form
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
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Game Mode</h3>
        <GameOptionSelector
          label="How are words chosen?"
          options={[
            { id: 'system_word', value: 'system_word', name: 'System Assigns Word' },
            { id: 'own_word', value: 'own_word', name: 'Player Chooses Own Word' },
          ]}
          selectedOption={gameMode}
          onOptionChange={(value) => handleGameModeChange(value)}
          type="radio"
          groupName="charadesGameMode"
          isLoading={isLoading}
        />
      </div>

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