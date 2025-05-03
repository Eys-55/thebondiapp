import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listenToGame, startGame } from '../services/firebaseService';

function Lobby() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Retrieve host/player ID stored locally for this game
  const hostId = useMemo(() => localStorage.getItem(`ytg-host-${gameId}`), [gameId]);
  const playerId = useMemo(() => localStorage.getItem(`ytg-player-${gameId}`), [gameId]);
  const isHost = useMemo(() => gameData?.hostId === hostId, [gameData, hostId]);

  useEffect(() => {
    if (!gameId) {
      setError("No Game ID provided.");
      setLoading(false);
      navigate('/'); // Redirect if no game ID
      return;
    }

    setLoading(true);
    // Subscribe to game updates
    const unsubscribe = listenToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        setError('');

        // Check if game has started and navigate if necessary
        if (data.status === 'playing') {
            // Player/Host ID is read by QuizGame on mount from localStorage.
            // Avoid removing it here, as QuizGame needs it immediately after navigation.
            // Cleanup can happen later (e.g., on game finish or explicit leave).
            console.log("Game status is playing, navigating to quiz...");
            navigate(`/quiz/${gameId}`);
        } else if (data.status === 'finished') {
            setError("This game has already finished.");
            // Optionally navigate away or show results link
        }

      } else {
        setError("Game not found or has been deleted.");
        setGameData(null);
        // Consider navigating back or showing a persistent error
        // navigate('/');
      }
      setLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();

  }, [gameId, navigate]); // Add navigate to dependency array

  const handleStartGame = async () => {
      if (!isHost || !gameData || !hostId) return;

      setIsStarting(true);
      setError('');
      try {
          await startGame(gameId, hostId);
          // Navigation will happen automatically via the listener when status changes to 'playing'
      } catch (err) {
          console.error("Error starting game:", err);
          setError(err.message || "Failed to start the game.");
          setIsStarting(false);
      }
      // No finally block needed for setIsStarting, navigation handles transition
  };

  const players = useMemo(() => {
      if (!gameData?.players) return [];
      // Sort players, maybe host first, then by join time?
      return Object.values(gameData.players).sort((a, b) => {
          if (a.isHost) return -1;
          if (b.isHost) return 1;
          // Fallback sort, perhaps by name or join time if available
          return (a.name || '').localeCompare(b.name || '');
      });
  }, [gameData?.players]);

  if (loading) {
    return <div className="text-center text-xl text-gray-400 mt-10">Loading Lobby...</div>;
  }

  if (error && !gameData) {
     return (
        <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center mt-10">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
            <p className="text-lg mb-6 text-gray-300">{error}</p>
            <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
            Back to Home
            </button>
        </div>
     );
  }

  if (!gameData) {
      // Should be covered by loading/error states, but as a fallback
      return <div className="text-center text-xl text-gray-400 mt-10">Game data not available.</div>;
  }


  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-4 text-center text-blue-300">Game Lobby</h1>
      <p className="text-center text-gray-400 mb-2">Share this Game ID with your friends:</p>
      <div className="text-center mb-6">
        <input
            type="text"
            readOnly
            value={gameId}
            className="w-full max-w-xs mx-auto text-center text-lg font-mono bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-yellow-300 select-all"
            onClick={(e) => e.target.select()} // Select text on click
        />
         <button
            onClick={() => {
                const joinUrl = `${window.location.origin}/join/${gameId}`;
                navigator.clipboard.writeText(joinUrl);
                // Optional: Add feedback like "Link Copied!"
            }}
            className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            title="Copy Join Link"
          >
            Copy Link
          </button>
      </div>
       <p className="text-center text-xs text-gray-500 mb-6">(Copies a direct join link)</p>


      {error && <p className="text-red-400 mb-4 font-semibold text-center">{error}</p>}

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-xl font-semibold mb-3 text-gray-200">Players ({players.length}):</h2>
        <ul className="space-y-2">
          {players.map(player => (
            <li key={player.id} className="flex justify-between items-center bg-gray-600 px-3 py-1.5 rounded">
              <span className="text-gray-100 font-medium">{player.name}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${player.isHost ? 'bg-green-600 text-white' : 'bg-gray-500 text-gray-200'}`}>
                {player.isHost ? 'Host' : 'Player'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Game Config Display (Read-only for now) */}
       {gameData.config && (
         <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-3 text-gray-200">Game Settings:</h2>
            <div className="text-sm text-gray-300 space-y-1">
                <p>Categories: {gameData.config.selectedCategories?.join(', ') || 'N/A'}</p>
                <p>Questions: {gameData.config.numQuestions || 'N/A'}</p>
                <p>Time/Question: {gameData.config.timePerQuestion || 'N/A'}s</p>
                <p>Starting Lives: {gameData.config.numLives || 'N/A'}</p>
                <p>Mode: <span className="font-semibold">{
                    gameData.config.gameMode === 'first_correct_wins' ? 'First Correct Wins' : 'Safe if Correct'
                }</span></p>
            </div>
         </div>
       )}


      {isHost ? (
        <div className="text-center mt-6">
          <button
            onClick={handleStartGame}
            disabled={isStarting || players.length < 1} // Disable if starting or no players (host always exists)
            className={`w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-lg ${isStarting || players.length < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStarting ? 'Starting...' : `Start Game (${players.length} Player${players.length === 1 ? '' : 's'})`}
          </button>
           {players.length < 1 && <p className="text-xs text-yellow-400 mt-2">Waiting for players...</p>}
        </div>
      ) : (
        <div className="text-center mt-6">
          <p className="text-lg text-yellow-400 animate-pulse">Waiting for the host to start the game...</p>
        </div>
      )}

       <div className="text-center mt-8">
           <button
             onClick={() => navigate('/')} // Add a way to leave the lobby? Needs player removal logic.
             className="text-sm text-gray-400 hover:text-gray-200"
           >
             Leave Lobby (Exit)
           </button>
           {/* TODO: Implement player removal on leave */}
       </div>
    </div>
  );
}

export default Lobby;