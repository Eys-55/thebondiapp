import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../services/firebaseService'; // Import Firebase service

const CATEGORIES = [
  { id: 'flags', name: 'Flags' },
  { id: 'languages', name: 'Languages' },
  { id: 'facts', name: 'General Facts' },
];

const GAME_MODES = [
    { id: 'safe_if_correct', name: 'Safe if Correct', description: 'Only incorrect answers or timeouts lose a life.' },
    { id: 'first_correct_wins', name: 'First Correct Wins', description: 'First correct answer is safe, everyone else loses a life.' },
];

function GameSelection() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [numLives, setNumLives] = useState(3);
  const [cooldownSeconds, setCooldownSeconds] = useState(3); // Added cooldown state
  const [hostName, setHostName] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState(GAME_MODES[0].id); // Default to 'safe_if_correct'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target;
    setSelectedCategories((prev) =>
      checked ? [...prev, value] : prev.filter((cat) => cat !== value)
    );
    setError('');
  };

   const handleGameModeChange = (event) => {
    setSelectedGameMode(event.target.value);
    setError('');
  };

  const handleCreateGame = async () => {
    setError('');
    setIsLoading(true);

    // Validation
    if (!hostName.trim()) {
        setError('Please enter your name.');
        setIsLoading(false);
        return;
    }
    if (selectedCategories.length === 0) {
      setError('Please select at least one category.');
      setIsLoading(false);
      return;
    }
    if (numQuestions <= 0) {
      setError('Number of questions must be positive.');
      setIsLoading(false);
      return;
    }
     if (timePerQuestion <= 1) {
      setError('Time per question must be at least 2 seconds.');
      setIsLoading(false);
      return;
    }
     if (numLives <= 0) {
      setError('Number of lives must be positive.');
      setIsLoading(false);
      return;
    }
     if (cooldownSeconds < 1 || cooldownSeconds > 10) {
        setError('Cooldown must be between 1 and 10 seconds.');
        setIsLoading(false);
        return;
     }
     if (!selectedGameMode) {
        setError('Please select a game mode.');
        setIsLoading(false);
        return;
     }

    const gameConfig = {
        selectedCategories,
        numQuestions,
        timePerQuestion,
        numLives,
        cooldownSeconds, // Add cooldown
        gameMode: selectedGameMode, // Add selected game mode
    };

    try {
        const { gameId, hostId } = await createGame(hostName, gameConfig);
        localStorage.setItem(`ytg-host-${gameId}`, hostId);
        navigate(`/lobby/${gameId}`);
    } catch (err) {
        console.error("Failed to create game:", err);
        setError('Failed to create game. Please try again.');
        setIsLoading(false);
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-blue-300">YT Multiplayer Quiz</h1>

      {/* Create Game Section */}
      <div className="mb-8 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-2xl font-semibold mb-4 text-green-400 border-b border-gray-600 pb-2">Create a New Game</h2>

        {/* Host Name */}
         <div className="mb-4 flex flex-col items-start">
            <label htmlFor="host-name" className="mb-1 text-sm font-medium text-gray-300">Your Name:</label>
            <input
              type="text"
              id="host-name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              maxLength="20"
              placeholder="Enter your display name"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

        {/* Categories Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">1. Select Categories:</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map((category) => (
              <label
                key={category.id}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 ${
                  selectedCategories.includes(category.id)
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  value={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onChange={handleCategoryChange}
                  className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-400 focus:ring-blue-400"
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">2. Select Game Mode:</h3>
            <div className="space-y-2 text-left">
                {GAME_MODES.map((mode) => (
                    <label key={mode.id} className="flex items-start p-3 rounded-md bg-gray-600 hover:bg-gray-500 cursor-pointer">
                        <input
                            type="radio"
                            name="gameMode"
                            value={mode.id}
                            checked={selectedGameMode === mode.id}
                            onChange={handleGameModeChange}
                            className="form-radio h-5 w-5 text-blue-500 mt-0.5 mr-3 focus:ring-blue-400 border-gray-400"
                        />
                        <div>
                            <span className="font-medium text-gray-100">{mode.name}</span>
                            <p className="text-xs text-gray-300">{mode.description}</p>
                        </div>
                    </label>
                ))}
            </div>
        </div>


        {/* Options Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-left text-gray-200">3. Set Game Options:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Number of Questions */}
            <div className="flex flex-col items-start">
              <label htmlFor="num-questions" className="mb-1 text-sm font-medium text-gray-300">Questions:</label>
              <input
                type="number"
                id="num-questions"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                min="1" max="50"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Time per Question */}
            <div className="flex flex-col items-start">
              <label htmlFor="time-limit" className="mb-1 text-sm font-medium text-gray-300">Time (s):</label>
              <input
                type="number"
                id="time-limit"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Math.max(2, parseInt(e.target.value) || 2))} // Min 2s
                min="2" max="60"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Number of Lives */}
            <div className="flex flex-col items-start">
              <label htmlFor="num-lives" className="mb-1 text-sm font-medium text-gray-300">Lives:</label>
              <input
                type="number"
                id="num-lives"
                value={numLives}
                onChange={(e) => setNumLives(Math.max(1, parseInt(e.target.value) || 1))}
                min="1" max="10"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
             {/* Cooldown Time */}
             <div className="flex flex-col items-start">
              <label htmlFor="cooldown-time" className="mb-1 text-sm font-medium text-gray-300">Cooldown (s):</label>
              <input
                type="number"
                id="cooldown-time"
                value={cooldownSeconds}
                onChange={(e) => setCooldownSeconds(Math.max(1, parseInt(e.target.value) || 1))} // Min 1s
                min="1" max="10"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-400 mb-4 font-semibold">{error}</p>}

        {/* Create Button */}
        <button
          onClick={handleCreateGame}
          disabled={isLoading}
          className={`w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Creating...' : 'Create Game'}
        </button>
      </div>

       {/* Join Game Section */}
      <div className="p-4 bg-gray-700 rounded-md shadow">
         <h2 className="text-2xl font-semibold mb-4 text-yellow-400 border-b border-gray-600 pb-2">Join an Existing Game</h2>
         <button
            onClick={handleJoinGame}
            className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 shadow-lg"
          >
            Join Game
          </button>
      </div>
    </div>
  );
}

export default GameSelection;