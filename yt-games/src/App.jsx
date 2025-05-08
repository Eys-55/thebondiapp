import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Removed BrowserRouter as Router
import Navbar from './components/Navbar';
import GameSelection from './pages/GameSelection';
// import SinglePlayerQuiz from './pages/SinglePlayerQuiz'; // Removed import
import LocalMultiplayerQuiz from './pages/LocalMultiplayerQuiz';
import NotFound from './pages/NotFound'; // Assuming you have/want a 404 page

function App() {
  return (
    // <Router> was removed from here
      <div className="flex flex-col min-h-screen bg-background text-textPrimary">
        <Navbar />
        <main className="flex-grow container mx-auto p-4 pt-8">
          <Routes>
            <Route path="/" element={<GameSelection />} />
            {/* <Route path="/quiz/single-player" element={<SinglePlayerQuiz />} /> */} {/* Removed route */}
            <Route path="/local-quiz" element={<LocalMultiplayerQuiz />} />
            {/* Add other non-Firebase routes here if any */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="bg-gray-800 text-center text-sm text-textSecondary p-4">
          © {new Date().getFullYear()} YT Games - Quiz App
        </footer>
      </div>
    // </Router> was removed from here
  );
}

export default App;