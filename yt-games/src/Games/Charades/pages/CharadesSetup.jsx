import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/SetupPageLayout';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const SESSION_STORAGE_KEY = 'charadesSetup';

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
    navigate('/charades/play', { state: { gameConfig } });
  }, [validateForm, playerNames, numPlayersUI, gameMode, numRounds, actingTimeSeconds, navigate]);

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
    isLoading: isLoading,
    isValidToStart: isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isValidToStartValue]);

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

  return (
    <SetupPageLayout title="Charades Setup">
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
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Game Mode</h3>
        <div className="p-3 bg-gray-650 rounded-md border border-gray-600">
          <label className="block text-md font-medium text-gray-200 mb-2">How are words chosen?</label>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
              <input type="radio" name="gameMode" value="system_word" checked={gameMode === 'system_word'} onChange={() => handleGameModeChange('system_word')} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
              <span>System Assigns Word</span>
            </label>
            <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
              <input type="radio" name="gameMode" value="own_word" checked={gameMode === 'own_word'} onChange={() => handleGameModeChange('own_word')} disabled={isLoading} className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"/>
              <span>Player Chooses Own Word</span>
            </label>
          </div>
        </div>
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