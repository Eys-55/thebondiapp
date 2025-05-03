import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createGame } from '../services/firebaseService'; // Import Firebase service
import Spinner from '../components/Spinner'; // Import Spinner

// Updated categories based on concepts.js
const CATEGORIES = [
  { id: 'geography', name: 'Geography' },
  { id: 'science', name: 'Science' },
  { id: 'literature', name: 'Literature' },
  { id: 'flags', name: 'Flags' },
  { id: 'languages', name: 'Languages' },
];

const GAME_MODES = [
    { id: 'safe_if_correct', name: 'Safe if Correct', description: 'Only incorrect answers lose a life. Timeouts are safe.' },
    { id: 'first_correct_wins', name: 'First Correct Wins', description: 'First correct answer is safe, everyone else loses a life.' },
];

// Define available question types
const QUESTION_TYPES = [
    { id: 'mc', name: 'Multiple Choice' },
    { id: 'tf', name: 'True / False' },
    { id: 'id', name: 'Identification' }, // Add Identification type
];

function GameSelection() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [numLives, setNumLives] = useState(3);
  const [cooldownSeconds, setCooldownSeconds] = useState(3);
  const [hostName, setHostName] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState(GAME_MODES[0].id);
  // Initialize with all types selected by default
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState(['mc', 'tf', 'id']);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // --- Validation ---
  const validateForm = () => {
    const newErrors = {};
    const trimmedHostName = hostName.trim();

    if (!trimmedHostName) newErrors.hostName = 'Please enter your name.';
    else if (trimmedHostName.length > 20) newErrors.hostName = 'Name cannot exceed 20 characters.';

    if (selectedCategories.length === 0) newErrors.categories = 'Please select at least one category.';
    if (selectedQuestionTypes.length === 0) newErrors.questionTypes = 'Please select at least one question type.'; // New validation

    if (numQuestions <= 0 || numQuestions > 50) newErrors.numQuestions = 'Must be between 1 and 50.';
    if (timePerQuestion < 2 || timePerQuestion > 60) newErrors.timePerQuestion = 'Must be between 2 and 60.';
    if (numLives <= 0 || numLives > 10) newErrors.numLives = 'Must be between 1 and 10.';
    if (cooldownSeconds < 1 || cooldownSeconds > 10) newErrors.cooldownSeconds = 'Must be between 1 and 10.';
    if (!selectedGameMode || !GAME_MODES.find(m => m.id === selectedGameMode)) newErrors.gameMode = 'Please select a valid game mode.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Event Handlers ---
  const handleInputChange = (setter, fieldName) => (event) => {
    setter(event.target.value);
    if (errors[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: null }));
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

   const handleGameModeChange = (event) => {
    setSelectedGameMode(event.target.value);
    if (errors.gameMode) setErrors(prev => ({ ...prev, gameMode: null }));
  };

  // Handler for question type checkboxes
  const handleQuestionTypeChange = (event) => {
    const { value, checked } = event.target;
    setSelectedQuestionTypes((prev) =>
      checked ? [...prev, value] : prev.filter((type) => type !== value)
    );
     if (errors.questionTypes) setErrors(prev => ({ ...prev, questionTypes: null }));
  };


  const handleCreateGame = async () => {
    if (!validateForm()) {
        toast.warn("Please fix the errors in the form.");
        return;
    }

    setIsLoading(true);
    const trimmedHostName = hostName.trim();

    const gameConfig = {
        selectedCategories,
        numQuestions: Math.min(50, Math.max(1, numQuestions)),
        timePerQuestion: Math.min(60, Math.max(2, timePerQuestion)),
        numLives: Math.min(10, Math.max(1, numLives)),
        cooldownSeconds: Math.min(10, Math.max(1, cooldownSeconds)),
        gameMode: selectedGameMode,
        allowedQuestionTypes: selectedQuestionTypes, // Include selected types
    };

    try {
        // createGame now uses allowedQuestionTypes internally
        const { gameId, hostId } = await createGame(trimmedHostName, gameConfig);
        localStorage.setItem(`ytg-host-${gameId}`, hostId);
        localStorage.removeItem(`ytg-player-${gameId}`);
        navigate(`/lobby/${gameId}`);
    } catch (err) {
        console.error("Failed to create game:", err);
        const errorMessage = err.message || 'Failed to create game. Please check settings and try again.';
        toast.error(`Game Creation Failed: ${errorMessage}`);
        setErrors(prev => ({ ...prev, form: errorMessage }));
        setIsLoading(false);
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-primary-light">YT Multiplayer Quiz</h1>

      {/* Create Game Section */}
      <div className="mb-8 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-2xl font-semibold mb-4 text-success-light border-b border-gray-600 pb-2">Create a New Game</h2>

        {/* Host Name */}
         <div className="mb-4 flex flex-col items-start">
            <label htmlFor="host-name" className="mb-1 text-sm font-medium text-textSecondary">Your Name:</label>
            <input
              type="text" id="host-name" value={hostName}
              onChange={handleInputChange(setHostName, 'hostName')}
              maxLength="20" placeholder="Enter display name (max 20)"
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${errors.hostName ? 'border-danger' : 'border-gray-500'}`}
              disabled={isLoading} aria-invalid={!!errors.hostName} aria-describedby="host-name-error"
            />
            {errors.hostName && <p id="host-name-error" className="mt-1 text-xs text-danger-light">{errors.hostName}</p>}
          </div>

        {/* Categories Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">1. Select Categories:</h3>
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

         {/* Question Types Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">2. Select Question Types:</h3>
          <div className={`flex flex-wrap gap-3 justify-center p-2 rounded border ${errors.questionTypes ? 'border-danger' : 'border-transparent'}`}>
            {QUESTION_TYPES.map((qType) => {
              const isSelected = selectedQuestionTypes.includes(qType.id);
              // Using a slightly different color for Question Type selection
              return (
                <label key={qType.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border ${ isSelected ? 'bg-indigo-700 text-white border-indigo-500 ring-1 ring-indigo-500' : 'bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500' } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="checkbox" id={`qtype-${qType.id}`} value={qType.id} checked={isSelected} onChange={handleQuestionTypeChange} className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-400 focus:ring-indigo-500 disabled:opacity-50" disabled={isLoading} />
                  <span>{qType.name}</span>
                </label>
              );
            })}
          </div>
           {errors.questionTypes && <p className="mt-1 text-xs text-danger-light text-left">{errors.questionTypes}</p>}
        </div>


        {/* Game Mode Selection */}
        <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-left text-gray-200" title="Determines how lives are lost and points awarded.">
                3. Select Game Mode <span className="text-xs text-gray-400">(?)</span>:
            </h3>
            <div className={`space-y-2 text-left p-2 rounded border ${errors.gameMode ? 'border-danger' : 'border-transparent'}`}>
                {GAME_MODES.map((mode) => {
                    const isSelected = selectedGameMode === mode.id;
                    return (
                        <label key={mode.id} className={`flex items-start p-3 rounded-md bg-gray-600 hover:bg-gray-500 cursor-pointer border-2 transition-colors duration-200 ${ isSelected ? 'border-primary ring-1 ring-primary-light bg-primary-dark' : 'border-transparent' } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input type="radio" name="gameMode" value={mode.id} checked={isSelected} onChange={handleGameModeChange} className="form-radio h-5 w-5 text-primary mt-0.5 mr-3 focus:ring-primary-light border-gray-400 disabled:opacity-50" disabled={isLoading} />
                            <div>
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-100'}`}>{mode.name}</span>
                                <p className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-300'}`}>{mode.description}</p>
                            </div>
                        </label>
                    );
                })}
            </div>
             {errors.gameMode && <p className="mt-1 text-xs text-danger-light text-left">{errors.gameMode}</p>}
        </div>


        {/* Options Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">4. Set Game Options:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Number of Questions */}
            <div className="flex flex-col items-start">
              <label htmlFor="num-questions" className="mb-1 text-sm font-medium text-gray-300">Questions (1-50):</label>
              <input type="number" id="num-questions" value={numQuestions} onChange={handleNumberInputChange(setNumQuestions, 'numQuestions')} min="1" max="50" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.numQuestions ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.numQuestions} aria-describedby="num-questions-error" />
              {errors.numQuestions && <p id="num-questions-error" className="mt-1 text-xs text-danger-light">{errors.numQuestions}</p>}
            </div>
            {/* Time per Question */}
            <div className="flex flex-col items-start">
              <label htmlFor="time-limit" className="mb-1 text-sm font-medium text-gray-300">Time (2-60s):</label>
              <input type="number" id="time-limit" value={timePerQuestion} onChange={handleNumberInputChange(setTimePerQuestion, 'timePerQuestion')} min="2" max="60" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.timePerQuestion ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.timePerQuestion} aria-describedby="time-limit-error" />
              {errors.timePerQuestion && <p id="time-limit-error" className="mt-1 text-xs text-danger-light">{errors.timePerQuestion}</p>}
            </div>
            {/* Number of Lives */}
            <div className="flex flex-col items-start">
              <label htmlFor="num-lives" className="mb-1 text-sm font-medium text-gray-300">Lives (1-10):</label>
              <input type="number" id="num-lives" value={numLives} onChange={handleNumberInputChange(setNumLives, 'numLives')} min="1" max="10" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.numLives ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.numLives} aria-describedby="num-lives-error" />
              {errors.numLives && <p id="num-lives-error" className="mt-1 text-xs text-danger-light">{errors.numLives}</p>}
            </div>
             {/* Cooldown Time */}
             <div className="flex flex-col items-start">
              <label htmlFor="cooldown-time" className="mb-1 text-sm font-medium text-gray-300" title="Seconds to show results before the next question starts.">Cooldown (1-10s) <span className="text-xs text-gray-400">(?)</span>:</label>
              <input type="number" id="cooldown-time" value={cooldownSeconds} onChange={handleNumberInputChange(setCooldownSeconds, 'cooldownSeconds')} min="1" max="10" className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${ errors.cooldownSeconds ? 'border-danger' : 'border-gray-500' }`} disabled={isLoading} aria-invalid={!!errors.cooldownSeconds} aria-describedby="cooldown-time-error" />
              {errors.cooldownSeconds && <p id="cooldown-time-error" className="mt-1 text-xs text-danger-light">{errors.cooldownSeconds}</p>}
            </div>
          </div>
        </div>

        {/* General Form Error Message Display */}
        {errors.form && !isLoading && (
            <div className="mb-4 p-3 bg-danger-dark border border-danger rounded text-center">
                <p className="font-semibold text-danger-light">{errors.form}</p>
            </div>
        )}


        {/* Create Button */}
        <button onClick={handleCreateGame} disabled={isLoading} className={`w-full md:w-auto bg-success hover:bg-success-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center ${isLoading ? 'opacity-50 cursor-wait' : ''}`}>
          {isLoading ? ( <><Spinner size="sm" /><span className="ml-2">Creating...</span></> ) : ( 'Create Game' )}
        </button>
      </div>

       {/* Join Game Section */}
      <div className="p-4 bg-gray-700 rounded-md shadow">
         <h2 className="text-2xl font-semibold mb-4 text-warning-light border-b border-gray-600 pb-2">Join an Existing Game</h2>
         <button onClick={handleJoinGame} disabled={isLoading} className={`w-full md:w-auto bg-warning hover:bg-warning-dark text-gray-900 font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-warning focus:ring-opacity-50 shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Join Game
          </button>
      </div>
    </div>
  );
}

export default GameSelection;