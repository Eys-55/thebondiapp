import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import GameSelection from '../Games/TriviaNights/pages/GameSelection';
import HomePage from './HomePage';
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

function App() {
  const [navbarActions, setNavbarActions] = useState(null);

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

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="bg-gray-800 text-center text-sm text-textSecondary p-4">
          © {new Date().getFullYear()} YT Games - Quiz App
        </footer>
      </div>
  );
}

export default App;