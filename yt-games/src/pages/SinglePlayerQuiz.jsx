import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { concepts } from '../data/concepts';
import { generateQuestions as generateQuestionsForGame } from '../services/firebaseService'; // Corrected import
import Spinner from '../components/Spinner';
// SVG Icons (Copied from QuizGame.jsx for consistency)
// SVG Icons (Copied from QuizGame.jsx for consistency)
const CheckIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);
const CrossIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);
const TimerIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z" clipRule="evenodd" />
    </svg>
);
const SkullIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm-.293 6.293a1 1 0 011.414 0L10 12.586l1.879-1.88a1 1 0 111.414 1.414L11.414 14l1.879 1.879a1 1 0 01-1.414 1.414L10 15.414l-1.879 1.879a1 1 0 01-1.414-1.414L8.586 14l-1.879-1.879a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


function SinglePlayerQuiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameConfig = location.state?.gameConfig;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(gameConfig?.numLives || 3);
  const [timeLeft, setTimeLeft] = useState(gameConfig?.timePerQuestion || 10);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null); // 'correct', 'incorrect'
  const [gameStatus, setGameStatus] = useState('loading'); // 'loading', 'playing', 'showing_results', 'finished'
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const inputRef = useRef(null); // Ref for the identification input

  const currentQuestion = useMemo(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      return questions[currentQuestionIndex];
    }
    return null;
  }, [questions, currentQuestionIndex]);

  const isEliminated = useMemo(() => lives <= 0, [lives]);

  // Initialize game
  useEffect(() => {
    isMountedRef.current = true;
    if (!gameConfig) {
      setError("Game configuration not found. Returning to selection.");
      toast.error("Game configuration not found.");
      setTimeout(() => navigate('/'), 3000);
      setGameStatus('finished'); // Prevent further processing
      return;
    }

    try {
      const generatedQuestions = generateQuestionsForGame(gameConfig, concepts);
      if (generatedQuestions.length === 0) {
        setError("No questions could be generated for the selected criteria. Please try different options.");
        toast.error("No questions generated. Try different categories/types.");
        setGameStatus('finished');
        setTimeout(() => navigate('/'), 3000);
        return;
      }
      setQuestions(generatedQuestions);
      setLives(gameConfig.numLives);
      setTimeLeft(gameConfig.timePerQuestion);
      setGameStatus('playing');
    } catch (e) {
      console.error("Error generating questions:", e);
      setError(`Error setting up game: ${e.message}`);
      toast.error(`Error setting up game: ${e.message}`);
      setGameStatus('finished');
      setTimeout(() => navigate('/'), 3000);
    }
    
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
      clearTimeout(cooldownTimerRef.current);
    };
  }, [gameConfig, navigate]);

  // Question Timer Logic
  useEffect(() => {
    clearInterval(timerRef.current);
    if (gameStatus !== 'playing' || !currentQuestion || isEliminated) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(gameConfig.timePerQuestion); // Reset timer for new question

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          if (isMountedRef.current && !hasSubmitted) {
            // Auto-submit as timeout (incorrect)
            setHasSubmitted(true);
            setSubmissionResult('timeout'); // Special state for timeout
            setLives(prevLives => Math.max(0, prevLives - 1));
            setGameStatus('showing_results');
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStatus, currentQuestion, hasSubmitted, gameConfig?.timePerQuestion, isEliminated]);

  // Cooldown Timer Logic (after showing results)
  useEffect(() => {
    if (gameStatus === 'showing_results') {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        if (currentQuestionIndex + 1 < questions.length && lives > 0) {
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setSelectedOption(null);
          setTypedAnswer('');
          setHasSubmitted(false);
          setSubmissionResult(null);
          setGameStatus('playing');
          setTimeout(() => {
            if (inputRef.current && questions[currentQuestionIndex + 1]?.type === 'identification') {
                inputRef.current.focus();
            }
          }, 100);
        } else {
          setGameStatus('finished'); // Game over
        }
      }, (gameConfig?.cooldownSeconds || 3) * 1000);
    }
    return () => clearTimeout(cooldownTimerRef.current);
  }, [gameStatus, currentQuestionIndex, questions, lives, gameConfig?.cooldownSeconds]);


  const handleOptionSelect = (option) => {
    if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && currentQuestion?.type !== 'identification') {
        setSelectedOption(option);
        setTypedAnswer('');
    }
  };

  const handleInputChange = (event) => {
   if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && currentQuestion?.type === 'identification') {
       setTypedAnswer(event.target.value);
       setSelectedOption(null);
   }
  };

  const handleAnswerSubmit = () => {
    const isIdentification = currentQuestion?.type === 'identification';
    const answerToSubmit = isIdentification ? typedAnswer.trim() : selectedOption;

    if (!answerToSubmit || hasSubmitted || isEliminated || gameStatus !== 'playing' || timeLeft <= 0) {
      let blockReason = "Cannot submit.";
      if (isEliminated) blockReason = "You are eliminated.";
      else if (hasSubmitted) blockReason = "Already submitted.";
      else if (timeLeft <= 0) blockReason = "Time is up.";
      else if (!answerToSubmit) blockReason = isIdentification ? "Please type an answer." : "Please select an option.";
      toast.warn(blockReason);
      return;
    }

    clearInterval(timerRef.current); // Stop timer on submit
    setHasSubmitted(true);

    let isCorrect = false;
    const correctAnswer = currentQuestion?.correctAnswer;

    if (isIdentification) {
      isCorrect = answerToSubmit.toLowerCase() === correctAnswer?.toLowerCase();
    } else {
      isCorrect = answerToSubmit === correctAnswer;
    }

    if (isCorrect) {
      setSubmissionResult('correct');
      setScore(prevScore => prevScore + 10); // Simple scoring
      toast.success("Correct!");
    } else {
      setSubmissionResult('incorrect');
      setLives(prevLives => Math.max(0, prevLives - 1));
      toast.error("Incorrect!");
    }
    setGameStatus('showing_results');
  };

  // Render Logic
  if (gameStatus === 'loading') return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <Spinner size="lg" /><p className="mt-4 text-xl text-textSecondary">Setting up your game...</p>
    </div>
  );

  if (error && gameStatus === 'finished') return ( // Show error if setup failed
     <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
       <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Setup Error</h2>
       <p className="text-lg mb-6 text-textPrimary">{error}</p>
       <button onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Back to Selection</button>
     </div>
   );

  if (gameStatus === 'finished') {
    return (
      <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-warning-light">🏁 Game Over! 🏁</h2>
        <p className="text-2xl font-semibold mb-2 text-success-light">Your Final Score: {score}</p>
        <p className="text-xl mb-6 text-textPrimary">Lives Remaining: {lives > 0 ? lives : <SkullIcon className="h-6 w-6 text-danger-light" />}</p>
        {lives <= 0 && <p className="text-xl text-danger-light mb-4">You ran out of lives!</p>}
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
      case 'flag_mc': return <div className="text-7xl md:text-8xl mb-8">{questionData.question}</div>;
      case 'language_mc': case 'text_mc': case 'true_false': case 'identification':
        return <div className="text-xl md:text-2xl font-medium mb-8 text-textPrimary"><p>{questionData.question}</p></div>;
      default:
        return <div className="text-xl md:text-2xl font-medium mb-8 text-textPrimary"><p>{questionData.question || 'Error: Invalid question format'}</p></div>;
    }
  };
  
  const isIdentificationQuestion = currentQuestion?.type === 'identification';

  return (
    <div className="max-w-2xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl">
      {/* Header: Question Number, Score, Lives, Timer */}
      <div className="flex flex-wrap justify-between items-center mb-6 px-2 pb-4 border-b border-gray-700">
          <h2 className="text-xl md:text-2xl font-bold text-primary-light">
              Question {currentQuestionIndex + 1} / {questions.length}
          </h2>
          <div className="flex gap-4 items-center">
              <span className="text-lg font-semibold text-success-light">Score: {score}</span>
              <span className={`text-lg font-semibold ${lives > 1 ? 'text-warning-light' : 'text-danger-light'}`}>
                  Lives: {'❤️'.repeat(lives) || <SkullIcon className="h-5 w-5 inline-block"/>}
              </span>
          </div>
          <div className={`text-lg md:text-xl font-semibold ${gameStatus === 'playing' && !isEliminated ? 'text-warning-light' : 'text-gray-500'}`}>
              {gameStatus === 'playing' && !isEliminated ? `Time: ${timeLeft}s` : (gameStatus === 'showing_results' ? `Next in...` : `Status: ${gameStatus}`)}
          </div>
      </div>

      {/* Question Content */}
      <div key={`question-${currentQuestionIndex}`} className="min-h-[80px] flex justify-center items-center text-center bg-gray-700 p-6 rounded mb-6 shadow">
        {renderQuestionContent(currentQuestion)}
      </div>

      {/* Options Area OR Identification Input */}
      {isIdentificationQuestion ? (
          <div className="mb-6">
              <input
                  ref={inputRef}
                  type="text"
                  value={typedAnswer}
                  onChange={handleInputChange}
                  placeholder="Type your answer here..."
                  disabled={hasSubmitted || timeLeft <= 0 || isEliminated || gameStatus !== 'playing'}
                  className={`w-full px-4 py-3 bg-gray-600 border rounded-md text-lg text-textPrimary focus:outline-none focus:ring-2 focus:border-transparent transition duration-200 ease-in-out ${
                      gameStatus === 'showing_results' && submissionResult === 'correct' ? 'border-success ring-success-light bg-success-dark text-white' :
                      gameStatus === 'showing_results' && (submissionResult === 'incorrect' || submissionResult === 'timeout') ? 'border-danger ring-danger-light bg-danger-dark text-white' :
                      'border-gray-500 focus:ring-primary focus:border-primary-light'
                  } ${ (hasSubmitted || timeLeft <= 0 || isEliminated || gameStatus !== 'playing') ? 'opacity-60 cursor-not-allowed' : '' }`}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAnswerSubmit(); }}
              />
              {gameStatus === 'showing_results' && (
                  <p className="mt-2 text-sm text-success-light">Correct Answer: <span className="font-semibold">{currentQuestion.correctAnswer}</span></p>
              )}
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {(currentQuestion?.options || []).map((option) => {
              const isCorrect = option === currentQuestion.correctAnswer;
              const isSelected = option === selectedOption;

              let buttonClasses = "w-full py-3 px-4 rounded-lg text-lg font-medium transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75 flex items-center justify-center gap-2 ";
              let isDisabled = true;
              let icon = null;

              if (gameStatus === 'playing') {
                  isDisabled = hasSubmitted || timeLeft <= 0 || isEliminated;
                  if (isEliminated) buttonClasses += 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed line-through';
                  else if (timeLeft <= 0 && !hasSubmitted) buttonClasses += 'bg-gray-600 text-textSecondary opacity-70 cursor-not-allowed'; // Time up, not submitted
                  else if (isSelected && !hasSubmitted) { isDisabled = false; buttonClasses += 'bg-primary-dark text-white ring-primary-light scale-105 shadow-md focus:ring-primary-light'; }
                  else if (!hasSubmitted) { isDisabled = false; buttonClasses += 'bg-gray-700 hover:bg-gray-600 text-textPrimary hover:shadow-md transform hover:scale-[1.02] focus:ring-primary-light'; }
                  else buttonClasses += 'bg-gray-600 text-textSecondary opacity-60 cursor-not-allowed'; // Submitted, but not this option
              } else if (gameStatus === 'showing_results') {
                  isDisabled = true;
                  if (isCorrect) { buttonClasses += 'bg-success border-2 border-success-light text-white ring-success-light scale-105 shadow-lg font-bold'; icon = <CheckIcon />; }
                  else if (isSelected && (submissionResult === 'incorrect' || submissionResult === 'timeout')) { buttonClasses += 'bg-danger border-2 border-danger-light text-white ring-danger-light opacity-80'; icon = <CrossIcon />; }
                  else buttonClasses += 'bg-gray-600 text-textSecondary opacity-50';
              } else buttonClasses += 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50';

              return ( <button key={`${currentQuestion?.id}-${option}`} onClick={() => handleOptionSelect(option)} className={buttonClasses} disabled={isDisabled}> <span>{option}</span> {icon} </button> );
            })}
          </div>
      )}

       {/* Submit Button */}
       {gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && (
            <div className="mb-6 text-center">
                <button
                    onClick={handleAnswerSubmit}
                    disabled={(!selectedOption && !typedAnswer)}
                    className={`bg-success hover:bg-success-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center min-w-[180px] ${(!selectedOption && !typedAnswer) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Submit Answer
                </button>
            </div>
       )}

       {/* Feedback Area */}
       <div className="min-h-[3em] mb-6 flex flex-col justify-center items-center text-center px-4">
            {isEliminated && gameStatus !== 'finished' && <p className="text-danger font-bold text-xl flex items-center gap-2"><SkullIcon className="h-6 w-6"/> You have been eliminated! <SkullIcon className="h-6 w-6"/></p>}
            {gameStatus === 'playing' && !isEliminated && (
                <>
                    {timeLeft <= 0 && !hasSubmitted && <p className="text-danger-light font-semibold text-lg flex items-center gap-1"><TimerIcon /> Time's up! Moving to results...</p>}
                    {!hasSubmitted && timeLeft > 0 && !isIdentificationQuestion && !selectedOption && <p className="text-textSecondary text-lg">Select your answer above.</p>}
                    {!hasSubmitted && timeLeft > 0 && !isIdentificationQuestion && selectedOption && <p className="text-warning-light text-lg animate-pulse">You selected: "{selectedOption}". Press Submit!</p>}
                    {!hasSubmitted && timeLeft > 0 && isIdentificationQuestion && !typedAnswer && <p className="text-textSecondary text-lg">Type your answer above.</p>}
                    {!hasSubmitted && timeLeft > 0 && isIdentificationQuestion && typedAnswer && <p className="text-warning-light text-lg animate-pulse">Press Submit!</p>}
                </>
            )}
             {gameStatus === 'showing_results' && !isEliminated && (
                <>
                    {submissionResult === 'correct' && <p className="text-success-light font-semibold text-lg flex items-center gap-1"><CheckIcon /> Correct!</p>}
                    {submissionResult === 'incorrect' && <p className="text-danger-light font-semibold text-lg flex items-center gap-1"><CrossIcon /> Incorrect!</p>}
                    {submissionResult === 'timeout' && <p className="text-orange-400 font-semibold text-lg flex items-center gap-1"><TimerIcon /> You didn't answer in time.</p>}
                    {isIdentificationQuestion && submissionResult !== 'correct' && (
                         <p className="text-sm text-gray-400 mt-1">Your answer: "{typedAnswer}"</p>
                    )}
                </>
             )}
       </div>
    </div>
  );
}

export default SinglePlayerQuiz;