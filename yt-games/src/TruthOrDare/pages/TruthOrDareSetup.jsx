import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = ["Family", "Friends", "Relationship"];

function TruthOrDareSetup() {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(MIN_PLAYERS);
  const [playerNames, setPlayerNames] = useState(Array(MIN_PLAYERS).fill(''));
  
  const [selectedTruthCategories, setSelectedTruthCategories] = useState([...CATEGORIES]);
  const [selectedDareCategories, setSelectedDareCategories] = useState([...CATEGORIES]);
  const [turnProgression, setTurnProgression] = useState('random'); // 'sequential' or 'random'
  const [gameMode, setGameMode] = useState('classic'); // 'classic' or 'pair'
  const [pairModeTaskType, setPairModeTaskType] = useState('system'); // 'system' or 'player_defined'

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    if (selectedTruthCategories.length === 0) newErrors.truthCategories = 'Select at least one truth category.';
    if (selectedDareCategories.length === 0) newErrors.dareCategories = 'Select at least one dare category.';
    
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

  const handleCategoryChange = (type, category) => {
    const setter = type === 'truth' ? setSelectedTruthCategories : setSelectedDareCategories;
    const errorField = type === 'truth' ? 'truthCategories' : 'dareCategories';
    setter(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    if (errors[errorField]) setErrors(prev => ({ ...prev, [errorField]: null }));
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
      selectedTruthCategories,
      selectedDareCategories,
      turnProgression,
      gameMode,
      pairModeTaskType: gameMode === 'pair' ? pairModeTaskType : null, // Only relevant for pair mode
    };

    navigate('/truth-or-dare/play', { state: { gameConfig } });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-purple-800 rounded-lg shadow-xl text-white">
      <h2 className="text-3xl font-bold text-center text-purple-300 mb-8">Truth or Dare Setup</h2>

      {/* Player Setup */}
      <div className="mb-6 p-4 bg-purple-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-purple-200 border-b border-purple-600 pb-2">1. Players</h3>
        <div className="mb-4">
          <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-purple-300">Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS}):</label>
          <select id="num-players-select" value={numPlayersUI} onChange={handleNumPlayersChange} disabled={isLoading}
            className="w-full px-3 py-2 bg-purple-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 border-purple-500">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {Array.from({ length: numPlayersUI }).map((_, index) => (
            <div key={`player-input-${index}`} className="mb-3">
              <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-purple-300">Player {index + 1} Name:</label>
              <input type="text" id={`player-name-${index}`} value={playerNames[index] || ''} onChange={(e) => handlePlayerNameChange(index, e.target.value)} maxLength="20" placeholder={`Player ${index + 1}`}
                className={`w-full px-3 py-2 bg-purple-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 ${errors.playerNames && errors.playerNames[index] ? 'border-red-500' : 'border-purple-500'}`}
                disabled={isLoading} aria-invalid={!!(errors.playerNames && errors.playerNames[index])} />
              {errors.playerNames && errors.playerNames[index] && <p className="mt-1 text-xs text-red-400">{errors.playerNames[index]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div className="mb-6 p-4 bg-purple-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-purple-200 border-b border-purple-600 pb-2">2. Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-md font-medium text-purple-300 mb-2">Truth Categories:</label>
            {CATEGORIES.map(cat => (
              <label key={`truth-${cat}`} className="flex items-center space-x-2 mb-1 cursor-pointer">
                <input type="checkbox" checked={selectedTruthCategories.includes(cat)} onChange={() => handleCategoryChange('truth', cat)} disabled={isLoading}
                  className="form-checkbox h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 rounded focus:ring-purple-300 disabled:opacity-50"/>
                <span className="text-purple-100">{cat}</span>
              </label>
            ))}
            {errors.truthCategories && <p className="mt-1 text-xs text-red-400">{errors.truthCategories}</p>}
          </div>
          <div>
            <label className="block text-md font-medium text-purple-300 mb-2">Dare Categories:</label>
            {CATEGORIES.map(cat => (
              <label key={`dare-${cat}`} className="flex items-center space-x-2 mb-1 cursor-pointer">
                <input type="checkbox" checked={selectedDareCategories.includes(cat)} onChange={() => handleCategoryChange('dare', cat)} disabled={isLoading}
                  className="form-checkbox h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 rounded focus:ring-purple-300 disabled:opacity-50"/>
                <span className="text-purple-100">{cat}</span>
              </label>
            ))}
            {errors.dareCategories && <p className="mt-1 text-xs text-red-400">{errors.dareCategories}</p>}
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="mb-6 p-4 bg-purple-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-purple-200 border-b border-purple-600 pb-2">3. Game Settings</h3>
        <div className="mb-4">
          <label className="block text-md font-medium text-purple-300 mb-2">Turn Progression:</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="turnProgression" value="random" checked={turnProgression === 'random'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">Random</span></label>
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="turnProgression" value="sequential" checked={turnProgression === 'sequential'} onChange={(e) => setTurnProgression(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">Sequential</span></label>
          </div>
        </div>
        <div className="mb-2">
          <label className="block text-md font-medium text-purple-300 mb-2">Game Mode:</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="gameMode" value="classic" checked={gameMode === 'classic'} onChange={(e) => setGameMode(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">Classic</span></label>
            <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="gameMode" value="pair" checked={gameMode === 'pair'} onChange={(e) => setGameMode(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">Pair Mode</span></label>
          </div>
        </div>
        {gameMode === 'pair' && (
          <div className="mt-3 pl-6 border-l-2 border-purple-500">
            <label className="block text-md font-medium text-purple-300 mb-2">Pair Mode Task Type:</label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="pairModeTaskType" value="system" checked={pairModeTaskType === 'system'} onChange={(e) => setPairModeTaskType(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">System-Generated</span></label>
              <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="pairModeTaskType" value="player_defined" checked={pairModeTaskType === 'player_defined'} onChange={(e) => setPairModeTaskType(e.target.value)} disabled={isLoading} className="form-radio h-4 w-4 text-purple-400 bg-purple-500 border-purple-400 focus:ring-purple-300"/><span className="text-purple-100">Player-Defined</span></label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-purple-700 rounded-md shadow flex justify-center">
        <button onClick={handleStartGame} disabled={isLoading}
          className={`w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 shadow-lg ${isLoading ? 'opacity-50 cursor-wait' : ''}`}>
          {isLoading ? 'Starting...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}

export default TruthOrDareSetup;