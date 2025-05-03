import React from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams(); // Get gameId if present in URL

  // Show back button on Lobby or Quiz pages
  const showBackButton = location.pathname.startsWith('/lobby/') || location.pathname.startsWith('/quiz/');
  const isQuizPage = location.pathname.startsWith('/quiz/');

  const handleBack = () => {
    // If on quiz page, go back to lobby (if gameId exists)
    // If on lobby page, go back to home/selection
    // TODO: Add logic to remove player from game if they leave lobby/quiz
    if (isQuizPage && gameId) {
        // Ideally, prompt user "Are you sure you want to leave the game?"
        // And potentially update Firestore to mark player as 'left' or remove them
        console.warn("Leaving quiz - player state not updated in Firestore yet.");
        navigate(`/lobby/${gameId}`); // Go back to lobby first? Or home?
    } else if (location.pathname.startsWith('/lobby/')) {
         console.warn("Leaving lobby - player state not updated in Firestore yet.");
         navigate('/'); // Go back to home
    }
     else {
        navigate('/'); // Default back action
    }
     // Clear local storage related to the game being left
     if (gameId) {
        localStorage.removeItem(`ytg-host-${gameId}`);
        localStorage.removeItem(`ytg-player-${gameId}`);
     }
  };

  return (
    <nav className="bg-gray-800 text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="navbar-brand">
          {/* Link brand to game selection screen */}
          <Link to="/" className="text-xl font-bold hover:text-blue-400 transition duration-200">
            YT Games
          </Link>
        </div>
        <div className="navbar-links">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              title={isQuizPage ? "Leave Game (Back to Lobby/Home)" : "Leave Lobby (Back to Home)"}
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