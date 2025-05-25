import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// concepts.json is removed, questions will be loaded dynamically
import { generateQuestions as generateQuestionsForGame } from '../services/questionGenerator';

// Import new UI components
import TriviaHeader from '../components/TriviaHeader';
import TriviaQuestionArea from '../components/TriviaQuestionArea';
import TriviaOptions from '../components/TriviaOptions';
import TriviaAnswerReveal from '../components/TriviaAnswerReveal';
import TriviaPlayerGrid from '../components/TriviaPlayerGrid';
import TriviaActionButtons from '../components/TriviaActionButtons';
import TriviaLoading from '../components/TriviaLoading';
import TriviaErrorState from '../components/TriviaErrorState';
import TriviaGameOver from '../components/TriviaGameOver';

function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig: initialGameConfig, players: initialPlayersSetup } = location.state || {};

  const [gameConfig, setGameConfig] = useState(initialGameConfig);
  const [players, setPlayers] = useState(initialPlayersSetup || []);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gamePhase, setGamePhase] = useState('loading'); // 'loading', 'answering', 'answer_revealed', 'finished'
  
  const [pendingAwardedPlayerIds, setPendingAwardedPlayerIds] = useState([]);
  const [awardedPlayerIdsThisRound, setAwardedPlayerIdsThisRound] = useState([]);

  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const currentQuestion = useMemo(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      return questions[currentQuestionIndex];
    }
    return null;
  }, [questions, currentQuestionIndex]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!initialGameConfig || !initialPlayersSetup || initialPlayersSetup.length === 0) {
      toast.error("Game configuration or player data missing. Returning to selection.");
      setGamePhase('finished'); // This will trigger the error state render
      return;
    }
    // Ensure scoringRule and questionFormat have defaults if not provided by initialGameConfig
    const fullGameConfig = {
      scoringRule: 'fastest_finger',
      questionFormat: 'show_mc', // Default questionFormat
      ...initialGameConfig
    };
    setGameConfig(fullGameConfig);
    setPlayers(initialPlayersSetup.map(p => ({...p, score: p.score || 0})));

    const loadQuestionsAndSetupGame = async () => {
      try {
        if (!fullGameConfig.selectedCategories || fullGameConfig.selectedCategories.length === 0) {
          toast.error("No categories selected. Please go back to setup.");
          setGamePhase('finished');
          return;
        }

        const questionPromises = fullGameConfig.selectedCategories.map(categoryID =>
          import(`../data/${categoryID}_questions.json`)
            .then(module => module.default)
            .catch(err => {
              console.error(`Failed to load questions for category: ${categoryID}`, err);
              toast.error(`Could not load questions for ${categoryID}.`);
              return []; // Return empty array for this category if loading fails
            })
        );
        
        const questionsPerCategoryArray = await Promise.all(questionPromises);
        const allQuestionsFromSelectedCategories = [].concat(...questionsPerCategoryArray);

        if (allQuestionsFromSelectedCategories.length === 0) {
          toast.error("No questions found for the selected categories. Please try different options or check category files.");
          setGamePhase('finished');
          return;
        }
        
        const generatedQuestions = generateQuestionsForGame(fullGameConfig, allQuestionsFromSelectedCategories);
        if (generatedQuestions.length === 0) {
          toast.error("No questions could be generated from the selected pool. Please try different options.");
          setGamePhase('finished'); // This will trigger the error state render
          return;
        }

        if (isMountedRef.current) {
          setQuestions(generatedQuestions);
          setTimeLeft(fullGameConfig.timePerQuestion);
          setGamePhase('answering');
        }
      } catch (e) {
        console.error("Error setting up game or loading questions:", e);
        toast.error(`Error setting up game: ${e.message}`);
        if (isMountedRef.current) {
          setGamePhase('finished'); // This will trigger the error state render
        }
      }
    };

    loadQuestionsAndSetupGame();
    
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [initialGameConfig, initialPlayersSetup]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (gamePhase !== 'answering' || !currentQuestion || !gameConfig) return;

    setTimeLeft(gameConfig.timePerQuestion);
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          if (isMountedRef.current && gamePhase === 'answering') {
            toast.info("Time's up!");
            setGamePhase('answer_revealed');
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gamePhase, currentQuestionIndex, gameConfig, currentQuestion]);

  const handlePlayerSelectionToggle = (selectedPlayerId) => {
    if (gamePhase !== 'answering' && gamePhase !== 'answer_revealed') return;
    if (awardedPlayerIdsThisRound.includes(selectedPlayerId)) {
        toast.info("Points already confirmed for this player.");
        return;
    }

    setPendingAwardedPlayerIds(prevPending => {
        if (gameConfig.scoringRule === 'fastest_finger') {
            if (prevPending.includes(selectedPlayerId)) return [];
            return [selectedPlayerId];
        } else { // 'any_correct' mode
            if (prevPending.includes(selectedPlayerId)) {
                return prevPending.filter(id => id !== selectedPlayerId);
            }
            return [...prevPending, selectedPlayerId];
        }
    });
  };

  const handleConfirmAwards = () => {
    if ((gamePhase !== 'answering' && gamePhase !== 'answer_revealed') || pendingAwardedPlayerIds.length === 0) {
        toast.warn("No players selected to confirm awards or invalid game phase.");
        return;
    }

    if (gamePhase === 'answering') {
        clearInterval(timerRef.current);
        setGamePhase('answer_revealed');
        setTimeLeft(0);
    }

    let newPointsAwardedCount = 0;
    const playerNamesAwarded = [];

    const updatedPlayers = players.map(player => {
        if (pendingAwardedPlayerIds.includes(player.id) && !awardedPlayerIdsThisRound.includes(player.id)) {
            newPointsAwardedCount++;
            playerNamesAwarded.push(player.name);
            return { ...player, score: player.score + 10 };
        }
        return player;
    });

    if (newPointsAwardedCount > 0) {
        setPlayers(updatedPlayers);
        setAwardedPlayerIdsThisRound(prevConfirmed => [...new Set([...prevConfirmed, ...pendingAwardedPlayerIds])]);
        toast.success(`${playerNamesAwarded.join(', ')} awarded 10 points!`);
    } else {
        toast.info("Selected players already had points confirmed or no new selections.");
    }
    setPendingAwardedPlayerIds([]);
  };
  
  const handleShowAnswer = () => {
    if (gamePhase !== 'answering') return;
    clearInterval(timerRef.current);
    setGamePhase('answer_revealed');
    setTimeLeft(0);
    toast.info("Answer revealed. Select correct player(s) and confirm awards.");
  };

  const handleNextQuestion = () => {
    if (gamePhase !== 'answering' && gamePhase !== 'answer_revealed') return;

    if (pendingAwardedPlayerIds.length > 0) {
        toast.warn("Unconfirmed selections discarded.");
    }
    if (gamePhase === 'answering' && timeLeft > 0 && awardedPlayerIdsThisRound.length === 0) {
        toast.info("Question skipped.");
    }

    clearInterval(timerRef.current);
    setPendingAwardedPlayerIds([]);
    setAwardedPlayerIdsThisRound([]);

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setGamePhase('answering');
    } else {
      setGamePhase('finished');
      toast.success("🎉 Game Over! All players, check your scores! 🎉");
    }
  };
  
  const renderQuestionText = (q) => {
    if (!q) return "Loading question...";
    if (q.type === 'flag_mc' || (q.type === 'identification' && q.category === 'flags')) {
        return `Which country's flag is this: ${q.question}`;
    }
    if (q.type === 'language_mc' || (q.type === 'identification' && q.category === 'languages')) {
        return `"${q.question}" means "Hello World" in which language?`;
    }
    return q.question;
  };

  if (gamePhase === 'loading') return <TriviaLoading />;
  
  // Error state if game finished due to setup issues (e.g., no questions loaded)
  if (gamePhase === 'finished' && questions.length === 0) {
     // This covers missing initialConfig, players, or failure to load/generate any questions
     return <TriviaErrorState onGoToSetup={() => navigate('/trivia-nights/setup')} />;
  }
  
  // Game over after playing through questions
  if (gamePhase === 'finished' && questions.length > 0) {
    return <TriviaGameOver players={players} onPlayAgain={() => navigate('/trivia-nights/setup')} />;
  }

  // Still loading questions or critical data missing before 'finished' state with no questions
  if (!currentQuestion || !gameConfig) {
    // If it's not 'finished' yet, but these are null, show loading.
    // If it *is* finished and these are null, the above error state should catch it.
    return <TriviaLoading message="Loading question or game configuration..." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl flex flex-col min-h-[calc(100vh-120px)]">
      <TriviaHeader
        timeLeft={timeLeft}
        gamePhase={gamePhase}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
      />
      
      <TriviaQuestionArea questionText={renderQuestionText(currentQuestion)} />

      {gameConfig.questionFormat === 'show_mc' && (
        <TriviaOptions
          options={currentQuestion.options}
          correctAnswer={currentQuestion.correctAnswer}
          gamePhase={gamePhase}
        />
      )}

      {gamePhase === 'answer_revealed' && (
        <TriviaAnswerReveal
          correctAnswer={currentQuestion.correctAnswer}
          awardedPlayers={awardedPlayerIdsThisRound}
          allPlayers={players}
        />
      )}
      
      <TriviaPlayerGrid
        players={players}
        awardedPlayerIdsThisRound={awardedPlayerIdsThisRound}
        pendingAwardedPlayerIds={pendingAwardedPlayerIds}
        onPlayerSelect={handlePlayerSelectionToggle}
        gamePhase={gamePhase}
      />

      <TriviaActionButtons
        gamePhase={gamePhase}
        pendingAwardedPlayerIdsCount={pendingAwardedPlayerIds.length}
        awardedPlayerIdsThisRoundCount={awardedPlayerIdsThisRound.length}
        onShowAnswer={handleShowAnswer}
        onConfirmAwards={handleConfirmAwards}
        onNextQuestion={handleNextQuestion}
      />
    </div>
  );
}

export default QuizPage;