import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    listenToGame,
    submitAnswer,
    advanceToResultsState,
    moveToNextQuestion
} from '../services/firebaseService';
import Spinner from '../components/Spinner'; // Import Spinner

// Helper to get player ID robustly
const getPlayerId = (gameId) => {
    if (!gameId) return null;
    return localStorage.getItem(`ytg-player-${gameId}`) || localStorage.getItem(`ytg-host-${gameId}`);
}

// SVG Icons (CheckIcon, CrossIcon, ThinkingIcon, TimerIcon, SkullIcon remain the same)
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
const ThinkingIcon = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} inline-block animate-pulse`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
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


function QuizGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [internalError, setInternalError] = useState('');
  const [selectedOption, setSelectedOption] = useState(null); // For MC/TF
  const [typedAnswer, setTypedAnswer] = useState(''); // For Identification
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null); // 'correct', 'incorrect'
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const currentPlayerId = useRef(getPlayerId(gameId));
  const previousStatusRef = useRef(null);
  const currentQuestionIndexRef = useRef(null);
  const isMountedRef = useRef(true);
  const inputRef = useRef(null); // Ref for the identification input

  // --- Derived State ---
  const isHost = useMemo(() => !!gameData && gameData.hostId === currentPlayerId.current, [gameData]);
  const playersMap = useMemo(() => gameData?.players || {}, [gameData?.players]);
  const playersArray = useMemo(() => {
      return Object.values(playersMap).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((b.lives ?? 0) !== (a.lives ?? 0)) return (b.lives ?? 0) - (a.lives ?? 0);
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [playersMap]);
  const currentPlayer = useMemo(() => playersMap[currentPlayerId.current] || null, [playersMap]);
  const currentPlayerLives = useMemo(() => currentPlayer?.lives ?? 0, [currentPlayer]);
  const isEliminated = useMemo(() => currentPlayerLives <= 0, [currentPlayerLives]);

  const currentQuestion = useMemo(() => {
      if (!gameData || gameData.currentQuestionIndex < 0 || !gameData.questions || gameData.currentQuestionIndex >= gameData.questions.length) {
          return null;
      }
      return gameData.questions[gameData.currentQuestionIndex];
  }, [gameData?.questions, gameData?.currentQuestionIndex]);

  const gameStatus = gameData?.status;
  const cooldownSeconds = gameData?.config?.cooldownSeconds ?? 3;

  // --- Effects ---

   useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
       clearInterval(timerRef.current);
       clearTimeout(cooldownTimerRef.current);
    };
   }, []);

  useEffect(() => {
    previousStatusRef.current = gameData?.status;
    currentQuestionIndexRef.current = gameData?.currentQuestionIndex;
  }, [gameData?.status, gameData?.currentQuestionIndex]);

  // Game State Listener
  useEffect(() => {
    const localPlayerId = getPlayerId(gameId);
    if (!gameId || !localPlayerId) {
      const errMsg = "Cannot join game: Missing Game ID or Player ID. Returning home.";
      setError(errMsg); setInternalError("gameId or localPlayerId missing on mount");
      toast.error(errMsg); setLoading(false);
      setTimeout(() => navigate('/'), 3000);
      return;
    }
    if (!currentPlayerId.current) currentPlayerId.current = localPlayerId;

    setLoading(true); setError(''); setInternalError('');

    const unsubscribe = listenToGame(gameId, (data, listenerError) => {
       if (!isMountedRef.current) return;

       if (listenerError) {
            console.error("Firestore listener error:", listenerError);
            const errMsg = "Connection error: Could not sync game state.";
            setError(errMsg); setInternalError(`Listener error: ${listenerError.message}`);
            toast.error(errMsg); setLoading(false);
            return;
       }

      if (data) {
        const prevStatus = previousStatusRef.current;
        const newStatus = data.status;
        const prevIndex = currentQuestionIndexRef.current;
        const newIndex = data.currentQuestionIndex;

        setGameData(data); setError(''); setInternalError(''); setLoading(false);

        // --- Handle Status Transitions ---
        if (newStatus === 'waiting' && prevStatus !== 'waiting') {
            console.log("Game returned to waiting state, navigating to lobby.");
            toast.info("Game returned to lobby.");
            clearInterval(timerRef.current); clearTimeout(cooldownTimerRef.current);
            navigate(`/lobby/${gameId}`);
        } else if (newStatus === 'finished' && prevStatus !== 'finished') {
            console.log("Game finished."); toast.success("Game Over!");
            clearInterval(timerRef.current); clearTimeout(cooldownTimerRef.current);
        } else if (newStatus === 'playing') {
            const isNewQuestion = prevIndex !== newIndex;
            const cameFromResults = prevStatus === 'showing_results';
            const cameFromWaiting = prevStatus === 'waiting' || prevStatus === null;

            if (isNewQuestion && (cameFromResults || cameFromWaiting)) {
                 console.log(`Transitioning to playing question ${newIndex}. Resetting local state.`);
                 setSelectedOption(null);
                 setTypedAnswer(''); // Reset typed answer
                 setHasSubmitted(false);
                 setSubmissionResult(null);
                 setIsSubmitting(false);
                 // Focus input field if it's an identification question
                 setTimeout(() => {
                    if (inputRef.current && data.questions?.[newIndex]?.type === 'identification') {
                        inputRef.current.focus();
                    }
                 }, 100); // Small delay to ensure rendering
            }
            clearTimeout(cooldownTimerRef.current);
        } else if (newStatus === 'showing_results' && prevStatus !== 'showing_results') {
            console.log(`Transitioning to showing_results for question ${data.lastQuestionResults?.questionIndex}`);
            clearInterval(timerRef.current); setTimeLeft(0);

            const currentIsHost = data.hostId === currentPlayerId.current;
            if (currentIsHost) {
                clearTimeout(cooldownTimerRef.current);
                console.log(`Host starting ${cooldownSeconds}s cooldown timer to move from results.`);
                cooldownTimerRef.current = setTimeout(() => {
                    if (!isMountedRef.current) return;
                    console.log("Cooldown finished. Host moving to next question/finish...");
                    moveToNextQuestion(gameId, currentPlayerId.current).catch(err => {
                        console.error("Host failed to move to next question:", err);
                        const errMsg = "Error advancing game. Host may need to manually trigger.";
                        setError(errMsg); setInternalError(`moveToNextQuestion failed: ${err.message}`);
                        toast.error(errMsg);
                    });
                }, cooldownSeconds * 1000);
            }
        }

      } else {
        const errMsg = "Game not found or has been deleted. Returning home.";
        setError(errMsg); setInternalError(`Game data null for ${gameId}`);
        toast.error(errMsg); setGameData(null); setLoading(false);
        clearInterval(timerRef.current); clearTimeout(cooldownTimerRef.current);
        setTimeout(() => navigate('/'), 3000);
      }
    });

    return () => {
        console.log(`Unsubscribing listener for game ${gameId}`);
        unsubscribe();
        clearInterval(timerRef.current); clearTimeout(cooldownTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, navigate, cooldownSeconds]);

  // Question Timer Logic
  useEffect(() => {
    clearInterval(timerRef.current);

    if (gameStatus !== 'playing' || !currentQuestion || !gameData?.currentQuestionStartTime) {
      setTimeLeft(0); return;
    }

    let questionStartTime;
    if (gameData.currentQuestionStartTime?.toDate) questionStartTime = gameData.currentQuestionStartTime.toDate();
    else if (gameData.currentQuestionStartTime instanceof Date) questionStartTime = gameData.currentQuestionStartTime;
    else {
        try {
             questionStartTime = new Date(gameData.currentQuestionStartTime);
             if (isNaN(questionStartTime.getTime())) throw new Error("Invalid Date");
        } catch (parseError) {
             console.warn("Could not parse question start time:", gameData.currentQuestionStartTime, parseError);
             setTimeLeft(gameData.config?.timePerQuestion || 10); return;
        }
    }

    const timeLimit = gameData.config?.timePerQuestion || 10;

    const updateTimer = () => {
      const now = new Date();
      const elapsed = (now.getTime() - questionStartTime.getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil(timeLimit - elapsed));

      if (isMountedRef.current) setTimeLeft(remaining);
      else { clearInterval(timerRef.current); return; }

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (isHost && gameStatus === 'playing') {
            console.log("Timer expired, host advancing to results state...");
            advanceToResultsState(gameId, currentPlayerId.current).catch(err => {
                console.error("Host failed to advance state on timer expiry:", err);
                if (isMountedRef.current && isHost) {
                    const errMsg = "Error automatically advancing after timer.";
                    setError(errMsg); setInternalError(`advanceToResultsState (timer) failed: ${err.message}`);
                    toast.error(errMsg);
                }
            });
        }
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 500);

    return () => clearInterval(timerRef.current);

  }, [gameStatus, currentQuestion, gameData?.currentQuestionStartTime, gameData?.config?.timePerQuestion, isHost, gameId]);


  // --- Event Handlers ---
  const handleOptionSelect = (option) => {
      if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && currentQuestion?.type !== 'identification') {
          setSelectedOption(option);
          setTypedAnswer(''); // Clear typed answer if option is selected
      }
  };

  const handleInputChange = (event) => {
     if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && currentQuestion?.type === 'identification') {
         setTypedAnswer(event.target.value);
         setSelectedOption(null); // Clear selected option if typing
     }
  };

  const handleAnswerSubmit = async () => {
    const isIdentification = currentQuestion?.type === 'identification';
    const answerToSubmit = isIdentification ? typedAnswer.trim() : selectedOption;

    // Validation
    if (!answerToSubmit || hasSubmitted || isEliminated || gameStatus !== 'playing' || !currentPlayerId.current || timeLeft <= 0) {
        console.warn("Submit blocked:", { answerToSubmit, hasSubmitted, isEliminated, status: gameStatus, timeLeft });
        let blockReason = "Cannot submit.";
        if (isEliminated) blockReason = "You are eliminated and cannot submit.";
        else if (hasSubmitted) blockReason = "You have already submitted for this question.";
        else if (timeLeft <= 0) blockReason = "Time is up for this question.";
        else if (!answerToSubmit) blockReason = isIdentification ? "Please type an answer." : "Please select an option.";
        toast.warn(blockReason);
        setError(blockReason);
        return;
    }

    setIsSubmitting(true);
    setError(''); setInternalError('');

    // --- Local Feedback & Comparison ---
    let isCorrect = false;
    const correctAnswer = currentQuestion?.correctAnswer;

    if (isIdentification) {
        // Case-insensitive comparison for identification
        isCorrect = answerToSubmit.toLowerCase() === correctAnswer?.toLowerCase();
    } else {
        // Direct comparison for MC/TF
        isCorrect = answerToSubmit === correctAnswer;
    }

    setHasSubmitted(true);
    setSubmissionResult(isCorrect ? 'correct' : 'incorrect');

    try {
      await submitAnswer(gameId, currentPlayerId.current, gameData.currentQuestionIndex, answerToSubmit); // Submit the trimmed typed answer or selected option
      console.log(`Player ${currentPlayerId.current} submitted answer: ${answerToSubmit}`);
      toast.info("Answer submitted!");
    } catch (err) {
      console.error("Failed to submit answer:", err);
      const errMsg = `Submit failed: ${err.message || "Could not record your answer."}`;
      setError(errMsg); setInternalError(`submitAnswer failed: ${err.message}`);
      toast.error(errMsg);
      // Optionally revert local state on failure?
      // setHasSubmitted(false); setSubmissionResult(null);
    } finally {
         if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  // --- Render Logic ---

  if (loading && !gameData) return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
          <Spinner size="lg" /><p className="mt-4 text-xl text-textSecondary">Loading game details...</p>
      </div>
  );

  if (error && !gameData) return (
       <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
         <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Error</h2>
         <p className="text-lg mb-6 text-textPrimary">{error}</p>
         {internalError && <p className="text-xs text-textSecondary mb-4">Details: {internalError}</p>}
         <button onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Back to Home</button>
       </div>
     );

   if (!gameData) return <div className="text-center text-xl text-textSecondary mt-10">Game data unavailable. Please try rejoining.</div>;

  // --- Game Over State ---
  if (gameStatus === 'finished') {
    const winner = playersArray.length > 0 && playersArray[0].lives > 0 ? playersArray[0] : null;
    const highestScorer = playersArray.length > 0 ? playersArray[0] : null;

    return (
      <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-warning-light">🏁 Game Over! 🏁</h2>
        {winner ? <p className="text-2xl font-semibold mb-2 text-success-light">🏆 Winner: {winner.name}! 🏆</p>
         : highestScorer ? <p className="text-xl mb-2 text-orange-400">Highest Score: {highestScorer.name} (No winner survived)</p>
         : <p className="text-xl mb-2 text-textSecondary">No players finished!</p>}
        <p className="text-lg mt-6 mb-3 text-textPrimary font-semibold">Final Standings:</p>
        <ul className="space-y-2 mb-8 text-left max-w-sm mx-auto">
            {playersArray.map((p, index) => {
                const isWinner = winner && p.id === winner.id;
                const isEliminatedPlayer = (p.lives ?? 0) <= 0;
                return (
                    <li key={p.id} className={`flex justify-between items-center px-4 py-2 rounded border ${ isWinner ? 'bg-success-dark border-success-light ring-2 ring-success-light shadow-lg' : 'bg-gray-700 border-gray-600' } ${isEliminatedPlayer ? 'opacity-60' : ''}`}>
                        <span className={`font-medium ${isWinner ? 'text-white' : 'text-textPrimary'} ${isEliminatedPlayer ? 'line-through' : ''}`}>
                            {index + 1}. {p.name} {p.isHost ? <span className="text-xs text-success-light opacity-80">(Host)</span> : ''} {isWinner ? '🏆' : ''}
                        </span>
                        <span className={`${isWinner ? 'text-white' : 'text-textPrimary'} font-medium`}>
                            Score: {p.score ?? 0} | Lives: {isEliminatedPlayer ? '💀' : (p.lives ?? 0)}
                        </span>
                    </li>
                );
            })}
             {playersArray.length === 0 && <li className="text-textSecondary text-center italic">No players recorded.</li>}
        </ul>
         {error && ( <div className="mb-4 p-3 bg-danger-dark border border-danger rounded text-center"> <p className="font-semibold text-danger-light">{error}</p> {internalError && <p className="text-xs text-danger-light opacity-80 mt-1">Details: {internalError}</p>} </div> )}
        <button onClick={() => { localStorage.removeItem(`ytg-host-${gameId}`); localStorage.removeItem(`ytg-player-${gameId}`); navigate('/'); }} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg"> Back to Home </button>
      </div>
    );
  }

  // --- Waiting / Loading Question State ---
  if (gameStatus === 'playing' && !currentQuestion) return ( <div className="flex flex-col items-center justify-center h-64 text-center"> <Spinner size="lg" /> <p className="mt-4 text-xl text-textSecondary">Loading next question...</p> </div> );
  if (gameStatus === 'waiting') return <div className="text-center text-xl text-textSecondary mt-10">Waiting for game to start...</div>;
  if (!currentQuestion && gameStatus !== 'showing_results') return ( <div className="flex flex-col items-center justify-center h-64 text-center"> <Spinner size="lg" /> <p className="mt-4 text-xl text-textSecondary">Waiting for game state update...</p> </div> );

  // --- Main Game Area (Playing or Showing Results) ---
  const renderQuestionContent = (questionData) => {
    if (!questionData) return <div className="text-xl text-textSecondary italic">Waiting for question...</div>;
    switch (questionData.type) {
      case 'flag_mc': return <div className="text-7xl md:text-8xl mb-8">{questionData.question}</div>;
      case 'language_mc': case 'text_mc': case 'true_false': case 'identification':
        return <div className="text-xl md:text-2xl font-medium mb-8 text-textPrimary"><p>{questionData.question}</p></div>;
      default:
        console.warn("Unknown question type in renderQuestionContent:", questionData.type);
        return <div className="text-xl md:text-2xl font-medium mb-8 text-textPrimary"><p>{questionData.question || 'Error: Invalid question format'}</p></div>;
    }
  };

  const lastResults = gameData.lastQuestionResults;
  const displayQuestionIndex = gameStatus === 'showing_results' ? lastResults?.questionIndex : gameData.currentQuestionIndex;
  const displayQuestionData = displayQuestionIndex !== undefined && displayQuestionIndex !== null && displayQuestionIndex >= 0 ? gameData.questions?.[displayQuestionIndex] : null;
  const correctAnswer = gameStatus === 'showing_results' ? lastResults?.correctAnswer : currentQuestion?.correctAnswer;
  const isIdentificationQuestion = displayQuestionData?.type === 'identification';

  // --- Player List Component --- (Remains the same)
   const PlayerList = React.memo(({ players, status, results, time, currentId }) => { /* ... PlayerList JSX ... */ });
   PlayerList.displayName = 'PlayerList';

  return (
    <div className="max-w-4xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl">
       {error && ( <div className="mb-4 p-3 bg-danger-dark border border-danger rounded text-center"> <p className="font-semibold text-danger-light">{error}</p> {internalError && <p className="text-xs text-danger-light opacity-80 mt-1">Details: {internalError}</p>} </div> )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Quiz Area */}
        <div className="flex-grow md:w-2/3">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-xl md:text-2xl font-bold text-primary-light">
                   {gameStatus === 'showing_results' ? `Results for Q ${displayQuestionIndex !== null ? displayQuestionIndex + 1 : '?'}` : `Question ${gameData.currentQuestionIndex !== null ? gameData.currentQuestionIndex + 1 : '?'}`} / {gameData.questions?.length || '?'}
              </h2>
              <div className={`text-lg md:text-xl font-semibold ${gameStatus === 'playing' && !isEliminated ? 'text-warning-light' : 'text-gray-500'}`}>
                  {gameStatus === 'playing' && !isEliminated ? `Time Left: ${timeLeft}s` : (gameStatus === 'showing_results' ? `Next question in...` : `Status: ${gameStatus}`)}
              </div>
          </div>

          {/* Question Content */}
          <div key={`question-${displayQuestionIndex}`} className="min-h-[80px] flex justify-center items-center text-center bg-gray-700 p-6 rounded mb-6 shadow transition-opacity duration-500 ease-in-out">
            {loading && !displayQuestionData ? ( <div className="flex flex-col items-center justify-center"> <Spinner /> <p className="mt-2 text-textSecondary">Loading question...</p> </div> )
             : renderQuestionContent(displayQuestionData)}
            {!loading && !displayQuestionData && <span className="text-danger">Error loading question data.</span>}
          </div>

          {/* Options Area OR Identification Input */}
          {isIdentificationQuestion ? (
              // --- Identification Input ---
              <div className="mb-6">
                  <input
                      ref={inputRef} // Assign ref
                      type="text"
                      value={typedAnswer}
                      onChange={handleInputChange}
                      placeholder="Type your answer here..."
                      disabled={hasSubmitted || timeLeft <= 0 || isEliminated || isSubmitting || gameStatus !== 'playing'}
                      className={`w-full px-4 py-3 bg-gray-600 border rounded-md text-lg text-textPrimary focus:outline-none focus:ring-2 focus:border-transparent transition duration-200 ease-in-out ${
                          hasSubmitted && submissionResult === 'correct' ? 'border-success ring-success-light bg-success-dark text-white' :
                          hasSubmitted && submissionResult === 'incorrect' ? 'border-danger ring-danger-light bg-danger-dark text-white' :
                          'border-gray-500 focus:ring-primary focus:border-primary-light'
                      } ${ (hasSubmitted || timeLeft <= 0 || isEliminated || isSubmitting || gameStatus !== 'playing') ? 'opacity-60 cursor-not-allowed' : '' }`}
                      // Allow submitting with Enter key
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isSubmitting) handleAnswerSubmit(); }}
                  />
                   {/* Show correct answer during results for identification */}
                   {gameStatus === 'showing_results' && (
                       <p className="mt-2 text-sm text-success-light">Correct Answer: <span className="font-semibold">{correctAnswer}</span></p>
                   )}
              </div>
          ) : (
              // --- Options Buttons (MC/TF) ---
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(displayQuestionData?.options || []).map((option) => {
                  const isCorrect = option === correctAnswer;
                  const isSelected = option === selectedOption;
                  const playerResultData = gameStatus === 'showing_results' ? lastResults?.playerResults?.[currentPlayerId.current] : null;
                  const playerSubmittedThisOption = playerResultData?.submittedAnswer === option;

                  let buttonClasses = "w-full py-3 px-4 rounded-lg text-lg font-medium transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75 flex items-center justify-center gap-2 ";
                  let isDisabled = true;
                  let icon = null;

                  if (gameStatus === 'playing') {
                      isDisabled = hasSubmitted || timeLeft <= 0 || isEliminated || isSubmitting;
                      if (isEliminated) buttonClasses += 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed line-through';
                      else if (hasSubmitted) {
                          if (isSelected) {
                              if (submissionResult === 'correct') { buttonClasses += 'bg-success text-white ring-success-light scale-105 shadow-lg cursor-not-allowed'; icon = <CheckIcon />; }
                              else { buttonClasses += 'bg-danger text-white ring-danger-light scale-105 shadow-lg cursor-not-allowed'; icon = <CrossIcon />; }
                          } else buttonClasses += 'bg-gray-600 text-textSecondary opacity-60 cursor-not-allowed';
                      } else if (timeLeft <= 0) buttonClasses += 'bg-gray-600 text-textSecondary opacity-70 cursor-not-allowed';
                      else if (isSelected) { isDisabled = false; buttonClasses += 'bg-primary-dark text-white ring-primary-light scale-105 shadow-md focus:ring-primary-light'; }
                      else { isDisabled = false; buttonClasses += 'bg-gray-700 hover:bg-gray-600 text-textPrimary hover:shadow-md transform hover:scale-[1.02] focus:ring-primary-light'; }
                  } else if (gameStatus === 'showing_results') {
                      isDisabled = true;
                      if (isCorrect) { buttonClasses += 'bg-success border-2 border-success-light text-white ring-success-light scale-105 shadow-lg font-bold'; icon = <CheckIcon />; }
                      else if (playerResultData && playerSubmittedThisOption) { buttonClasses += 'bg-danger border-2 border-danger-light text-white ring-danger-light opacity-80'; icon = <CrossIcon />; }
                      else buttonClasses += 'bg-gray-600 text-textSecondary opacity-50';
                  } else buttonClasses += 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50';

                  return ( <button key={`${displayQuestionData?.id || displayQuestionIndex}-${option}`} onClick={() => handleOptionSelect(option)} className={buttonClasses} disabled={isDisabled}> <span>{option}</span> {icon} </button> );
                })}
                {(!displayQuestionData?.options || displayQuestionData.options.length === 0) && [0,1,2,3].map(i => ( <div key={i} className="w-full h-[58px] rounded-lg bg-gray-700 animate-pulse"></div> ))}
              </div>
          )}

           {/* Submit Button - Show only when playing, not submitted, time > 0, not eliminated */}
           {gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && !isEliminated && (
                <div className="mb-6 text-center">
                    <button
                        onClick={handleAnswerSubmit}
                        disabled={(!selectedOption && !typedAnswer) || isSubmitting} // Disable if nothing selected/typed
                        className={`bg-success hover:bg-success-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-success focus:ring-opacity-50 shadow-lg flex items-center justify-center min-w-[180px] ${(!selectedOption && !typedAnswer) || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? ( <><Spinner size="sm" /><span className="ml-2">Submitting...</span></> ) : ( 'Submit Answer' )}
                    </button>
                </div>
           )}

           {/* --- Feedback Area --- */}
           <div className="min-h-[3em] mb-6 flex flex-col justify-center items-center text-center px-4">
                {isEliminated && <p className="text-danger font-bold text-xl flex items-center gap-2"><SkullIcon className="h-6 w-6"/> You have been eliminated! <SkullIcon className="h-6 w-6"/></p>}
                {gameStatus === 'playing' && !isEliminated && (
                    <>
                        {hasSubmitted && submissionResult === 'correct' && <p className="text-success-light font-semibold text-lg flex items-center gap-1"><CheckIcon /> Correct! Waiting for others...</p>}
                        {hasSubmitted && submissionResult === 'incorrect' && <p className="text-danger-light font-semibold text-lg flex items-center gap-1"><CrossIcon /> Incorrect! Waiting for others...</p>}
                        {timeLeft <= 0 && !hasSubmitted && <p className="text-danger-light font-semibold text-lg flex items-center gap-1"><TimerIcon /> Time's up! Waiting for results...</p>}
                        {!hasSubmitted && timeLeft > 0 && !isIdentificationQuestion && !selectedOption && <p className="text-textSecondary text-lg">Select your answer above.</p>}
                        {!hasSubmitted && timeLeft > 0 && !isIdentificationQuestion && selectedOption && <p className="text-warning-light text-lg animate-pulse">You selected: "{selectedOption}". Press Submit!</p>}
                        {!hasSubmitted && timeLeft > 0 && isIdentificationQuestion && !typedAnswer && <p className="text-textSecondary text-lg">Type your answer above.</p>}
                        {!hasSubmitted && timeLeft > 0 && isIdentificationQuestion && typedAnswer && <p className="text-warning-light text-lg animate-pulse">Press Submit!</p>}
                    </>
                )}
                 {gameStatus === 'showing_results' && !isEliminated && lastResults?.playerResults?.[currentPlayerId.current] && (
                    <>
                        {lastResults.playerResults[currentPlayerId.current].wasCorrect ?
                            <p className="text-success-light font-semibold text-lg flex items-center gap-1"><CheckIcon /> You were Correct! (+{lastResults.playerResults[currentPlayerId.current].scoreChange} Score) {lastResults.playerResults[currentPlayerId.current].isFirstCorrect ? '🥇' : ''}</p> :
                            (lastResults.playerResults[currentPlayerId.current].submittedAnswer !== null ?
                                <p className="text-danger-light font-semibold text-lg flex items-center gap-1"><CrossIcon /> You were Incorrect! ({lastResults.playerResults[currentPlayerId.current].lifeChange} ❤️)</p> :
                                <p className="text-orange-400 font-semibold text-lg flex items-center gap-1"><TimerIcon /> You didn't answer in time. ({lastResults.playerResults[currentPlayerId.current].lifeChange} ❤️)</p>
                            )
                        }
                        {/* Show submitted answer vs correct answer if incorrect during results */}
                        {!lastResults.playerResults[currentPlayerId.current].wasCorrect && lastResults.playerResults[currentPlayerId.current].submittedAnswer !== null && (
                             <p className="text-sm text-gray-400 mt-1">Your answer: "{lastResults.playerResults[currentPlayerId.current].submittedAnswer}"</p>
                        )}
                         {!lastResults.playerResults[currentPlayerId.current].wasCorrect && isIdentificationQuestion && ( // Always show correct answer for ID if wrong/timeout
                             <p className="text-sm text-success-light mt-1">Correct Answer: "{correctAnswer}"</p>
                         )}
                    </>
                 )}
                  {gameStatus === 'showing_results' && !isEliminated && !lastResults?.playerResults?.[currentPlayerId.current] && ( <p className="text-textSecondary italic">Waiting for result details...</p> )}
           </div>

           {/* Host Debug Controls */}
           {isHost && (
               <div className="mt-4 text-center border-t border-gray-600 pt-4 space-x-2">
                   {gameStatus === 'playing' && (timeLeft <= 0) && ( <button onClick={() => advanceToResultsState(gameId, currentPlayerId.current).catch(err => { setError(`Host Error: ${err.message}`); console.error("Host manual advance failed:", err); toast.error(`Host Error: ${err.message}`); })} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded text-sm" title="Debug: Force results state if timer/submit failed"> Host: Force Results </button> )}
                   {gameStatus === 'showing_results' && ( <button onClick={() => moveToNextQuestion(gameId, currentPlayerId.current).catch(err => { setError(`Host Error: ${err.message}`); console.error("Host manual next failed:", err); toast.error(`Host Error: ${err.message}`); })} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded text-sm" title="Debug: Force next question/finish if cooldown failed"> Host: Force Next </button> )}
               </div>
           )}
        </div>

        {/* Right Side: Player List / Scoreboard */}
         <PlayerList players={playersArray} status={gameStatus} results={lastResults} time={timeLeft} currentId={currentPlayerId.current} />
      </div>
    </div>
  );
}

export default QuizGame;