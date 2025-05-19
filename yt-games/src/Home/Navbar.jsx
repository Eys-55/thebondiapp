import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from '../Games/Utils/utils_components/Modal'; // Import Modal component
// FeedbackModal is no longer imported or used here

// FeedbackIcon is no longer defined or used here

const ResetIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const HomeIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);


function Navbar({ navbarActions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNavigationConfirmModal, setShowNavigationConfirmModal] = useState(false);
  const [navigationTargetUrl, setNavigationTargetUrl] = useState('/'); // To store where to go after modal confirmation
  const [showAboutModal, setShowAboutModal] = useState(false); // State for About modal
  // showFeedbackModal state is removed

  let pageContextTitle = "";
  let actionButtons = null;

  const isHomePage = location.pathname === '/';
  const isTriviaSetupPage = location.pathname.startsWith('/trivia-nights/setup');
  const isTruthOrDareSetupPage = location.pathname.startsWith('/truth-or-dare/setup');
  const isCharadesSetupPage = location.pathname.startsWith('/charades/setup');
  const isGetToKnowSetupPage = location.pathname.startsWith('/get-to-know/setup'); // Added
  const isTriviaPlayPage = location.pathname.startsWith('/trivia-nights/play');
  const isTruthOrDarePlayPage = location.pathname.startsWith('/truth-or-dare/play');
  const isCharadesPlayPage = location.pathname.startsWith('/charades/play');
  const isGetToKnowPlayPage = location.pathname.startsWith('/get-to-know/play'); // Added
  const isInGame = isTriviaPlayPage || isTruthOrDarePlayPage || isCharadesPlayPage || isGetToKnowPlayPage; // Updated

  if (isTriviaSetupPage) {
    pageContextTitle = "Trivia Game Setup ❓";
  } else if (isTruthOrDareSetupPage) {
    pageContextTitle = "Truth or Dare Setup 🔥";
  } else if (isCharadesSetupPage) {
    pageContextTitle = "Charades Setup 🎭";
  } else if (isGetToKnowSetupPage) { // Added
    pageContextTitle = "Get to Know Setup 👋";
  } else if (isTriviaPlayPage) {
    pageContextTitle = "Trivia Nights ❓";
  } else if (isTruthOrDarePlayPage) {
    pageContextTitle = "Truth or Dare 🔥";
  } else if (isCharadesPlayPage) {
    pageContextTitle = "Charades! 🎭";
  } else if (isGetToKnowPlayPage) { // Added
    pageContextTitle = "Get to Know 👋";
  } else if (isHomePage) {
    pageContextTitle = "Select a Game 🎮";
  }


  const handleHomeClick = () => {
    if (isInGame) {
      setNavigationTargetUrl('/'); // Target is home
      setShowNavigationConfirmModal(true);
    } else {
      navigate('/');
    }
  };

  // New handler for "Leave Game" or other modal-confirmed navigations
  const handleLeaveGameClick = (targetPath) => {
    setNavigationTargetUrl(targetPath);
    setShowNavigationConfirmModal(true);
  };

  const confirmNavigation = () => { // Renamed from confirmGoHome
    navigate(navigationTargetUrl);
    setShowNavigationConfirmModal(false);
  };

  if (isTriviaSetupPage || isTruthOrDareSetupPage || isCharadesSetupPage || isGetToKnowSetupPage) { // Updated
    actionButtons = (
      <>
        {navbarActions && navbarActions.resetHandler && (
          <button
            onClick={navbarActions.resetHandler}
            disabled={navbarActions.isLoading}
            className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset Settings"
            aria-label="Reset Settings"
          >
            <ResetIcon className="w-5 h-5" />
          </button>
        )}
        {navbarActions && navbarActions.startHandler && (
          <button
            onClick={navbarActions.startHandler}
            disabled={navbarActions.isLoading || !navbarActions.isValidToStart}
            className={`font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out
                        ${(navbarActions.isLoading || !navbarActions.isValidToStart) ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-success hover:bg-success-dark text-white'}`}
          >
            {navbarActions.isLoading ? 'Starting...' : 'Start Game'}
          </button>
        )}
      </>
    );
  } else if (isTriviaPlayPage) {
    actionButtons = (
      <button
        onClick={() => handleLeaveGameClick('/trivia-nights/setup')} // Use modal for leaving game
        className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Leave Game
      </button>
    );
  } else if (isTruthOrDarePlayPage) {
    actionButtons = (
      <button
        onClick={() => handleLeaveGameClick('/truth-or-dare/setup')} // Use modal for leaving game
        className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Leave Game
      </button>
    );
  } else if (isCharadesPlayPage) { // Added
    actionButtons = (
      <button
        onClick={() => handleLeaveGameClick('/charades/setup')} // Use modal for leaving game
        className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Leave Game
      </button>
    );
  } else if (isGetToKnowPlayPage) { // Added
    actionButtons = (
      <button
        onClick={() => handleLeaveGameClick('/get-to-know/setup')} // Use modal for leaving game
        className="bg-danger hover:bg-danger-dark text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
      >
        Leave Game
      </button>
    );
  }

  return (
    <>
      <nav className="bg-gray-800 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 grid grid-cols-3 items-center">
          {/* Left Section: Logo/Home Link */}
          <div className="flex items-center justify-start">
            {!isHomePage && (
              <button
                onClick={handleHomeClick}
                className="text-primary-light hover:text-primary transition duration-200 p-2 rounded-md"
                title="Go to Home"
                aria-label="Go to Home"
              >
                <HomeIcon className="w-7 h-7" />
              </button>
            )}
             {isHomePage && ( // Placeholder for YT Games text or logo if needed on homepage
                <span className="text-2xl font-bold text-primary-light">YT Games</span>
             )}
          </div>
          
          {/* Center Section: Page Context Title */}
          <div className="text-center">
            {pageContextTitle && (
              <span className="text-lg sm:text-xl text-gray-300 truncate" title={pageContextTitle}>
                {pageContextTitle}
              </span>
            )}
          </div>
          
          {/* Right Section: Action Buttons */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3">
            {/* Feedback button removed from here */}
            {isHomePage && (
              <button
                onClick={() => setShowAboutModal(true)}
                className="text-gray-300 hover:text-white font-medium py-2 px-3 rounded-md text-sm transition duration-150 ease-in-out"
                title="About YT Games"
              >
                About
              </button>
            )}
            {actionButtons}
          </div>
        </div>
      </nav>

      <Modal
        isOpen={showNavigationConfirmModal}
        onClose={() => setShowNavigationConfirmModal(false)}
        title="Leave Game?"
        titleColor="text-warning-light"
        footerContent={
          <>
            <button
              onClick={() => setShowNavigationConfirmModal(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
            >
              No, Stay
            </button>
            <button
              onClick={confirmNavigation}
              className="px-4 py-2 bg-danger hover:bg-danger-dark text-white font-semibold rounded-md transition-colors"
            >
              Yes, Leave
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to leave the current game? Your progress may be lost.
        </p>
      </Modal>

      {/* About Modal */}
      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="About YT Games"
        titleColor="text-primary-light"
        footerContent={
          <button
            onClick={() => setShowAboutModal(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
          >
            Close
          </button>
        }
      >
        <div className="space-y-3 text-gray-300">
          <p>
            <strong>YT Games</strong> is a collection of fun and engaging party games designed to be played with friends and family.
          </p>
          <p>
            This application is built with React, Tailwind CSS, and Firebase, aiming to provide a seamless and enjoyable gaming experience directly in your browser.
          </p>
          <p>
            Explore games like Trivia, Truth or Dare, Charades, and Get to Know You questions!
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Version: 1.0.0 (Placeholder)
          </p>
        </div>
      </Modal>

      {/* FeedbackModal instance removed from here */}
    </>
  );
}

export default Navbar;