import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Updated categories based on concepts.js
const CATEGORIES = [
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'literature', name: 'Literature' },
  { id: 'flags', name: 'Flags' },
  { id: 'languages', name: 'Languages' },
];

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2; // Assuming a local multiplayer game needs at least 2 players

function GameSelection() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [includeChoices, setIncludeChoices] = useState(true);

  const [numPlayersUI, setNumPlayersUI] = useState(MIN_PLAYERS);
  const [playerNames, setPlayerNames] = useState(Array(MIN_PLAYERS).fill(''));

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // --- Validation ---
  const validateForm = () => {
    const newErrors = {};

    // Player name validation
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
    // Ensure playerNames error object is only set if there's an actual error string
    if (newErrors.playerNames && !newErrors.playerNames.some(e => e)) {
        delete newErrors.playerNames;
    }


    if (selectedCategories.length === 0) newErrors.categories = 'Please select at least one category.';
    if (numQuestions <= 0 || numQuestions > 50) newErrors.numQuestions = 'Must be between 1 and 50.';
    if (timePerQuestion < 2 || timePerQuestion > 60) newErrors.timePerQuestion = 'Must be between 2 and 60 seconds.';
    
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
    const newPlayerNames = Array(count).fill('').map((_, i) => playerNames[i] || '');
    setPlayerNames(newPlayerNames);
    if (errors.playerNames) setErrors(prev => ({ ...prev, playerNames: null })); // Clear all player name errors on count change
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

  const handleStartLocalMultiplayerGame = () => {
    if (!validateForm()) {
        toast.warn("Please fix the errors in the form.");
        return;
    }

    setIsLoading(true);

    const gameConfig = {
        selectedCategories,
        numQuestions: Math.min(50, Math.max(1, numQuestions)),
        timePerQuestion: Math.min(60, Math.max(2, timePerQuestion)),
        includeChoices,
    };

    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
        id: crypto.randomUUID(),
        name: name.trim(),
        score: 0
    }));

    navigate('/trivia-nights/play', { state: { gameConfig, players: activePlayers } });
    // setIsLoading(false); // Navigation will unmount
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-textPrimary">
      <h2 className="text-3xl font-bold text-center text-primary-light mb-6">Multiplayer Quiz Setup</h2>
      
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

        {Array.from({ length: numPlayersUI }).map((_, index) => (
          <div key={`player-input-${index}`} className="mb-3 flex flex-col items-start">
            <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-textSecondary">Player {index + 1} Name:</label>
            <input
              type="text"
              id={`player-name-${index}`}
              value={playerNames[index] || ''}
              onChange={(e) => handlePlayerNameChange(index, e.target.value)}
              maxLength="20"
              placeholder={`Enter Player ${index + 1} Name (max 20)`}
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-danger' : 'border-gray-500'}`}
              disabled={isLoading}
              aria-invalid={!!(errors.playerNames && errors.playerNames[index])}
              aria-describedby={`player-name-error-${index}`}
            />
            {errors.playerNames && errors.playerNames[index] && <p id={`player-name-error-${index}`} className="mt-1 text-xs text-danger-light">{errors.playerNames[index]}</p>}
          </div>
        ))}
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
                  <input type="checkbox" id={`category-${category.id}`} value={category.id} checked={isSelected} onChange={handleCategoryChange} className="form-checkbox h-4 w-4 text-primary rounded border-gray-400 focus:ring-primary-light disabled:opacity-50" disabled={isLoading} />
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
      </div>
      
      <div className="mt-8 p-4 bg-gray-700 rounded-md shadow flex justify-center">
        <button
            onClick={handleStartLocalMultiplayerGame}
            disabled={isLoading}
            className={`w-full md:w-auto bg-success hover:bg-success-dark text-white font-bold py-3 px-10 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isLoading ? ( <span className="ml-2">Starting Game...</span> ) : ( 'Start Local Multiplayer Game' )}
        </button>
      </div>
    </div>
  );
}

export default GameSelection;