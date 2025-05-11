import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = ["Family", "Friends", "Relationship"]; // Add more if needed

function TruthOrDareSetup() {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(MIN_PLAYERS);
  const [playerNames, setPlayerNames] = useState(Array(MIN_PLAYERS).fill(''));
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [turnProgression, setTurnProgression] = useState('random'); // 'sequential' or 'random'
  const [gameMode, setGameMode] = useState('classic'); // 'classic' or 'pair'
  
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(false); // Tracks if user confirmed R-rated

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If game mode changes to 'pair', clear selected category and errors related to it.
    if (gameMode === 'pair') {
      setSelectedCategory(null);
      setRRatedModalConfirmed(false); // Reset confirmation
      setShowRRatedModal(false);
      if (errors.category) setErrors(prev => ({ ...prev, category: null }));
    }
  }, [gameMode]);

  const validateForm = () => {
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
        // Ensure modal is shown if not already
        if (!showRRatedModal) setShowRRatedModal(true);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    if (errors.playerNames) setErrors(prev => ({ ...prev, playerNames: null }));
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setRRatedModalConfirmed(false); // Reset confirmation when category changes
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    if (category === 'Relationship') {
      setShowRRatedModal(true);
    } else {
      setShowRRatedModal(false);
      setRRatedModalConfirmed(true); // Non-R-rated categories are implicitly "confirmed"
    }
  };
  
  const handleGameModeChange = (mode) => {
    setGameMode(mode);
    // If switching to pair mode, no category is needed.
    // If switching to classic, user will need to select a category.
    // Resetting category selection related states if mode changes.
    setSelectedCategory(null);
    setShowRRatedModal(false);
    setRRatedModalConfirmed(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null })); // Clear potential error after confirmation
  };

  const handleRRatedModalCancel = () => {
    setSelectedCategory(null); // Deselect "Relationship"
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    // Optionally, inform user they need to pick another category or confirm
    toast.info("Relationship category deselected. Please choose a category or confirm age if you reselect Relationship.");
  };

  const handleStartGame = () => {
    if (!validateForm()) {
      toast.warn("Please fix the errors in the form.");
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
      // No need to pass rRatedModalConfirmed to gameConfig, it's a setup-time check
    };

    navigate('/truth-or-dare/play', { state: { gameConfig } });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-white">
      <h2 className="text-3xl font-bold text-center text-blue-400 mb-8">Truth or Dare Setup</h2>

      {/* Game Settings */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">1. Game Settings</h3>
        <div className="mb-4">
          <label className="block text-md font-medium text-gray-300 mb-2">Turn Progression:</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="turnProgression" value="random" checked={turnProgression === 'random'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 focus:ring-blue-400"/><span className="text-gray-100">Random</span></label>
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="turnProgression" value="sequential" checked={turnProgression === 'sequential'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 focus:ring-blue-400"/><span className="text-gray-100">Sequential</span></label>
          </div>
        </div>
        <div className="mb-2">
          <label className="block text-md font-medium text-gray-300 mb-2">Game Mode:</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="gameMode" value="classic" checked={gameMode === 'classic'} onChange={() => handleGameModeChange('classic')} disabled={isLoading} className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 focus:ring-blue-400"/><span className="text-gray-100">Classic</span></label>
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="gameMode" value="pair" checked={gameMode === 'pair'} onChange={() => handleGameModeChange('pair')} disabled={isLoading} className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 focus:ring-blue-400"/><span className="text-gray-100">Pair Mode</span></label>
          </div>
        </div>
      </div>

      {/* Player Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Players</h3>
        <div className="mb-4">
          <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-gray-300">Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS}):</label>
          <select id="num-players-select" value={numPlayersUI} onChange={handleNumPlayersChange} disabled={isLoading}
            className="w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 border-gray-500">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {Array.from({ length: numPlayersUI }).map((_, index) => (
            <div key={`player-input-${index}`} className="mb-3">
              <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-gray-300">Player {index + 1} Name:</label>
              <input type="text" id={`player-name-${index}`} value={playerNames[index] || ''} onChange={(e) => handlePlayerNameChange(index, e.target.value)} maxLength="20" placeholder={`Player ${index + 1}`}
                className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-red-500' : 'border-gray-500'}`}
                disabled={isLoading} aria-invalid={!!(errors.playerNames && errors.playerNames[index])} />
              {errors.playerNames && errors.playerNames[index] && <p className="mt-1 text-xs text-red-400">{errors.playerNames[index]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Category Selection (Conditional) */}
      {gameMode === 'classic' && (
        <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Category</h3>
          <div>
            <label className="block text-md font-medium text-gray-300 mb-2">Select One Category:</label>
            {CATEGORIES.map(cat => (
              <label key={`category-${cat}`} className="flex items-center space-x-2 mb-1 cursor-pointer">
                <input type="radio" name="category" value={cat} checked={selectedCategory === cat} onChange={() => handleCategoryChange(cat)} disabled={isLoading}
                  className="form-radio h-4 w-4 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-400 disabled:opacity-50"/>
                <span className="text-gray-100">{cat}</span>
              </label>
            ))}
            {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category}</p>}
          </div>
        </div>
      )}

      {/* R-Rated Modal */}
      {showRRatedModal && selectedCategory === 'Relationship' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h4 className="text-2xl font-bold text-yellow-400 mb-4">Age Restriction Warning!</h4>
            <p className="text-gray-200 mb-6">
              The "Relationship" category contains content intended for players aged 18 and above.
              Please ensure all players meet this age requirement before proceeding.
            </p>
            <div className="flex justify-end gap-4">
              <button onClick={handleRRatedModalCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">
                Go Back / Choose Another
              </button>
              <button onClick={handleRRatedModalConfirm} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md transition-colors">
                Confirm (All Players 18+)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-700 rounded-md shadow flex justify-center">
        <button onClick={handleStartGame} disabled={isLoading || (showRRatedModal && !rRatedModalConfirmed)}
          className={`w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-10 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-lg
                      ${(isLoading || (showRRatedModal && !rRatedModalConfirmed)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {isLoading ? 'Starting...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}

export default TruthOrDareSetup;