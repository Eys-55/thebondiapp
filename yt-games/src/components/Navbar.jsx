import React from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { leaveGame } from '../services/firebaseService'; // Import leaveGame

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams(); // Get gameId if present in URL for multiplayer

  const isMultiplayerLobby = location.pathname.startsWith('/lobby/');
  const isMultiplayerQuiz = location.pathname.startsWith('/quiz/') && !location.pathname.startsWith('/quiz/single-player');
  const isSinglePlayerQuiz = location.pathname.startsWith('/quiz/single-player');

  // Show back button on Lobby or Quiz pages (both single and multiplayer)
  const showBackButton = isMultiplayerLobby || isMultiplayerQuiz || isSinglePlayerQuiz;
  
  const getButtonTextAndTitle = () => {
    if (isSinglePlayerQuiz) return { text: 'Leave Game', title: 'Leave Single Player Game' };
    if (isMultiplayerQuiz) return { text: 'Leave Game', title: 'Leave Multiplayer Game' };
    if (isMultiplayerLobby) return { text: 'Leave Lobby', title: 'Leave Multiplayer Lobby' };
    return { text: 'Leave', title: 'Leave' }; // Fallback
  };
  const { text: buttonText, title: buttonTitle } = getButtonTextAndTitle();


  const handleLeave = async () => {
    if (isSinglePlayerQuiz) {
        if (window.confirm("Are you sure you want to leave this single-player game? Your progress will be lost.")) {
            navigate('/');
            toast.info("You have left the single-player game.");
        }
        return;
    }

    // Multiplayer leave logic
    if (!gameId) {
      // This case should ideally not be reached if showBackButton is true for multiplayer
      console.error("Leave action attempted on multiplayer page without gameId.");
      toast.error("Cannot leave: Game ID is missing.");
      navigate('/');
      return;
    }

    const leaveMessage = isMultiplayerQuiz
        ? "Are you sure you want to leave the game? Your progress might be lost if you rejoin later."
        : "Are you sure you want to leave the lobby?";

    if (window.confirm(leaveMessage)) {
        const playerId = localStorage.getItem(`ytg-player-${gameId}`);
        const hostId = localStorage.getItem(`ytg-host-${gameId}`);
        const userIdToLeave = playerId || hostId;

        if (userIdToLeave) {
            try {
                console.log(`Attempting to leave game ${gameId} as user ${userIdToLeave}`);
                await leaveGame(gameId, userIdToLeave);
                console.log(`Successfully called leaveGame for user ${userIdToLeave}`);
                toast.info("You have left the game.");
            } catch (error) {
                console.error(`Failed to update Firestore on leaving game ${gameId}:`, error);
                toast.error(`Error leaving game: ${error.message}. Cleaning up locally.`);
            }
        } else {
             console.warn("Could not find player/host ID in local storage to leave game.");
             toast.warn("Could not find local identity. Cleaning up locally.");
        }

        localStorage.removeItem(`ytg-host-${gameId}`);
        localStorage.removeItem(`ytg-player-${gameId}`);
        console.log(`Cleared local storage for game ${gameId}`);
        navigate('/');
    }
  };

  return (
    <nav className="bg-gray-800 text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="navbar-brand">
          <Link to="/" className="text-xl font-bold hover:text-primary-light transition duration-200">
            YT Games
          </Link>
        </div>
        <div className="navbar-links">
          {showBackButton && (
            <button
              onClick={handleLeave}
              className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-danger focus:ring-opacity-50"
              title={buttonTitle}
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;