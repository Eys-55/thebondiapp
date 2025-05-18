import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import questionsData from '../data/questions.json'; // Direct import for simplicity

function GetToKnowGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const [gameConfig, setGameConfig] = useState(location.state?.gameConfig || null);
  const [players, setPlayers] = useState([]);
  const [allQuestionsData] = useState(questionsData);
  const [currentQuestion, setCurrentQuestion] = useState('');
  
  const [gameQuestions, setGameQuestions] = useState([]); // Array of { id: string, text: string, revealed: false }
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [shuffledPlayersForRound, setShuffledPlayersForRound] = useState([]);
  const [turnsTakenInRandomRound, setTurnsTakenInRandomRound] = useState(0);

  const [gamePhase, setGamePhase] = useState('loading'); // 'loading', 'player_turn', 'question_display', 'game_ended'

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
    
    const configPlayers = gameConfig.players || [];
    setPlayers(configPlayers);
    const categoryKey = gameConfig.selectedCategory;
    const questionsForCategory = allQuestionsData[categoryKey] ? allQuestionsData[categoryKey].map(q => q.text) : [];

    if (questionsForCategory.length === 0) {
      toast.error(`No questions found for category: ${categoryKey}. Ending game.`);
      setGamePhase('game_ended');
      return;
    }

    // Shuffle all available questions for the category
    const shuffledCategoryQuestions = [...questionsForCategory].sort(() => Math.random() - 0.5);

    // Take the number of questions specified in setup
    const numQs = Math.min(gameConfig.numberOfQuestions || 5, shuffledCategoryQuestions.length);
    if (numQs < (gameConfig.numberOfQuestions || 5) && shuffledCategoryQuestions.length > 0) { // only warn if there were *some* questions but not enough
        toast.warn(`Only ${numQs} questions available for category ${categoryKey}, less than ${gameConfig.numberOfQuestions} requested.`);
    }
    
    const selectedGameQuestions = shuffledCategoryQuestions
      .slice(0, numQs)
      .map((text, index) => ({ id: `q-${index}`, text, revealed: false }));
    
    setGameQuestions(selectedGameQuestions);

    if (selectedGameQuestions.length === 0) {
       toast.error(`Not enough questions to start the game for category: ${categoryKey}. Please select more or try a different category.`);
       setGamePhase('game_ended');
       return;
    }

    // Setup player order
    setCurrentPlayerIndex(0);
    setTurnsTakenInRandomRound(0);
    if (gameConfig.playerSelectionOrder === 'random' && configPlayers.length > 0) {
      setShuffledPlayersForRound([...configPlayers].sort(() => Math.random() - 0.5));
    } else {
      // For sequential, or if random but only 1 player (though setup should prevent this), or if players array is empty
      setShuffledPlayersForRound([...configPlayers]);
    }

    setGamePhase('player_turn');

  }, [gameConfig, allQuestionsData, navigate]);


  const getCurrentPlayer = useCallback(() => {
    const playerList = gameConfig?.playerSelectionOrder === 'random' ? shuffledPlayersForRound : players;
    if (!playerList || playerList.length === 0 || currentPlayerIndex < 0 || currentPlayerIndex >= playerList.length) return null;
    return playerList[currentPlayerIndex];
  }, [players, currentPlayerIndex, gameConfig, shuffledPlayersForRound]);


  const handleCardClick = useCallback((questionId) => {
    if (!isMountedRef.current || gamePhase !== 'player_turn') return;

    const question = gameQuestions.find(q => q.id === questionId);
    if (question && !question.revealed) {
      setCurrentQuestion(question.text);
      setGameQuestions(prevQs =>
        prevQs.map(q => (q.id === questionId ? { ...q, revealed: true } : q))
      );
      setGamePhase('question_display');
    } else if (question && question.revealed) {
      toast.info("This question has already been chosen.");
    }
  }, [gameQuestions, gamePhase]);

  const handleNextOrEndTurn = useCallback(() => {
    if (!isMountedRef.current) return;
    setCurrentQuestion('');

    const allQuestionsRevealed = gameQuestions.length > 0 && gameQuestions.every(q => q.revealed);
    if (allQuestionsRevealed) {
      setGamePhase('game_ended');
      toast.success("All questions have been answered!");
      return;
    }

    let nextPlayerIndex = currentPlayerIndex;
    let currentTurnsTaken = turnsTakenInRandomRound; // Use a local var for modification
    let currentShuffledPlayers = [...shuffledPlayersForRound];


    if (players.length > 0) {
       if (gameConfig.playerSelectionOrder === 'random') {
           currentTurnsTaken++;
           if (currentTurnsTaken >= players.length) { // All players in current random shuffle had a turn
               currentShuffledPlayers = [...players].sort(() => Math.random() - 0.5);
               setShuffledPlayersForRound(currentShuffledPlayers);
               nextPlayerIndex = 0; // Start from the first player of the new shuffle
               currentTurnsTaken = 0; // Reset turns for the new shuffle
               toast.info("Next round! Player order re-shuffled.");
           } else {
               // Simple advance, relies on shuffledPlayersForRound already being set
               nextPlayerIndex = (players.indexOf(shuffledPlayersForRound[currentPlayerIndex]) + 1) % players.length;
               // Find the actual index in the *original* players array for the current player in the shuffled list,
               // then find the next player in the shuffled list. This needs careful thought if players can be duplicated or if shuffle is complex.
               // A simpler way if shuffledPlayersForRound is the source of truth for the round:
               nextPlayerIndex = (currentPlayerIndex + 1) % currentShuffledPlayers.length;

           }
       } else { // Sequential
           nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
           if (nextPlayerIndex === 0) { // A full sequential round completed
                toast.info("Next round!");
           }
       }
    }
    
    setCurrentPlayerIndex(nextPlayerIndex);
    setTurnsTakenInRandomRound(currentTurnsTaken);
    setGamePhase('player_turn');

  }, [gameQuestions, currentPlayerIndex, players, gameConfig, turnsTakenInRandomRound, shuffledPlayersForRound]);


  const handleFinishGame = useCallback(() => {
    if (!isMountedRef.current) return;
    setGamePhase('game_ended');
    toast.info("Game finished!");
  }, []);

  const renderGameContent = () => {
    if (gamePhase === 'loading') {
      return <p className="text-center text-xl">Loading game...</p>;
    }
    
    if (gamePhase === 'player_turn') {
      const player = getCurrentPlayer();
      if (!player) return <p className="text-center text-xl">Setting up player turn...</p>;
    
      const gridCols = gameQuestions.length <= 2 ? gameQuestions.length : (gameQuestions.length === 4 ? 2 : 3);
      const smGridCols = gameQuestions.length <= 3 ? gameQuestions.length : (gameQuestions.length <= 6 ? 3 : (gameQuestions.length <=8 ? 4 : 5));


      return (
        <div className="text-center p-4 md:p-6 bg-gray-700 rounded-lg shadow-xl">
          <p className="text-2xl text-gray-200 mb-2">
            <span className="font-bold text-yellow-400">{player.name}</span>, it's your turn!
          </p>
          <p className="text-lg text-gray-300 mb-6">Pick a question card:</p>
          <div className={`grid gap-3 sm:gap-4 grid-cols-${gridCols} sm:grid-cols-${smGridCols} max-w-xl mx-auto`}>
            {gameQuestions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => handleCardClick(q.id)}
                disabled={q.revealed}
                className={`p-4 aspect-[3/2] sm:aspect-square flex items-center justify-center rounded-lg text-white font-semibold text-lg sm:text-xl transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-opacity-75
                            ${q.revealed
                              ? 'bg-gray-500 text-gray-400 cursor-not-allowed opacity-60'
                              : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105 focus:ring-indigo-400'}`}
              >
                {q.revealed ? 'Answered' : `Card ${index + 1}`}
              </button>
            ))}
          </div>
          {gameQuestions.length === 0 && <p className="text-gray-400 mt-4">No questions loaded.</p>}
          {(gameQuestions.length > 0 && gameQuestions.every(q => q.revealed)) && (
               <p className="mt-6 text-green-400 font-semibold">All questions answered! You can finish the game.</p>
          )}
          <button
            onClick={handleFinishGame}
            className="mt-8 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
          >
            End Game
          </button>
        </div>
      );
    }

    if (gamePhase === 'question_display' && currentQuestion) {
      const player = getCurrentPlayer();
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <p className="text-xl text-gray-300 mb-3">
            For <span className="font-semibold text-yellow-400">{player?.name || 'Player'}</span>:
          </p>
          <div className="text-2xl md:text-3xl text-white my-6 p-6 border-2 border-gray-600 rounded-lg bg-gray-800 min-h-[120px] flex items-center justify-center shadow-inner">
            {currentQuestion}
          </div>
          <button
            onClick={handleNextOrEndTurn}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg text-lg transition duration-200"
          >
            {gameQuestions.every(q => q.revealed) ? 'Show Results' : 'Done - Next Player'}
          </button>
        </div>
      );
    }

    if (gamePhase === 'game_ended') {
      return (
        <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
          {gameQuestions.length === 0 && gameConfig && <p className="text-red-400 mb-4">No questions were available to play for the selected category: {gameConfig.selectedCategory}.</p>}
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
          <p className="text-gray-300">Category: <span className="font-semibold">{gameConfig.selectedCategory}</span> | Questions: {gameConfig.numberOfQuestions} | Order: {gameConfig.playerSelectionOrder}</p>
        </div>
      )}
      {renderGameContent()}
    </div>
  );
}

export default GetToKnowGame;