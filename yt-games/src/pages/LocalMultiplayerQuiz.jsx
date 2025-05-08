import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { concepts } from '../data/concepts';
import { generateQuestions as generateQuestionsForGame } from '../services/questionGenerator';
import Spinner from '../components/Spinner';

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

function LocalMultiplayerQuiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameConfig: initialGameConfig, players: initialPlayersSetup } = location.state || {};

  const [gameConfig, setGameConfig] = useState(initialGameConfig);
  const [players, setPlayers] = useState(initialPlayersSetup || []);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gamePhase, setGamePhase] = useState('loading'); // 'loading', 'answering', 'answer_revealed', 'finished'
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [error, setError] = useState('');
  const [playerScoredThisRound, setPlayerScoredThisRound] = useState(null); // Track who scored for feedback

  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const currentQuestion = useMemo(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      return questions[currentQuestionIndex];
    }
    return null;
  }, [questions, currentQuestionIndex]);

  // Initialize game
  useEffect(() => {
    isMountedRef.current = true;
    if (!initialGameConfig || !initialPlayersSetup || initialPlayersSetup.length === 0) {
      setError("Game configuration or player data not found. Returning to selection.");
      toast.error("Game setup data missing.");
      setGamePhase('finished');
      setTimeout(() => navigate('/'), 3000);
      return;
    }
    setGameConfig(initialGameConfig);
    setPlayers(initialPlayersSetup.map(p => ({...p, score: p.score || 0})));

    try {
      const generatedQuestions = generateQuestionsForGame(initialGameConfig, concepts);
      if (generatedQuestions.length === 0) {
        setError("No questions could be generated. Please try different options.");
        toast.error("No questions generated.");
        setGamePhase('finished');
        setTimeout(() => navigate('/'), 3000);
        return;
      }
      setQuestions(generatedQuestions);
      setTimeLeft(initialGameConfig.timePerQuestion);
      setGamePhase('answering');
    } catch (e) {
      console.error("Error generating questions:", e);
      setError(`Error setting up game: ${e.message}`);
      toast.error(`Error setting up game: ${e.message}`);
      setGamePhase('finished');
      setTimeout(() => navigate('/'), 3000);
    }
    
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [initialGameConfig, initialPlayersSetup, navigate]);

  // Question Timer Logic
  useEffect(() => {
    clearInterval(timerRef.current); // Clear any existing timer
    if (gamePhase !== 'answering' || !currentQuestion) {
      return;
    }

    setTimeLeft(gameConfig.timePerQuestion); // Reset timer for the new question

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          if (isMountedRef.current && gamePhase === 'answering') {
            toast.info("Time's up!");
            handleShowAnswer(true); // Automatically show answer when time is up, mark as timeout
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gamePhase, currentQuestionIndex, gameConfig?.timePerQuestion]); // Rerun when phase or index changes

  // --- Actions ---

  // Function to show answer, optionally triggered by timeout
  const handleShowAnswer = (isTimeout = false) => {
    if (gamePhase !== 'answering') return;
    clearInterval(timerRef.current); // Stop timer
    setIsAnswerRevealed(true);
    setGamePhase('answer_revealed');
    setTimeLeft(0); // Explicitly set time to 0
    if (!isTimeout) {
        toast.info("Answer revealed. Tap the player who answered correctly!");
    }
  };

  const handleAwardPoint = (awardedPlayerId) => {
    // Allow awarding points if answering OR if answer revealed BUT no one scored yet
    if ((gamePhase !== 'answering' && gamePhase !== 'answer_revealed') || playerScoredThisRound) {
        return;
    }

    // If awarding during answering phase, stop timer and reveal answer first
    if (gamePhase === 'answering') {
        clearInterval(timerRef.current);
        setIsAnswerRevealed(true);
        setGamePhase('answer_revealed');
        setTimeLeft(0);
    }

    setPlayers(prevPlayers =>
      prevPlayers.map(p =>
        p.id === awardedPlayerId ? { ...p, score: p.score + 10 } : p
      )
    );
    setPlayerScoredThisRound(awardedPlayerId); // Mark that someone scored
    toast.success(`${players.find(p => p.id === awardedPlayerId)?.name} gets 10 points!`);
    // Stay in 'answer_revealed' phase until "Next Question" is clicked
  };
  
  const handleNextQuestion = () => {
      // Allow advancing if the answer is revealed OR if skipping during answering phase
      if (gamePhase !== 'answer_revealed' && gamePhase !== 'answering') return;

      if (gamePhase === 'answering') {
          toast.info("Question skipped."); // If skipping before answer revealed
          clearInterval(timerRef.current); // Stop timer if skipping
      }

      if (currentQuestionIndex + 1 < questions.length) {
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setIsAnswerRevealed(false);
          setPlayerScoredThisRound(null); // Reset scorer tracking
          // Timer reset is handled by the useEffect dependency on currentQuestionIndex/gamePhase
          setGamePhase('answering');
      } else {
          setGamePhase('finished'); // Game over
          toast.success("Game Over!");
      }
  };
  
  // --- Render Logic ---

  if (gamePhase === 'loading') return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <Spinner size="lg" /><p className="mt-4 text-xl text-textSecondary">Setting up your local game...</p>
    </div>
  );

  if (error && gamePhase === 'finished') return (
     <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
       <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Setup Error</h2>
       <p className="text-lg mb-6 text-textPrimary">{error}</p>
       <button onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Back to Selection</button>
     </div>
   );

  if (gamePhase === 'finished') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center">
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
        <button onClick={() => navigate('/')} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg"> Play Again? </button>
      </div>
    );
  }

  if (!currentQuestion) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <Spinner size="lg" /><p className="mt-4 text-xl text-textSecondary">Loading question...</p>
    </div>
  );

  const renderQuestionContent = (questionData) => {
    if (!questionData) return <div className="text-xl text-textSecondary italic">Waiting for question...</div>;
    switch (questionData.type) {
      case 'flag_mc': return <div className="text-7xl md:text-8xl mb-4">{questionData.question}</div>;
      case 'language_mc': case 'text_mc': case 'true_false': case 'identification':
        return <div className="text-xl md:text-2xl font-medium mb-4 text-textPrimary"><p>{questionData.question}</p></div>;
      default:
        return <div className="text-xl md:text-2xl font-medium mb-4 text-textPrimary"><p>{questionData.question || 'Error: Invalid question format'}</p></div>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl flex flex-col h-[calc(100vh-100px)]"> {/* Adjust height as needed */}
      {/* Header: Question Number, Timer */}
      <div className="mb-4 px-2 pb-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-primary-light">
              Question {currentQuestionIndex + 1} / {questions.length}
          </h2>
          <div className={`text-lg md:text-xl font-semibold ${gamePhase === 'answering' ? 'text-warning-light' : 'text-gray-500'}`}>
              {gamePhase === 'answering' ? <><TimerIcon className="inline-block mr-1"/> {timeLeft}s</> : (gamePhase === 'answer_revealed' ? 'Answer Revealed' : `Status: ${gamePhase}`)}
          </div>
      </div>

      {/* Question Content */}
      <div key={`question-${currentQuestionIndex}`} className="flex-grow flex justify-center items-center text-center bg-gray-700 p-6 rounded mb-4 shadow overflow-y-auto">
        {renderQuestionContent(currentQuestion)}
      </div>

      {/* Answer Display Area (if revealed) */}
      {isAnswerRevealed && (
        <div className="flex-shrink-0 mb-4 p-3 bg-success-dark border border-success rounded text-center">
            <p className="font-semibold text-success-light">Correct Answer: {currentQuestion.correctAnswer}</p>
            {playerScoredThisRound && <p className="text-sm text-white mt-1">{players.find(p=>p.id === playerScoredThisRound)?.name} scored!</p>}
        </div>
      )}

      {/* Player Boxes / Buttons Area */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-4">
          {players.map(p => (
              <button
                  key={p.id}
                  onClick={() => handleAwardPoint(p.id)}
                  // Enable clicking during 'answering' or 'answer_revealed' IF no one has scored yet
                  disabled={(gamePhase !== 'answering' && gamePhase !== 'answer_revealed') || !!playerScoredThisRound}
                  className={`p-4 rounded-lg text-center transition duration-200 ease-in-out border-2
                              ${(gamePhase === 'answering' || (gamePhase === 'answer_revealed' && !playerScoredThisRound)) ? 'bg-gray-600 hover:bg-success hover:border-success-light border-gray-500 cursor-pointer' : 'bg-gray-700 border-gray-600 opacity-70 cursor-not-allowed'}
                              ${playerScoredThisRound === p.id ? '!bg-success border-success-light ring-2 ring-white' : ''}
                            `}
              >
                  <p className="text-lg font-semibold truncate text-white">{p.name}</p>
                  <p className="text-2xl font-bold text-success-light">{p.score}</p>
              </button>
          ))}
      </div>

      {/* Host Action Buttons */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 mt-auto">
          {gamePhase === 'answering' && (
              <button
                  onClick={() => handleShowAnswer(false)} // Manually show answer
                  className="flex-1 bg-info hover:bg-info-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                  Show Answer
              </button>
          )}
           {/* Next/Skip Button */}
           <button
              onClick={handleNextQuestion}
              // Enable skipping during answering, or advancing after answer revealed
              className={`flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg text-lg ${gamePhase === 'loading' || gamePhase === 'finished' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={gamePhase === 'loading' || gamePhase === 'finished'}
          >
              {/* Change text based on whether answer is revealed */}
              {gamePhase === 'answering' ? 'Skip Question' : 'Next Question'}
          </button>
      </div>
    </div>
  );
}

export default LocalMultiplayerQuiz;