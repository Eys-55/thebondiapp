import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePlayerRoulette from '../../Utils/utils_hooks/usePlayerRoulette';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';
import questionsData from '../data/questions.json'; // Direct import for simplicity

const PLAYER_ROULETTE_DURATION = 2500;
const QUESTION_ROULETTE_INTERVAL = 100;
const QUESTION_ROULETTE_DURATION = 1500;

function GetToKnowGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const [gameConfig, setGameConfig] = useState(location.state?.gameConfig || null);
  const [players, setPlayers] = useState([]);
  const [allQuestionsData] = useState(questionsData); // Loaded directly
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  
  const [gamePhase, setGamePhase] = useState('loading'); // 'loading', 'chooser_selection_start', 'chooser_selection_roulette', 'question_selection_pending', 'question_selection_roulette', 'question_revealed', 'game_ended'
  const [currentChooser, setCurrentChooser] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionRouletteDisplayText, setQuestionRouletteDisplayText] = useState('');

  const isMountedRef = useRef(true);
  const questionRouletteIntervalRef = useRef(null);
  const questionRouletteTimeoutRef = useRef(null);

  const {
    rouletteDisplayText: playerRouletteText,
    isRouletteSpinning: isPlayerRouletteSpinning,
    spinPlayerRoulette,
    selectedPlayer: playerRouletteSelectedPlayer,
    setRouletteDisplayText: setPlayerRouletteText,
  } = usePlayerRoulette(players);


  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearInterval(questionRouletteIntervalRef.current);
      clearTimeout(questionRouletteTimeoutRef.current);
    };
  }, []);

  // Effect for Initial Game Setup
  useEffect(() => {
    if (!gameConfig) {
      toast.error("Game configuration is missing. Redirecting to setup.");
      navigate('/get-to-know/setup');
      setGamePhase('game_ended');
      return;
    }

    if (!allQuestionsData) {
      toast.error("Failed to load questions. Please try again.");
      navigate('/get-to-know/setup');
      setGamePhase('game_ended');
      return;
    }
    
    setPlayers(gameConfig.players || []);
    const categoryQuestions = allQuestionsData[gameConfig.selectedCategory] || [];
    const questionTexts = categoryQuestions.map(q => q.text);
    
    if (questionTexts.length === 0) {
      toast.error(`No questions found for category: ${gameConfig.selectedCategory}. Ending game.`);
      setFilteredQuestions([]);
      setGamePhase('game_ended'); // Or a specific error phase
    } else {
      setFilteredQuestions(questionTexts);
      setGamePhase('chooser_selection_start');
    }
  }, [gameConfig, allQuestionsData, navigate]);

  // Effect for Game Phase Transitions (Chooser Selection)
  useEffect(() => {
    if (gamePhase === 'chooser_selection_start' && players.length > 0) {
      startChooserSelectionRoulette();
    }
  }, [gamePhase, players]);


  const startChooserSelectionRoulette = useCallback(() => {
    if (!isMountedRef.current || players.length === 0) return;
    setGamePhase('chooser_selection_roulette');
    setCurrentChooser(null);
    setCurrentQuestion('');
    setPlayerRouletteText(players.length > 0 ? players[0].name : '...'); // Initial display
    
    spinPlayerRoulette(
      PLAYER_ROULETTE_DURATION,
      (selectedChooser) => {
        if (!isMountedRef.current) return;
        setCurrentChooser(selectedChooser);
        toast.success(`${selectedChooser.name} will answer a question!`);
        setGamePhase('question_selection_pending');
      },
      players // Pass current players list to spin
    );
  }, [players, spinPlayerRoulette, setPlayerRouletteText]);

  const handleRevealQuestionClick = useCallback(() => {
    if (!isMountedRef.current || filteredQuestions.length === 0) {
      toast.error("No questions available to reveal.");
      setGamePhase('game_ended');
      return;
    }

    setGamePhase('question_selection_roulette');
    setQuestionRouletteDisplayText(filteredQuestions[0] || '...'); // Initial display

    let currentIndex = 0;
    questionRouletteIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      currentIndex = (currentIndex + 1) % filteredQuestions.length;
      setQuestionRouletteDisplayText(filteredQuestions[currentIndex]);
    }, QUESTION_ROULETTE_INTERVAL);

    questionRouletteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      clearInterval(questionRouletteIntervalRef.current);
      const q = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
      setCurrentQuestion(q);
      setQuestionRouletteDisplayText(q); // Show the final question
      setGamePhase('question_revealed');
    }, QUESTION_ROULETTE_DURATION);
  }, [filteredQuestions]);

  const handleNextRound = useCallback(() => {
    if (!isMountedRef.current) return;
    setCurrentChooser(null);
    setCurrentQuestion('');
    setQuestionRouletteDisplayText('');
    setGamePhase('chooser_selection_start');
  }, []);

  const handleFinishGame = useCallback(() => {
    if (!isMountedRef.current) return;
    setGamePhase('game_ended');
    toast.info("Game finished!");
  }, []);

  const renderGameContent = () => {
    if (gamePhase === 'loading') {
      return <p className="text-center text-xl">Loading game...</p>;
    }
    
    if (gamePhase === 'chooser_selection_roulette') {
      return (
        <PlayerRouletteDisplay
          title="Selecting Who Answers..."
          displayText={playerRouletteText}
          isSpinning={isPlayerRouletteSpinning}
        />
      );
    }

    if (gamePhase === 'question_selection_pending' && currentChooser) {
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <p className="text-2xl text-gray-200 mb-4">
            It's <span className="font-bold text-yellow-400">{currentChooser.name}</span>'s turn!
          </p>
          <button
            onClick={handleRevealQuestionClick}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-lg transition duration-200"
          >
            Reveal Question for {currentChooser.name}
          </button>
        </div>
      );
    }

    if (gamePhase === 'question_selection_roulette') {
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <p className="text-2xl text-gray-200 mb-2">Selecting Question...</p>
          <p className="text-3xl font-bold text-blue-400 h-20 flex items-center justify-center animate-pulse">
            {questionRouletteDisplayText}
          </p>
        </div>
      );
    }

    if (gamePhase === 'question_revealed' && currentChooser && currentQuestion) {
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <p className="text-xl text-gray-300 mb-2">
            For: <span className="font-semibold text-yellow-400">{currentChooser.name}</span>
          </p>
          <p className="text-2xl md:text-3xl text-white my-6 p-4 border border-gray-600 rounded-md bg-gray-800">
            {currentQuestion}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <button
              onClick={handleNextRound}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg text-lg transition duration-200"
            >
              Next Round
            </button>
            <button
              onClick={handleFinishGame}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
            >
              Finish Game
            </button>
          </div>
        </div>
      );
    }

    if (gamePhase === 'game_ended') {
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
          {filteredQuestions.length === 0 && gameConfig && <p className="text-red-400 mb-4">No questions were available for the selected category: {gameConfig.selectedCategory}.</p>}
          <p className="text-gray-200 mb-6">Thanks for playing Get to Know!</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/get-to-know/setup')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-lg transition duration-200"
            >
              Play Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return null; // Default case or unrecognized phase
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {gameConfig && (
        <div className="mb-6 p-3 bg-gray-800 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold text-primary-light">Get to Know</h1>
          <p className="text-gray-300">Category: <span className="font-semibold">{gameConfig.selectedCategory}</span></p>
        </div>
      )}
      {renderGameContent()}
    </div>
  );
}

export default GetToKnowGame;