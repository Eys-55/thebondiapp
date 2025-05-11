import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/SetupPageLayout'; // Import the layout

// Updated categories based on concepts.js
const CATEGORIES = [
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'literature', name: 'Literature' },
  { id: 'flags', name: 'Flags' },
  { id: 'languages', name: 'Languages' },
];

const MAX_PLAYERS = 10; // Increased max players
const MIN_PLAYERS = 2; // Assuming a local multiplayer game needs at least 2 players
const SESSION_STORAGE_KEY = 'triviaNightsSetup';

// Define default state values for reset
const defaultState = {
  selectedCategories: [],
  numQuestions: 10,
  timePerQuestion: 10,
  includeChoices: true,
  scoringMode: 'fastest',
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
};

function GameSelection({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState(defaultState.selectedCategories);
  const [numQuestions, setNumQuestions] = useState(defaultState.numQuestions);
  const [timePerQuestion, setTimePerQuestion] = useState(defaultState.timePerQuestion);
  const [includeChoices, setIncludeChoices] = useState(defaultState.includeChoices);
  const [scoringMode, setScoringMode] = useState(defaultState.scoringMode);

  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from session storage on mount
  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSelectedCategories(parsedSettings.selectedCategories || defaultState.selectedCategories);
        setNumQuestions(parsedSettings.numQuestions || defaultState.numQuestions);
        setTimePerQuestion(parsedSettings.timePerQuestion || defaultState.timePerQuestion);
        setIncludeChoices(parsedSettings.includeChoices === undefined ? defaultState.includeChoices : parsedSettings.includeChoices);
        setScoringMode(parsedSettings.scoringMode || defaultState.scoringMode);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        
        // Ensure playerNames array matches numPlayersUI
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
      }
    } catch (error) {
      console.error("Failed to load Trivia Nights settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  // Save settings to session storage when they change
  useEffect(() => {
    const settingsToSave = {
      selectedCategories,
      numQuestions,
      timePerQuestion,
      includeChoices,
      scoringMode,
      numPlayersUI,
      playerNames,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Trivia Nights settings to session storage:", error);
    }
  }, [selectedCategories, numQuestions, timePerQuestion, includeChoices, scoringMode, numPlayersUI, playerNames]);


  // --- Validation ---
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

    if (selectedCategories.length === 0) newErrors.categories = 'Please select at least one category.';
    if (numQuestions <= 0 || numQuestions > 50) newErrors.numQuestions = 'Must be between 1 and 50.';
    if (timePerQuestion < 2 || timePerQuestion > 60) newErrors.timePerQuestion = 'Must be between 2 and 60 seconds.';
    
    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, selectedCategories, numQuestions, timePerQuestion]);

  // --- Event Handlers ---
   const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    // Clear specific error when user types
    if (errors.playerNames && errors.playerNames[index]) {
        const updatedPlayerErrors = [...errors.playerNames];
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

  const handleNumberInputChange = (setter, fieldName) => (event) => {
    setter(parseInt(event.target.value) || 0);
    if (errors[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: null }));
  };

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target;
    setSelectedCategories((prev) =>
      checked ? [...prev, value] : prev.filter((cat) => cat !== value)
    );
    if (errors.categories) setErrors(prev => ({ ...prev, categories: null }));
  };

  const handleIncludeChoicesChange = (event) => {
    setIncludeChoices(event.target.checked);
  };

  const handleStartLocalMultiplayerGame = useCallback(() => {
    const formErrors = validateForm(true); // Validate and set errors
    if (Object.keys(formErrors).length > 0) {
        toast.warn("Please fix the errors in the form.");
        return;
    }

    setIsLoading(true);

    const gameConfig = {
        selectedCategories,
        numQuestions: Math.min(50, Math.max(1, numQuestions)),
        timePerQuestion: Math.min(60, Math.max(2, timePerQuestion)),
        includeChoices,
        scoringMode,
    };

    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
        id: crypto.randomUUID(),
        name: name.trim(),
        score: 0
    }));
    
    navigate('/trivia-nights/play', { state: { gameConfig, players: activePlayers } });
  }, [validateForm, selectedCategories, numQuestions, timePerQuestion, includeChoices, scoringMode, playerNames, numPlayersUI, navigate]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSelectedCategories(defaultState.selectedCategories);
    setNumQuestions(defaultState.numQuestions);
    setTimePerQuestion(defaultState.timePerQuestion);
    setIncludeChoices(defaultState.includeChoices);
    setScoringMode(defaultState.scoringMode);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setErrors({}); // Clear errors
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false); // Don't set state
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled;
  }, [validateForm, playerNames, numPlayersUI]);

  useEffect(() => {
    if (registerNavbarActions) {
      registerNavbarActions({
        startHandler: handleStartLocalMultiplayerGame,
        resetHandler: handleResetSettings,
        isLoading: isLoading,
        isValidToStart: checkValidity(),
      });
    }
    return () => {
      if (unregisterNavbarActions) {
        unregisterNavbarActions();
      }
    };
  }, [
    registerNavbarActions, unregisterNavbarActions,
    handleStartLocalMultiplayerGame, handleResetSettings,
    isLoading, checkValidity,
    playerNames, numPlayersUI, selectedCategories, numQuestions, timePerQuestion, errors
  ]);

  return (
    <SetupPageLayout title="Multiplayer Quiz Setup">
      {/* Player Setup Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-success-light border-b border-gray-600 pb-2">1. Player Setup</h3>
        
        <div className="mb-4 flex flex-col items-start">
            <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-textSecondary">Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS}):</label>
            <select
              id="num-players-select"
              value={numPlayersUI}
              onChange={handleNumPlayersChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500`}
            >
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n =>
                <option key={n} value={n}>{n}</option>
              )}
            </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {Array.from({ length: numPlayersUI }).map((_, index) => (
            <div key={`player-input-${index}`} className="mb-3 flex flex-col items-start">
              <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-textSecondary">Player {index + 1} Name:</label>
              <input
                type="text"
                id={`player-name-${index}`}
                value={playerNames[index] || ''}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                maxLength="20"
                placeholder={`Player ${index + 1} (max 20)`}
                className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-danger' : 'border-gray-500'}`}
                disabled={isLoading}
                aria-invalid={!!(errors.playerNames && errors.playerNames[index])}
                aria-describedby={`player-name-error-${index}`}
              />
              {errors.playerNames && errors.playerNames[index] && <p id={`player-name-error-${index}`} className="mt-1 text-xs text-danger-light">{errors.playerNames[index]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Game Settings Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-info-light border-b border-gray-600 pb-2">2. Customize Your Quiz</h3>

        <div className="mb-4">
          <label className="block text-md font-medium text-gray-200 mb-2">Select Categories:</label>
          <div className={`flex flex-wrap gap-3 justify-center p-2 rounded border ${errors.categories ? 'border-danger' : 'border-transparent'}`}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <label key={category.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border ${ isSelected ? 'bg-primary-dark text-white border-primary-light ring-1 ring-primary-light' : 'bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500' } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="checkbox" id={`category-${category.id}`} value={category.id} checked={isSelected} onChange={handleCategoryChange} className="form-checkbox h-4 w-4 text-primary rounded border-gray-400 focus:ring-primary-light disabled:opacity-50 sr-only" disabled={isLoading} />
                  <span>{category.name}</span>
                </label>
              );
            })}
          </div>
           {errors.categories && <p className="mt-1 text-xs text-danger-light text-left">{errors.categories}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col items-start">
              <label htmlFor="num-questions" className="mb-1 text-sm font-medium text-gray-300">Questions (1-50):</label>
              <input type="number" id="num-questions" value={numQuestions} onChange={handleNumberInputChange(setNumQuestions, 'numQuestions')} min="1" max="50" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.numQuestions ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.numQuestions} aria-describedby="num-questions-error" />
              {errors.numQuestions && <p id="num-questions-error" className="mt-1 text-xs text-danger-light">{errors.numQuestions}</p>}
            </div>
            <div className="flex flex-col items-start">
              <label htmlFor="time-limit" className="mb-1 text-sm font-medium text-gray-300">Time per Question (2-60s):</label>
              <input type="number" id="time-limit" value={timePerQuestion} onChange={handleNumberInputChange(setTimePerQuestion, 'timePerQuestion')} min="2" max="60" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.timePerQuestion ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.timePerQuestion} aria-describedby="time-limit-error" />
              {errors.timePerQuestion && <p id="time-limit-error" className="mt-1 text-xs text-danger-light">{errors.timePerQuestion}</p>}
            </div>
        </div>

        <div className="mb-4 flex items-center justify-start p-3 bg-gray-650 rounded-md border border-gray-600">
            <input
                type="checkbox"
                id="include-choices"
                checked={includeChoices}
                onChange={handleIncludeChoicesChange}
                disabled={isLoading}
                className="form-checkbox h-5 w-5 text-success rounded border-gray-400 focus:ring-success-light disabled:opacity-50"
            />
            <label htmlFor="include-choices" className="ml-3 text-md font-medium text-gray-200 cursor-pointer">
                Include Multiple Choices?
            </label>
            <p className="ml-auto text-xs text-gray-400">(If unchecked, questions are identification)</p>
        </div>

        {/* Scoring Mode Selection */}
        <div className="mb-4 p-3 bg-gray-650 rounded-md border border-gray-600">
            <label className="block text-md font-medium text-gray-200 mb-2">Scoring Mode:</label>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                    <input
                        type="radio"
                        name="scoringMode"
                        value="fastest"
                        checked={scoringMode === 'fastest'}
                        onChange={(e) => setScoringMode(e.target.value)}
                        disabled={isLoading}
                        className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"
                    />
                    <span>Fastest Finger (One winner per question)</span>
                </label>
                <label className="flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500 has-[:checked]:bg-primary-dark has-[:checked]:text-white has-[:checked]:border-primary-light has-[:checked]:ring-1 has-[:checked]:ring-primary-light">
                    <input
                        type="radio"
                        name="scoringMode"
                        value="multiple"
                        checked={scoringMode === 'multiple'}
                        onChange={(e) => setScoringMode(e.target.value)}
                        disabled={isLoading}
                        className="form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"
                    />
                    <span>Anyone Correct (Multiple winners possible)</span>
                </label>
            </div>
        </div>
      </div>
    </SetupPageLayout>
  );
}

export default GameSelection;