import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { addPlayerToGame } from '../services/firebaseService'; // Assuming getGame only reads data
import Spinner from '../components/Spinner'; // Import Spinner

function JoinGame() {
  const navigate = useNavigate();
  const { gameId: urlGameId } = useParams(); // Get gameId from URL if present

  const [gameIdInput, setGameIdInput] = useState(urlGameId || ''); // Controlled input state
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState(''); // Inline validation errors
  const [internalError, setInternalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGameIdFromUrl, setIsGameIdFromUrl] = useState(!!urlGameId);

  // Effect to update state if URL param changes
  useEffect(() => {
    if (urlGameId) {
      setGameIdInput(urlGameId);
      setIsGameIdFromUrl(true);
       // Clear error if URL changes and might be valid now
      setError('');
      setInternalError('');
    } else {
      // If navigating back/forth and URL param disappears, allow editing
       setIsGameIdFromUrl(false);
       // Don't clear gameIdInput, user might be typing
    }
  }, [urlGameId]);

  const handleJoin = async () => {
    setError('');
    setInternalError('');
    const finalGameId = gameIdInput.trim();
    const finalPlayerName = playerName.trim();

    // Frontend Validation
    if (!finalGameId) {
      setError('Please enter a Game ID.');
      return;
    }
    if (!finalPlayerName) {
      setError('Please enter your name.');
      return;
    }
     if (finalPlayerName.length > 20) {
        setError('Name cannot exceed 20 characters.');
        return;
     }

    setIsLoading(true);

    try {
      // NOTE: `addPlayerToGame` now includes checks for game existence, status, and name uniqueness within a transaction.
      // We don't need the separate `getGame` call here anymore for pre-validation.

      // 1. Attempt to add player to the game
      const { playerId } = await addPlayerToGame(finalGameId, finalPlayerName);

      // 2. Store player ID locally for the session
      // Ensure any previous host/player ID for potentially different games is cleared? Maybe not needed.
      // Clear potential host ID for the *same* game if joining as player.
      localStorage.removeItem(`ytg-host-${finalGameId}`);
      localStorage.setItem(`ytg-player-${finalGameId}`, playerId);
      console.log(`Stored player ID ${playerId} for game ${finalGameId}`);

      // 3. Navigate to the lobby
      navigate(`/lobby/${finalGameId}`);

    } catch (err) {
      console.error("Error joining game:", err);
      const errorMessage = err.message || 'Failed to join game. Please check the ID/name and try again.';
      // Use the specific error message thrown by addPlayerToGame
      setError(errorMessage); // Show inline for context
      setInternalError(`addPlayerToGame failed: ${err.message}`);
      toast.error(errorMessage); // Show toast for persistence
      setIsLoading(false);
    }
    // No need for finally setIsLoading(false) here, navigation handles it on success
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-warning-light">Join Game</h1>

      {/* Player Name Input */}
      <div className="mb-4 flex flex-col items-start">
        <label htmlFor="player-name" className="mb-1 text-sm font-medium text-textSecondary">Your Name:</label>
        <input
          type="text"
          id="player-name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength="20"
          placeholder="Enter your display name (max 20)"
          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-warning focus:border-transparent"
          autoFocus={isGameIdFromUrl} // Autofocus name if ID is prefilled
          disabled={isLoading}
        />
      </div>

      {/* Game ID Input */}
      <div className="mb-6 flex flex-col items-start">
        <label htmlFor="game-id" className="mb-1 text-sm font-medium text-textSecondary">Game ID:</label>
        <input
          type="text"
          id="game-id"
          value={gameIdInput}
          onChange={(e) => setGameIdInput(e.target.value)}
          placeholder="Enter the Game ID"
          className={`w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-warning focus:border-transparent ${isGameIdFromUrl ? 'bg-gray-700 cursor-not-allowed' : ''}`}
          readOnly={isGameIdFromUrl || isLoading} // Make read-only if ID came from URL or loading
          disabled={isLoading}
        />
         {isGameIdFromUrl && <p className="text-xs text-textSecondary mt-1">(Game ID from link)</p>}
      </div>

      {/* Error Display (Inline Validation) */}
       {error && !isLoading && ( // Only show inline error if not loading (toast handles loading errors)
            <div className="mb-4 p-3 bg-danger-dark border border-danger rounded text-left">
                <p className="font-semibold text-danger-light">{error}</p>
                {internalError && <p className="text-xs text-danger-light mt-1 opacity-80">Details: {internalError}</p>}
            </div>
        )}


      <button
        onClick={handleJoin}
        disabled={isLoading}
        className={`w-full bg-warning hover:bg-warning-dark text-gray-900 font-bold py-3 px-6 rounded-lg text-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-warning focus:ring-opacity-50 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" color="border-gray-900" />
            <span className="ml-2">Joining...</span>
          </>
        ) : (
          'Join Game Lobby'
        )}
      </button>

      <button
        onClick={() => navigate('/')}
        disabled={isLoading}
        className="mt-4 text-sm text-textSecondary hover:text-textPrimary disabled:opacity-50"
      >
        Back to Home
      </button>
    </div>
  );
}

export default JoinGame;