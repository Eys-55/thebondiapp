import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { listenToGame, startGame } from '../services/firebaseService';
import Spinner from '../components/Spinner'; // Import Spinner

// Simple hash function for consistent avatar colors (optional)
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const color = `hsl(${hash % 360}, 70%, 80%)`; // Light pastel colors
    const textColor = `hsl(${hash % 360}, 80%, 25%)`; // Darker text color
    return { backgroundColor: color, color: textColor };
};

// Get initials from name
const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};


function Lobby() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // User-facing errors (kept for critical/persistent issues)
  const [internalError, setInternalError] = useState(''); // Internal/console errors
  const [isStarting, setIsStarting] = useState(false);

  // Retrieve host/player ID stored locally for this game
  const hostId = useMemo(() => localStorage.getItem(`ytg-host-${gameId}`), [gameId]);
  const playerId = useMemo(() => localStorage.getItem(`ytg-player-${gameId}`), [gameId]);
   // Determine if the current user is the host based on stored ID and game data
  const isHost = useMemo(() => !!gameData && !!hostId && gameData.hostId === hostId, [gameData, hostId]);

  useEffect(() => {
    if (!gameId) {
      setError("No Game ID provided.");
      setInternalError("gameId missing in URL params");
      toast.error("No Game ID provided. Redirecting home.");
      setLoading(false);
      navigate('/'); // Redirect if no game ID
      return;
    }

    // Check if user has *any* ID stored for this game, otherwise they shouldn't be here
    if (!hostId && !playerId) {
        const errMsg = "Access denied: No player or host identity found for this game lobby.";
        setError(errMsg);
        setInternalError(`No ytg-host-${gameId} or ytg-player-${gameId} found in localStorage.`);
        toast.error(errMsg + " Redirecting to join page.");
        setLoading(false);
        setTimeout(() => navigate('/join'), 3000); // Redirect to join page
        return;
    }


    setLoading(true);
    setError('');
    setInternalError('');

    // Subscribe to game updates
    const unsubscribe = listenToGame(gameId, (data, listenerError) => {
       if (listenerError) {
            console.error("Firestore listener error:", listenerError);
            const errMsg = "Connection error: Could not sync lobby state.";
            setError(errMsg); // Keep error state for potential display
            setInternalError(`Listener error: ${listenerError.message}`);
            toast.error(errMsg); // Show toast for connection issues
            setLoading(false); // Stop loading even on error
            // Don't navigate away automatically on listener errors, maybe connection recovers
            return;
       }

      if (data) {
        setGameData(data);
        setError(''); // Clear error on successful data fetch
        setInternalError('');

        // Check if game has started and navigate if necessary
        if (data.status === 'playing') {
            console.log("Game status changed to playing, navigating to quiz...");
            // Optional: toast.info("Game starting!");
            navigate(`/quiz/${gameId}`);
        } else if (data.status === 'finished') {
            const errMsg = "This game has already finished.";
            setError(errMsg);
            toast.warn(errMsg); // Use warn toast
            // Allow viewing finished lobby state? Or navigate? Let's show error and stay.
            console.warn(`Lobby listener received 'finished' status for game ${gameId}`);
        } else if (data.status !== 'waiting') {
            // Handle unexpected status if needed
             console.warn(`Lobby listener received unexpected status '${data.status}' for game ${gameId}`);
             // Maybe navigate to quiz page just in case? Or show error?
             // Let's assume if it's not waiting/playing/finished, it's an issue.
             // setError("Game is in an unexpected state.");
             // toast.warn(`Game is in an unexpected state: ${data.status}`);
        }

      } else {
        // Game document doesn't exist (deleted or wrong ID)
        const errMsg = "Game not found. It may have been deleted or the ID is incorrect.";
        setError(errMsg);
        setInternalError(`Game data null for ${gameId}`);
        toast.error(errMsg);
        setGameData(null); // Clear game data
        // Consider navigating back or showing a persistent error
        // setTimeout(() => navigate('/'), 3000); // Navigate after message
      }
      setLoading(false); // Stop loading indicator after processing
    });

    // Cleanup subscription on component unmount
    return () => {
        console.log(`Unsubscribing lobby listener for game ${gameId}`);
        unsubscribe();
    };

  }, [gameId, navigate, hostId, playerId]); // Add hostId/playerId checks dependency

  const handleStartGame = async () => {
      if (!isHost || !gameData || !hostId || isStarting) return;

      setIsStarting(true);
      setError('');
      setInternalError('');
      try {
          await startGame(gameId, hostId);
          // Navigation will happen automatically via the listener when status changes to 'playing'
          console.log(`Host ${hostId} initiated start for game ${gameId}`);
          // Optional: toast.success("Starting game..."); // Might be too quick before navigation
      } catch (err) {
          console.error("Error starting game:", err);
          const errMsg = err.message || "Failed to start the game.";
          setError(errMsg); // Show specific error from service
          setInternalError(`startGame failed: ${err.message}`);
          toast.error(errMsg);
          setIsStarting(false); // Allow retry if failed
      }
      // No finally block needed for setIsStarting, navigation or error handles transition
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${gameId}`;
    navigator.clipboard.writeText(joinUrl)
        .then(() => {
            toast.success("Link copied to clipboard!"); // Use toast for feedback
        })
        .catch(err => {
            console.error("Failed to copy join link:", err);
            toast.error("Failed to copy link to clipboard."); // Show error toast
        });
  };

  const players = useMemo(() => {
      if (!gameData?.players) return [];
      // Sort players: Host first, then by name alphabetically
      return Object.values(gameData.players).sort((a, b) => {
          if (a.isHost) return -1;
          if (b.isHost) return 1;
          return (a.name || '').localeCompare(b.name || '');
      });
  }, [gameData?.players]);

  // --- Render States ---

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-xl text-textSecondary">Loading Lobby...</p>
        </div>
    );
  }

  // Handle case where game is not found after loading attempt (error state is set)
  if (!gameData && error) {
     return (
        <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-center mt-10 border border-danger">
            <h2 className="text-2xl font-bold mb-4 text-danger-light">Lobby Error</h2>
            <p className="text-lg mb-6 text-textPrimary">{error}</p>
            {internalError && <p className="text-xs text-textSecondary mb-4">Details: {internalError}</p>}
            <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
            Back to Home
            </button>
        </div>
     );
  }

   // Fallback if data somehow becomes null after loading without an error state being set
   if (!gameData) {
       return <div className="text-center text-xl text-textSecondary mt-10">Lobby data currently unavailable. Please try refreshing.</div>;
   }


  // --- Main Lobby Render ---
  const gameConfig = gameData.config || {}; // Default to empty object if config missing
  const gameModeName = gameConfig.gameMode === 'first_correct_wins' ? 'First Correct Wins' : 'Safe if Correct';


  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-4 text-center text-primary-light">Game Lobby</h1>
      <p className="text-center text-textSecondary mb-2">Share this Game ID or Link:</p>
      <div className="text-center mb-2 flex justify-center items-center gap-3">
        <input
            type="text"
            readOnly
            value={gameId}
            className="w-full max-w-[200px] text-center text-xl font-bold font-mono bg-gray-700 border border-gray-600 rounded px-3 py-2 text-warning-light select-all" // Increased size/weight
            onClick={(e) => e.target.select()} // Select text on click
            aria-label="Game ID"
        />
         <button
            onClick={handleCopyLink}
            className={'bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 text-base rounded transition-colors duration-200 flex items-center gap-2'} // Larger button, flex for icon
            title="Copy Join Link"
          >
            {/* Simple text icon, replace with SVG if desired */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Link
          </button>
      </div>
       <p className="text-center text-xs text-gray-500 mb-6">(Link includes the Game ID)</p>

      {/* Display Persistent Errors (e.g., finished game, connection issues) */}
      {error && (
          <div className="mb-4 p-3 bg-danger-dark border border-danger rounded text-center">
              <p className="font-semibold text-danger-light">{error}</p>
              {internalError && <p className="text-xs text-danger-light mt-1 opacity-80">Details: {internalError}</p>}
          </div>
      )}


      {/* Players List */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h2 className="text-xl font-semibold mb-3 text-textPrimary">Players ({players.length}):</h2>
        {players.length === 0 && <p className="text-textSecondary italic">Waiting for players...</p>}
        <ul className="space-y-2 max-h-[200px] overflow-y-auto">
          {players.map(player => {
            const avatarStyle = stringToColor(player.name || player.id);
            const initials = getInitials(player.name);
            return (
                <li key={player.id} className="flex items-center bg-gray-600 px-3 py-2 rounded transition-opacity duration-300 ease-in-out opacity-0 animate-fade-in"> {/* Added animation classes */}
                    {/* Avatar */}
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-semibold text-sm"
                        style={avatarStyle}
                        title={player.name}
                    >
                        {initials}
                    </div>
                    {/* Name and Host Badge */}
                    <span className="text-textPrimary font-medium truncate mr-2 flex-grow">{player.name}</span>
                    {player.isHost && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap bg-success text-white ml-auto">
                            Host
                        </span>
                    )}
                </li>
            );
          })}
        </ul>
      </div>

      {/* Game Config Display */}
       <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h2 className="text-xl font-semibold mb-3 text-textPrimary">Game Settings:</h2>
          <div className="text-sm text-textSecondary space-y-1">
              <p>Categories: <span className="font-medium text-textPrimary">{gameConfig.selectedCategories?.join(', ') || 'Not set'}</span></p>
              <p>Questions: <span className="font-medium text-textPrimary">{gameConfig.numQuestions ?? 'N/A'}</span></p>
              <p>Time/Question: <span className="font-medium text-textPrimary">{gameConfig.timePerQuestion ?? 'N/A'}s</span></p>
              <p>Starting Lives: <span className="font-medium text-textPrimary">{gameConfig.numLives ?? 'N/A'}</span></p>
              <p>Mode: <span className="font-medium text-textPrimary">{gameModeName}</span></p>
              <p>Results Cooldown: <span className="font-medium text-textPrimary">{gameConfig.cooldownSeconds ?? 'N/A'}s</span></p>
          </div>
       </div>


       {/* Action Area: Start Button (Host) or Waiting Message (Player) */}
      {isHost ? (
        <div className="text-center mt-6">
          <button
            onClick={handleStartGame}
            disabled={isStarting || players.length < 1 || gameData.status !== 'waiting'} // Disable if starting, no players, or game not waiting
            className={`w-full md:w-auto bg-success hover:bg-success-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center ${isStarting || players.length < 1 || gameData.status !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStarting ? (
                <>
                    <Spinner size="sm" />
                    <span className="ml-2">Starting...</span>
                </>
            ) : (
                gameData.status !== 'waiting' ? `Game Status: ${gameData.status}` : `Start Game (${players.length} Player${players.length === 1 ? '' : 's'})`
            )}
          </button>
           {players.length < 1 && gameData.status === 'waiting' && !isStarting && <p className="text-xs text-warning-light mt-2">Waiting for players to join...</p>}
        </div>
      ) : (
        <div className="text-center mt-6">
           {gameData.status === 'waiting' ? (
                <p className="text-lg text-warning-light animate-pulse">Waiting for the host ({gameData.players[gameData.hostId]?.name || '...'}) to start the game...</p>
           ) : (
                 <p className="text-lg text-textSecondary">Game status: {gameData.status}</p> // Show other statuses if not waiting
           )}
        </div>
      )}

       {/* Secondary Action Button */}
       <div className="text-center mt-8">
           <button
             onClick={() => navigate('/')} // Simple navigation back home
             className="text-sm text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 font-medium py-2 px-4 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
             title="Go back to the main game selection screen. Use the 'Leave Lobby' button in the top bar to formally exit the game."
           >
             Go to Game Selection
           </button>
       </div>
    </div>
  );
}

export default Lobby;