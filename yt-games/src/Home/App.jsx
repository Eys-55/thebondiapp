import React, { useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import GameSelection from '../Games/TriviaNights/pages/GameSelection';
import HomePage from './HomePage';
import FeedbackModal from '../Games/Utils/utils_components/FeedbackModal'; // Import FeedbackModal
import QuizPage from '../Games/TriviaNights/pages/QuizPage'; // Renamed from LocalMultiplayerQuiz
import NotFound from '../Games/Utils/utils_components/NotFound'; // Import the NotFound component
import Navbar from './Navbar'; // Import the Navbar

// Truth or Dare components
import TruthOrDareSetup from '../Games/TruthOrDare/pages/TruthOrDareSetup';
import TruthOrDareGame from '../Games/TruthOrDare/pages/TruthOrDareGame';

// Charades components
import CharadesSetup from '../Games/Charades/pages/CharadesSetup';
import CharadesGame from '../Games/Charades/pages/CharadesGame';

// Get To Know components
import GetToKnowSetup from '../Games/GetToKnow/pages/GetToKnowSetup';
import GetToKnowGame from '../Games/GetToKnow/pages/GetToKnowGame';

// Everyone Who's components
import EveryoneWhosSetup from '../Games/EveryoneWhos/pages/EveryoneWhosSetup';
import EveryoneWhosGame from '../Games/EveryoneWhos/pages/EveryoneWhosGame';

function App() {
  const [navbarActions, setNavbarActions] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const location = useLocation();

  const registerNavbarActions = useCallback((actions) => {
    setNavbarActions(actions);
  }, []); // Empty dependency array as setNavbarActions is stable

  const unregisterNavbarActions = useCallback(() => {
    setNavbarActions(null);
  }, []); // Empty dependency array as setNavbarActions is stable

  return (
      <div className="flex flex-col min-h-screen bg-background text-textPrimary">
        <Navbar navbarActions={navbarActions} /> {/* Pass navbarActions to Navbar */}
        {/* Adjusted padding: Navbar h-16 (4rem=64px). Add some space, so pt-20 (5rem=80px) */}
        <main className="flex-grow container mx-auto px-4 pt-8 pb-4 md:pt-10"> {/* Adjust top padding for main content area */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Trivia Nights Routes */}
            <Route
              path="/trivia-nights/setup"
              element={
                <GameSelection
                  registerNavbarActions={registerNavbarActions}
                  unregisterNavbarActions={unregisterNavbarActions}
                />
              }
            />
            <Route path="/trivia-nights/play" element={<QuizPage />} />

            {/* Truth or Dare Routes */}
            <Route
              path="/truth-or-dare/setup"
              element={
                <TruthOrDareSetup
                  registerNavbarActions={registerNavbarActions}
                  unregisterNavbarActions={unregisterNavbarActions}
                />
              }
            />
            <Route path="/truth-or-dare/play" element={<TruthOrDareGame />} />

            {/* Charades Routes */}
            <Route
              path="/charades/setup"
              element={
                <CharadesSetup
                  registerNavbarActions={registerNavbarActions}
                  unregisterNavbarActions={unregisterNavbarActions}
                />
              }
            />
            <Route path="/charades/play" element={<CharadesGame />} />

            {/* Get To Know Routes */}
            <Route
              path="/get-to-know/setup"
              element={
                <GetToKnowSetup
                  registerNavbarActions={registerNavbarActions}
                  unregisterNavbarActions={unregisterNavbarActions}
                />
              }
            />
            <Route path="/get-to-know/play" element={<GetToKnowGame />} />

            {/* Everyone Who's Routes */}
            <Route
              path="/everyone-whos/setup"
              element={
                <EveryoneWhosSetup
                  registerNavbarActions={registerNavbarActions}
                  unregisterNavbarActions={unregisterNavbarActions}
                />
              }
            />
            <Route path="/everyone-whos/play" element={<EveryoneWhosGame />} />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {/* Footer removed */}

        {/* Fixed Feedback Button */}
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="fixed bottom-8 left-0
                     bg-primary hover:bg-primary-dark text-white text-sm font-medium
                     py-3 px-2 rounded-r-md shadow-lg z-50
                     focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-75"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          aria-label="Provide Feedback"
          title="Provide Feedback"
        >
          Feedback
        </button>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          currentPage={location.pathname}
        />
      </div>
  );
}

export default App;