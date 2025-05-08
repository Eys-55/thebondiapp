import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show back button on Local Multiplayer Quiz page
  const showBackButton = location.pathname.startsWith('/local-quiz');
  
  const buttonText = 'Leave Game';
  const buttonTitle = 'Leave Local Multiplayer Game';


  const handleLeave = () => {
    // Only handle leave for the local multiplayer quiz
    if (showBackButton) {
        if (window.confirm("Are you sure you want to leave this game? Your progress will be lost.")) {
            navigate('/');
            toast.info("You have left the game.");
        }
    } else {
        // Fallback if somehow called when button isn't shown
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