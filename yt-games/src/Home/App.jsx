import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import GameSelection from '../TriviaNights/pages/GameSelection';
import QuizPage from '../TriviaNights/pages/QuizPage'; // Renamed from LocalMultiplayerQuiz
import NotFound from '../TriviaNights/pages/NotFound';
import Navbar from './Navbar'; // Import the Navbar

// Truth or Dare components
import TruthOrDareSetup from '../TruthOrDare/pages/TruthOrDareSetup';
import TruthOrDareGame from '../TruthOrDare/pages/TruthOrDareGame';

function App() {
  return (
      <div className="flex flex-col min-h-screen bg-background text-textPrimary">
        <Navbar /> {/* Navbar is now global and sticky */}
        {/* Adjusted padding: Navbar h-16 (4rem=64px). Add some space, so pt-20 (5rem=80px) */}
        <main className="flex-grow container mx-auto px-4 pt-8 pb-4 md:pt-10"> {/* Adjust top padding for main content area */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Trivia Nights Routes */}
            <Route path="/trivia-nights/setup" element={<GameSelection />} />
            <Route path="/trivia-nights/play" element={<QuizPage />} />

            {/* Truth or Dare Routes */}
            <Route path="/truth-or-dare/setup" element={<TruthOrDareSetup />} />
            <Route path="/truth-or-dare/play" element={<TruthOrDareGame />} />

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