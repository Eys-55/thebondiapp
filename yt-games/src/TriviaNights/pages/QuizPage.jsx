import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { concepts } from '../data/concepts';
import { generateQuestions as generateQuestionsForGame } from '../services/questionGenerator';

// SVG Icons
const CheckIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);
const TimerIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z" clipRule="evenodd" />
    </svg>
);

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
  const [playerScoredThisRound, setPlayerScoredThisRound] = useState(null);

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
      setGamePhase('finished');
      setTimeout(() => navigate('/trivia-nights/setup'), 3000);
      return;
    }
    setGameConfig(initialGameConfig);
    setPlayers(initialPlayersSetup.map(p => ({...p, score: p.score || 0})));

    try {
      const generatedQuestions = generateQuestionsForGame(initialGameConfig, concepts);
      if (generatedQuestions.length === 0) {
        toast.error("No questions could be generated. Please try different options.");
        setGamePhase('finished');
        setTimeout(() => navigate('/trivia-nights/setup'), 3000);
        return;
      }
      setQuestions(generatedQuestions);
      setTimeLeft(initialGameConfig.timePerQuestion);
      setGamePhase('answering');
    } catch (e) {
      console.error("Error generating questions:", e);
      toast.error(`Error setting up game: ${e.message}`);
      setGamePhase('finished');
       setTimeout(() => navigate('/trivia-nights/setup'), 3000);
    }
    
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [initialGameConfig, initialPlayersSetup, navigate]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (gamePhase !== 'answering' || !currentQuestion) return;

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

  const handleShowAnswer = (timeoutTriggered = false) => {
    if (gamePhase !== 'answering') return;
    clearInterval(timerRef.current);
    setGamePhase('answer_revealed');
    setTimeLeft(0);
    if (!timeoutTriggered) {
        toast.info("Answer revealed. Award points if anyone was correct!");
    }
  };
  
  const handleAwardPoint = (awardedPlayerId) => {
    if (playerScoredThisRound || (gamePhase !== 'answering' && gamePhase !== 'answer_revealed')) {
      return;
    }

    if (gamePhase === 'answering') {
        clearInterval(timerRef.current);
        setGamePhase('answer_revealed');
        setTimeLeft(0);
    }

    setPlayers(prevPlayers =>
      prevPlayers.map(p =>
        p.id === awardedPlayerId ? { ...p, score: p.score + 10 } : p
      )
    );
    setPlayerScoredThisRound(awardedPlayerId);
    const awardedPlayer = players.find(p => p.id === awardedPlayerId);
    toast.success(`${awardedPlayer?.name || 'Player'} gets 10 points!`);
  };

  const handleNextQuestion = () => {
    if (gamePhase !== 'answer_revealed' && gamePhase !== 'answering') return;

    if (gamePhase === 'answering' && timeLeft > 0) {
        toast.info("Question skipped.");
    }
    clearInterval(timerRef.current);

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setPlayerScoredThisRound(null);
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
  }

  if (gamePhase === 'loading') return <div className="flex items-center justify-center h-64 text-xl text-textSecondary">Setting up your multiplayer game...</div>;

  if ((!initialGameConfig || !initialPlayersSetup || initialPlayersSetup.length === 0) && gamePhase === 'finished') return (
     <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
       <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Error</h2>
       <p className="text-lg mb-6 text-textPrimary">Missing game setup data. Please return to selection.</p>
       <button onClick={() => navigate('/trivia-nights/setup')} className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded">Back to Setup</button>
     </div>
   );
  
  if (gamePhase === 'finished') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-warning-light">🏁 Game Over! 🏁</h2>
        <h3 className="text-2xl font-semibold mb-6 text-success-light">Final Scores:</h3>
        <ul className="space-y-2 mb-8 text-left max-w-sm mx-auto">
            {sortedPlayers.map((p, index) => (
                <li key={p.id} className={`flex justify-between items-center px-4 py-2 rounded border ${ index === 0 ? 'bg-success-dark border-success-light ring-2 ring-success-light shadow-lg' : 'bg-gray-700 border-gray-600' }`}>
                    <span className={`font-medium ${index === 0 ? 'text-white' : 'text-textPrimary'}`}>
                        {index + 1}. {p.name} {index === 0 ? '🏆' : ''}
                    </span>
                    <span className={`${index === 0 ? 'text-white' : 'text-textPrimary'} font-medium`}>
                        Score: {p.score}
                    </span>
                </li>
            ))}
        </ul>
        <button onClick={() => navigate('/trivia-nights/setup')} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg"> Play Again? </button>
      </div>
    );
  }

  if (!currentQuestion) return <div className="flex items-center justify-center h-64 text-xl text-textSecondary">Loading question...</div>;

  return (
    <div className="max-w-4xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl flex flex-col min-h-[calc(100vh-120px)]">
      {/* Header: Question Number, Timer */}
      <div className="mb-4 px-2 pb-3 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-primary-light">
              Q: {currentQuestionIndex + 1} / {questions.length}
          </h2>
          <div className={`text-lg md:text-xl font-semibold ${gamePhase === 'answering' && timeLeft > 0 ? 'text-warning-light' : 'text-gray-500'}`}>
              <TimerIcon className="inline-block mr-1"/> {timeLeft > 0 ? `${timeLeft}s` : (gamePhase === 'answer_revealed' ? 'Revealed' : "Time's Up")}
          </div>
      </div>

      {/* Question Area */}
      <div key={`question-area-${currentQuestionIndex}`} className="flex-grow flex flex-col justify-center items-center text-center bg-gray-700 p-6 rounded mb-4 shadow">
        <p className="text-xl md:text-2xl font-medium text-textPrimary">{renderQuestionText(currentQuestion)}</p>
      </div>

      {/* Options Area (if MC mode, non-interactive) */}
      {gameConfig.includeChoices && currentQuestion.options && currentQuestion.options.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {currentQuestion.options.map((option, index) => (
            <div // Changed from button to div for non-interactivity
              key={index}
              className={`p-3 rounded-lg text-left text-md border-2
                ${ gamePhase === 'answer_revealed' ?
                    (option === currentQuestion.correctAnswer ? 'bg-success-dark border-success text-white' : 'bg-gray-600 border-gray-500 text-gray-300')
                    : 'bg-gray-600 border-gray-500 text-textPrimary'
                }
              `}
            >
              {option}
              {gamePhase === 'answer_revealed' && option === currentQuestion.correctAnswer && <CheckIcon className="h-5 w-5 float-right text-white" />}
            </div>
          ))}
        </div>
      )}

      {/* Revealed Answer Display (Always shown when answer is revealed) */}
      {gamePhase === 'answer_revealed' && (
        <div className={`mb-4 p-3 rounded text-center bg-info-dark border border-info`}>
            <p className="font-semibold text-lg text-white">
                The correct answer is: <span className="font-bold">{currentQuestion.correctAnswer}</span>
            </p>
            {playerScoredThisRound && <p className="text-sm text-success-light mt-1">{players.find(p=>p.id === playerScoredThisRound)?.name} scored this round!</p>}
        </div>
      )}
      
      {/* Player Score Boxes / Award Point Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {players.map(p => (
              <button
                  key={p.id}
                  onClick={() => handleAwardPoint(p.id)}
                  disabled={playerScoredThisRound || (gamePhase !== 'answering' && gamePhase !== 'answer_revealed')}
                  className={`p-3 rounded-lg text-center transition duration-200 ease-in-out border-2
                              ${playerScoredThisRound === p.id ? '!bg-success border-success-light ring-2 ring-white' :
                                (playerScoredThisRound || (gamePhase !== 'answering' && gamePhase !== 'answer_revealed')) ? 'bg-gray-700 border-gray-600 opacity-70 cursor-not-allowed'
                                : 'bg-gray-600 hover:bg-success hover:border-success-light border-gray-500 cursor-pointer'
                              }
                            `}
              >
                  <p className="text-md font-semibold truncate text-white">{p.name}</p>
                  <p className="text-xl font-bold text-success-light">{p.score}</p>
              </button>
          ))}
      </div>

      {/* Host Action Buttons */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 mt-auto">
          {gamePhase === 'answering' && (
              <button
                  onClick={() => handleShowAnswer(false)}
                  className="flex-1 bg-info hover:bg-info-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
                  disabled={playerScoredThisRound}
              >
                  Show Answer
              </button>
          )}
          <button
              onClick={handleNextQuestion}
              className={`flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg text-lg
                          ${(gamePhase === 'loading' || gamePhase === 'finished') ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={gamePhase === 'loading' || gamePhase === 'finished' || (gamePhase === 'answering' && playerScoredThisRound && timeLeft > 0) } // Also disable if someone scored and timer still running (host should click next)
          >
              {gamePhase === 'answering' ? 'Skip / Next Question' : 'Next Question'}
          </button>
      </div>
    </div>
  );
}

export default QuizPage;