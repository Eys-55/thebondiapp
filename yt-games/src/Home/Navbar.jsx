import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  let pageContextTitle = ""; // e.g., "Quiz Game Setup", "Trivia Nights"
  let actionButton = null;

  // Trivia Nights Setup page
  if (location.pathname.startsWith('/trivia-nights/setup')) {
    pageContextTitle = "Quiz Game Setup";
    actionButton = (
      <button
        onClick={() => navigate('/')}
        className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Back to Home
      </button>
    );
  }
  // Trivia Nights Play page
  else if (location.pathname.startsWith('/trivia-nights/play')) {
    pageContextTitle = "Trivia Nights";
    actionButton = (
      <button
        onClick={() => {
          // Optional: Add confirmation dialog
          // if (window.confirm("Are you sure you want to leave the game? Your progress will be lost.")) {
          navigate('/trivia-nights/setup');
          // }
        }}
        className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Leave Game
      </button>
    );
  }
  // For other pages like home or 404, no specific action button is added here from Navbar.
  // Home page is linked by brand. NotFound page has its own controls.

  return (
    <nav className="bg-gray-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center"> {/* Fixed height for navbar */}
        <div className="flex items-center flex-shrink-0"> {/* Added flex-shrink-0 */}
          <Link to="/" className="text-2xl font-bold hover:text-primary-light transition duration-200 mr-2 sm:mr-6">
            YT Games
          </Link>
          {pageContextTitle && (
            // Context title, potentially truncated on very small screens if too long
            <span className="text-lg sm:text-xl text-gray-300 hidden md:block truncate" title={pageContextTitle}>
              | {pageContextTitle}
            </span>
          )}
        </div>
        
        <div className="flex items-center ml-auto"> {/* Ensure action button is pushed to the right */}
          {actionButton}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;