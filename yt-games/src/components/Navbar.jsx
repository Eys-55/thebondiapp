import React from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { leaveGame } from '../services/firebaseService'; // Import leaveGame

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams(); // Get gameId if present in URL

  // Show back button on Lobby or Quiz pages
  const showBackButton = location.pathname.startsWith('/lobby/') || location.pathname.startsWith('/quiz/');
  const isQuizPage = location.pathname.startsWith('/quiz/');

  const handleLeave = async () => {
    if (!gameId) {
      navigate('/'); // Should not happen if button is shown, but safeguard
      return;
    }

    const leaveMessage = isQuizPage
        ? "Are you sure you want to leave the game? Your progress might be lost if you rejoin later."
        : "Are you sure you want to leave the lobby?";

    if (window.confirm(leaveMessage)) {
        const playerId = localStorage.getItem(`ytg-player-${gameId}`);
        const hostId = localStorage.getItem(`ytg-host-${gameId}`);
        const userIdToLeave = playerId || hostId; // Get whichever ID is stored

        if (userIdToLeave) {
            try {
                console.log(`Attempting to leave game ${gameId} as user ${userIdToLeave}`);
                await leaveGame(gameId, userIdToLeave);
                console.log(`Successfully called leaveGame for user ${userIdToLeave}`);
                toast.info("You have left the game.");
            } catch (error) {
                console.error(`Failed to update Firestore on leaving game ${gameId}:`, error);
                // Proceed with cleanup and navigation even if Firestore update fails
                // Optionally show an error message to the user
                toast.error(`Error leaving game: ${error.message}. Cleaning up locally.`);
            }
        } else {
             console.warn("Could not find player/host ID in local storage to leave game.");
             // Proceed with cleanup anyway, as user intention is clear
             toast.warn("Could not find local identity. Cleaning up locally.");
        }

        // Clear local storage regardless of Firestore success/failure
        localStorage.removeItem(`ytg-host-${gameId}`);
        localStorage.removeItem(`ytg-player-${gameId}`);
        console.log(`Cleared local storage for game ${gameId}`);

        // Navigate back to home
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
              title={isQuizPage ? "Leave Game" : "Leave Lobby"}
            >
              {isQuizPage ? 'Leave Game' : 'Leave Lobby'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;