import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import questionsData from '../data/questions.json'; // Direct import for simplicity
// Import new components
import GetToKnowHeader from '../components/GetToKnowHeader';
import GetToKnowLoading from '../components/GetToKnowLoading';
import GetToKnowPlayerTurn from '../components/GetToKnowPlayerTurn';
import GetToKnowQuestionDisplay from '../components/GetToKnowQuestionDisplay';
import GetToKnowGameOver from '../components/GetToKnowGameOver';

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
      return <GetToKnowLoading />;
    }
    
    if (gamePhase === 'player_turn') {
      const player = getCurrentPlayer();
      return (
        <GetToKnowPlayerTurn
          player={player}
          gameQuestions={gameQuestions}
          onCardClick={handleCardClick}
          onFinishGame={handleFinishGame}
        />
      );
    }

    if (gamePhase === 'question_display' && currentQuestion) {
      const player = getCurrentPlayer();
      return (
        <GetToKnowQuestionDisplay
          player={player}
          currentQuestion={currentQuestion}
          gameQuestions={gameQuestions}
          onNextOrEndTurn={handleNextOrEndTurn}
        />
      );
    }

    if (gamePhase === 'game_ended') {
      return (
        <GetToKnowGameOver
          gameConfig={gameConfig}
          gameQuestions={gameQuestions}
          onPlayAgain={() => navigate('/get-to-know/setup')}
          onGoHome={() => navigate('/')}
        />
      );
    }
    return null; // Default case or unrecognized phase
  };

  // Calculate progress variables here to be in scope for GameProgressDisplay
  let revealedCount = 0;
  let currentProgTurn = 0;
  let totalProgTurns = 0;

  if (gameQuestions && gameQuestions.length > 0) {
    revealedCount = gameQuestions.filter(q => q.revealed).length;
    if (gamePhase === 'question_display') {
      currentProgTurn = revealedCount;
    } else if (revealedCount === gameQuestions.length) {
      currentProgTurn = revealedCount;
    } else {
      currentProgTurn = revealedCount + 1;
    }
    totalProgTurns = gameQuestions.length;
  }


  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <GetToKnowHeader
        gameConfig={gameConfig}
        gamePhase={gamePhase}
        gameQuestions={gameQuestions}
        currentProgTurn={currentProgTurn}
        totalProgTurns={totalProgTurns}
      />
      {renderGameContent()}
    </div>
  );
}

export default GetToKnowGame;