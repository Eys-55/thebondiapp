import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGame, addPlayerToGame } from '../services/firebaseService';

function JoinGame() {
  const navigate = useNavigate();
  const { gameId: urlGameId } = useParams(); // Get gameId from URL if present

  const [gameIdInput, setGameIdInput] = useState(urlGameId || ''); // Controlled input state
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGameIdFromUrl, setIsGameIdFromUrl] = useState(!!urlGameId);

  // Effect to update state if URL param changes (though unlikely in this flow)
  useEffect(() => {
    if (urlGameId) {
      setGameIdInput(urlGameId);
      setIsGameIdFromUrl(true);
    } else {
      // If navigating back/forth and URL param disappears, reset
      // setGameIdInput(''); // Keep input if user typed something? Or clear? Let's clear.
      // setIsGameIdFromUrl(false);
    }
  }, [urlGameId]);

  const handleJoin = async () => {
    setError('');
    const finalGameId = gameIdInput.trim(); // Use the state value

    if (!finalGameId) {
      setError('Please enter a Game ID.');
      return;
    }
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setIsLoading(true);

    try {
      // 1. Check if game exists and is joinable
      const gameData = await getGame(finalGameId);
      if (!gameData) {
        setError('Game not found. Please check the ID.');
        setIsLoading(false);
        return;
      }
      if (gameData.status !== 'waiting') {
        setError('This game is no longer waiting for players.');
        setIsLoading(false);
        return;
      }

      // Check if player name already exists (simple check, might need refinement)
      const playerExists = Object.values(gameData.players || {}).some(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
      if (playerExists) {
          setError('This name is already taken in this game lobby. Please choose another.');
          setIsLoading(false);
          return;
      }


      // 2. Add player to the game
      const { playerId } = await addPlayerToGame(finalGameId, playerName.trim());

      // Store player ID locally for the session
      localStorage.setItem(`ytg-player-${finalGameId}`, playerId);

      // 3. Navigate to the lobby
      navigate(`/lobby/${finalGameId}`);

    } catch (err) {
      console.error("Error joining game:", err);
      setError(err.message || 'Failed to join game. Please check the ID and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">Join Game</h1>

      {/* Player Name Input */}
      <div className="mb-4 flex flex-col items-start">
        <label htmlFor="player-name" className="mb-1 text-sm font-medium text-gray-300">Your Name:</label>
        <input
          type="text"
          id="player-name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength="20"
          placeholder="Enter your display name"
          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          autoFocus={isGameIdFromUrl} // Autofocus name if ID is prefilled
        />
      </div>

      {/* Game ID Input */}
      <div className="mb-6 flex flex-col items-start">
        <label htmlFor="game-id" className="mb-1 text-sm font-medium text-gray-300">Game ID:</label>
        <input
          type="text"
          id="game-id"
          value={gameIdInput}
          onChange={(e) => setGameIdInput(e.target.value)}
          placeholder="Enter the Game ID"
          className={`w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${isGameIdFromUrl ? 'bg-gray-700 cursor-not-allowed' : ''}`}
          readOnly={isGameIdFromUrl} // Make read-only if ID came from URL
        />
         {isGameIdFromUrl && <p className="text-xs text-gray-400 mt-1">(Game ID from link)</p>}
      </div>

      {error && <p className="text-red-400 mb-4 font-semibold">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={isLoading}
        className={`w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Joining...' : 'Join Game Lobby'}
      </button>

      <button
        onClick={() => navigate('/')}
        className="mt-4 text-sm text-gray-400 hover:text-gray-200"
      >
        Back to Home
      </button>
    </div>
  );
}

export default JoinGame;