import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner'; // Import Spinner

// Updated categories based on concepts.js
const CATEGORIES = [
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'literature', name: 'Literature' },
  { id: 'flags', name: 'Flags' },
  { id: 'languages', name: 'Languages' },
];

// Define available question types (Simplified)
const QUESTION_TYPES = [
    { id: 'mc', name: 'Multiple Choice' },
    { id: 'tf', name: 'True / False' },
    { id: 'id', name: 'Identification' },
];

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

function GameSelection() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  // Lives and Cooldown removed
  
  // Initialize with simplified types selected by default
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState(['mc', 'tf', 'id']);
  
  const [numPlayersUI, setNumPlayersUI] = useState(MIN_PLAYERS);
  const [playerNames, setPlayerNames] = useState(Array(MIN_PLAYERS).fill(''));

  const [errors, setErrors] = useState({});
  const [isLoadingLocalMP, setIsLoadingLocalMP] = useState(false); // For local MP button
  // isCreatingSP state removed

  // --- Validation ---
  const validateForm = () => { // Removed isSinglePlayer parameter
    const newErrors = {};

    // Player name validation (always runs now)
    const currentPlayersToValidate = playerNames.slice(0, numPlayersUI);
    currentPlayersToValidate.forEach((name, index) => {
        if (!name.trim()) {
            if (!newErrors.playerNames) newErrors.playerNames = [];
            newErrors.playerNames[index] = `Player ${index + 1} name is required.`;
        } else if (name.trim().length > 20) {
            if (!newErrors.playerNames) newErrors.playerNames = [];
            newErrors.playerNames[index] = `Player ${index + 1} name max 20 chars.`;
        }
    });
    if (newErrors.playerNames && newErrors.playerNames.some(e => e)) {
        // keep the error object structure for player names
    } else {
        delete newErrors.playerNames; // Clear if all good
    }

    if (selectedCategories.length === 0) newErrors.categories = 'Please select at least one category.';
    if (selectedQuestionTypes.length === 0) newErrors.questionTypes = 'Please select at least one question type.';

    if (numQuestions <= 0 || numQuestions > 50) newErrors.numQuestions = 'Must be between 1 and 50.';
    if (timePerQuestion < 2 || timePerQuestion > 60) newErrors.timePerQuestion = 'Must be between 2 and 60.';
    // Lives and Cooldown validation removed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Event Handlers ---
   const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    if (errors.playerNames && errors.playerNames[index]) {
        setErrors(prev => ({
            ...prev,
            playerNames: prev.playerNames.map((err, i) => (i === index ? null : err))
        }));
    }
  };

  const handleNumPlayersChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayersUI(count);
    // Adjust playerNames array, preserving existing names
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

  const handleQuestionTypeChange = (event) => {
    const { value, checked } = event.target;
    setSelectedQuestionTypes((prev) =>
      checked ? [...prev, value] : prev.filter((type) => type !== value)
    );
     if (errors.questionTypes) setErrors(prev => ({ ...prev, questionTypes: null }));
  };

  const handleStartLocalMultiplayerGame = () => {
    if (!validateForm()) { // No parameter needed
        toast.warn("Please fix the errors in the form.");
        return;
    }

    setIsLoadingLocalMP(true);

    const detailedAllowedTypes = selectedQuestionTypes.reduce((acc, type) => {
        if (type === 'mc') {
            acc.push('text_mc', 'flag_mc', 'language_mc');
        } else {
            acc.push(type);
        }
        return acc;
    }, []);
    const finalAllowedTypes = [...new Set(detailedAllowedTypes)];

    const gameConfigForLocalMP = {
        selectedCategories,
        numQuestions: Math.min(50, Math.max(1, numQuestions)),
        timePerQuestion: Math.min(60, Math.max(2, timePerQuestion)),
        allowedQuestionTypes: finalAllowedTypes,
    };

    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
        id: crypto.randomUUID(),
        name: name.trim(),
        score: 0
    }));

    navigate('/local-quiz', { state: { gameConfig: gameConfigForLocalMP, players: activePlayers } });
    // setIsLoadingLocalMP(false); // Navigation will unmount
  };

  // handleStartSinglePlayerGame removed

  const anyLoading = isLoadingLocalMP; // Simplified loading check

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-primary-light">Quiz Game Setup</h1>

      {/* Local Multiplayer Game Section */}
      <div className="mb-8 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-2xl font-semibold mb-4 text-success-light border-b border-gray-600 pb-2">Local Multiplayer Game</h2>
        
        {/* Number of Players */}
        <div className="mb-4 flex flex-col items-start">
            <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-textSecondary">Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS}):</label>
            <select
              id="num-players-select"
              value={numPlayersUI}
              onChange={handleNumPlayersChange}
              disabled={anyLoading}
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500`}
            >
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n =>
                <option key={n} value={n}>{n}</option>
              )}
            </select>
        </div>

        {/* Player Names */}
        {Array.from({ length: numPlayersUI }).map((_, index) => (
          <div key={`player-input-${index}`} className="mb-4 flex flex-col items-start">
            <label htmlFor={`player-name-${index}`} className="mb-1 text-sm font-medium text-textSecondary">Player {index + 1} Name:</label>
            <input
              type="text"
              id={`player-name-${index}`}
              value={playerNames[index] || ''}
              onChange={(e) => handlePlayerNameChange(index, e.target.value)}
              maxLength="20"
              placeholder={`Enter Player ${index + 1} Name (max 20)`}
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-danger' : 'border-gray-500'}`}
              disabled={anyLoading}
              aria-invalid={!!(errors.playerNames && errors.playerNames[index])}
              aria-describedby={`player-name-error-${index}`}
            />
            {errors.playerNames && errors.playerNames[index] && <p id={`player-name-error-${index}`} className="mt-1 text-xs text-danger-light">{errors.playerNames[index]}</p>}
          </div>
        ))}
      </div>


      {/* Common Game Settings Section */}
      <div className="mb-8 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-2xl font-semibold mb-4 text-info-light border-b border-gray-600 pb-2">Game Settings</h2>

        {/* Categories Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">1. Select Categories:</h3>
          <div className={`flex flex-wrap gap-3 justify-center p-2 rounded border ${errors.categories ? 'border-danger' : 'border-transparent'}`}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <label key={category.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border ${ isSelected ? 'bg-primary-dark text-white border-primary-light ring-1 ring-primary-light' : 'bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500' } ${anyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="checkbox" id={`category-${category.id}`} value={category.id} checked={isSelected} onChange={handleCategoryChange} className="form-checkbox h-4 w-4 text-primary rounded border-gray-400 focus:ring-primary-light disabled:opacity-50" disabled={anyLoading} />
                  <span>{category.name}</span>
                </label>
              );
            })}
          </div>
           {errors.categories && <p className="mt-1 text-xs text-danger-light text-left">{errors.categories}</p>}
        </div>

         {/* Question Types Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">2. Select Question Types:</h3>
          <div className={`flex flex-wrap gap-3 justify-center p-2 rounded border ${errors.questionTypes ? 'border-danger' : 'border-transparent'}`}>
            {QUESTION_TYPES.map((qType) => {
              const isSelected = selectedQuestionTypes.includes(qType.id);
              return (
                <label key={qType.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border ${ isSelected ? 'bg-indigo-700 text-white border-indigo-500 ring-1 ring-indigo-500' : 'bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500' } ${anyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="checkbox" id={`qtype-${qType.id}`} value={qType.id} checked={isSelected} onChange={handleQuestionTypeChange} className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500 disabled:opacity-50" disabled={anyLoading} />
                  <span>{qType.name}</span>
                </label>
              );
            })}
          </div>
           {errors.questionTypes && <p className="mt-1 text-xs text-danger-light text-left">{errors.questionTypes}</p>}
        </div>

        {/* Options Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">3. Set Game Options:</h3>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4"> {/* Adjusted grid columns */}
            {/* Number of Questions */}
            <div className="flex flex-col items-start">
              <label htmlFor="num-questions" className="mb-1 text-sm font-medium text-gray-300">Questions (1-50):</label>
              <input type="number" id="num-questions" value={numQuestions} onChange={handleNumberInputChange(setNumQuestions, 'numQuestions')} min="1" max="50" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.numQuestions ? 'border-danger' : 'border-gray-500' }`} disabled={anyLoading} aria-invalid={!!errors.numQuestions} aria-describedby="num-questions-error" />
              {errors.numQuestions && <p id="num-questions-error" className="mt-1 text-xs text-danger-light">{errors.numQuestions}</p>}
            </div>
            {/* Time per Question */}
            <div className="flex flex-col items-start">
              <label htmlFor="time-limit" className="mb-1 text-sm font-medium text-gray-300">Time (2-60s):</label>
              <input type="number" id="time-limit" value={timePerQuestion} onChange={handleNumberInputChange(setTimePerQuestion, 'timePerQuestion')} min="2" max="60" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.timePerQuestion ? 'border-danger' : 'border-gray-500' }`} disabled={anyLoading} aria-invalid={!!errors.timePerQuestion} aria-describedby="time-limit-error" />
              {errors.timePerQuestion && <p id="time-limit-error" className="mt-1 text-xs text-danger-light">{errors.timePerQuestion}</p>}
            </div>
            {/* Lives and Cooldown inputs removed */}
          </div>
        </div>
      </div>
      
      {/* Action Buttons Area */}
      <div className="mt-8 p-4 bg-gray-700 rounded-md shadow flex flex-col md:flex-row justify-center gap-4"> {/* Centered button */}
        {/* Start Local Multiplayer Button */}
        <button
            onClick={handleStartLocalMultiplayerGame}
            disabled={anyLoading}
            className={`w-full md:w-auto bg-success hover:bg-success-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center ${anyLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isLoadingLocalMP ? ( <><Spinner size="sm" /><span className="ml-2">Starting Local Game...</span></> ) : ( 'Start Local Multiplayer Game' )}
        </button>

        {/* Start Single Player Button Removed */}
      </div>

    </div>
  );
}

export default GameSelection;