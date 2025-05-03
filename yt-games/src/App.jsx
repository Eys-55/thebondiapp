import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import CSS
import Navbar from './components/Navbar';
import GameSelection from './pages/GameSelection';
import JoinGame from './pages/JoinGame'; // Import JoinGame
import Lobby from './pages/Lobby';       // Import Lobby
import QuizGame from './pages/QuizGame';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<GameSelection />} />
          <Route path="/join" element={<JoinGame />} /> {/* Generic Join Route */}
          <Route path="/join/:gameId" element={<JoinGame />} /> {/* Specific Join Route */}
          <Route path="/lobby/:gameId" element={<Lobby />} /> {/* Route for the lobby */}
          <Route path="/quiz/:gameId" element={<QuizGame />} /> {/* Route for the game, using gameId */}
          {/* Fallback route for unknown paths */}
          <Route path="*" element={<GameSelection />} /> {/* Redirect unknown paths to selection */}
        </Routes>
      </main>
      {/* Footer could go here */}
      {/* Add ToastContainer here */}
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark" // Use dark theme
      />
    </div>
  );
}

export default App;