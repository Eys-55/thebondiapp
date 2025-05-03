import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    listenToGame,
    submitAnswer,
    advanceToResultsState, // Renamed function
    moveToNextQuestion // New function for host
} from '../services/firebaseService';

// Helper to get player ID
const getPlayerId = (gameId) => {
    return localStorage.getItem(`ytg-player-${gameId}`) || localStorage.getItem(`ytg-host-${gameId}`);
}

function QuizGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState(null); // Player's choice
  const [hasSubmitted, setHasSubmitted] = useState(false); // Has *current* player submitted this question?
  const [submissionResult, setSubmissionResult] = useState(null); // Local feedback: 'correct', 'incorrect'
  const [timeLeft, setTimeLeft] = useState(0); // Time left for 'playing' state
  const [isSubmitting, setIsSubmitting] = useState(false); // Submission loading indicator

  const timerRef = useRef(null); // Ref for the question timer interval
  const cooldownTimerRef = useRef(null); // Ref for the results cooldown timeout (host only)
  const currentPlayerId = useRef(getPlayerId(gameId));
  const previousStatusRef = useRef(null); // Ref to track the previous game status
  const currentQuestionIndexRef = useRef(null); // Ref to track the current question index reliably

  // --- Derived State ---
  const isHost = useMemo(() => gameData?.hostId === currentPlayerId.current, [gameData]);
  const playersArray = useMemo(() => {
      if (!gameData?.players) return [];
      return Object.values(gameData.players).sort((a, b) => b.score - a.score); // Sort by score
  }, [gameData?.players]);
  const currentQuestion = useMemo(() => {
      if (!gameData || gameData.currentQuestionIndex < 0 || !gameData.questions) return null;
      return gameData.questions[gameData.currentQuestionIndex];
  }, [gameData?.questions, gameData?.currentQuestionIndex]);
  const gameStatus = gameData?.status; // 'waiting', 'playing', 'showing_results', 'finished'
  const cooldownSeconds = gameData?.config?.cooldownSeconds || 3;

  // --- Effects ---

  // Update refs after state changes
  useEffect(() => {
    previousStatusRef.current = gameData?.status;
    currentQuestionIndexRef.current = gameData?.currentQuestionIndex;
  }, [gameData?.status, gameData?.currentQuestionIndex]);

  // Game State Listener
  useEffect(() => {
    if (!gameId || !currentPlayerId.current) {
      setError("Missing Game ID or Player ID.");
      setLoading(false);
      navigate('/');
      return;
    }

    setLoading(true);
    const unsubscribe = listenToGame(gameId, (data) => {
      if (data) {
        const prevStatus = previousStatusRef.current;
        const newStatus = data.status;
        const prevIndex = currentQuestionIndexRef.current;
        const newIndex = data.currentQuestionIndex;

        setGameData(data); // Update main state first
        setError('');
        setLoading(false);

        // --- Handle Status Transitions ---
        if (newStatus === 'waiting') {
            console.log("Game returned to waiting state, navigating to lobby.");
            navigate(`/lobby/${gameId}`);
        } else if (newStatus === 'finished') {
            console.log("Game finished.");
            clearInterval(timerRef.current);
            clearTimeout(cooldownTimerRef.current);
        } else if (newStatus === 'playing') {
            // Reset local state ONLY when moving from results/start to playing a new question
            if (prevStatus === 'showing_results' || (prevStatus === 'waiting' && prevIndex === -1 && newIndex === 0)) {
                 console.log(`Transitioning to playing question ${newIndex}. Resetting local state.`);
                 setSelectedOption(null);
                 setHasSubmitted(false);
                 setSubmissionResult(null);
                 setIsSubmitting(false); // Ensure submitting state is reset
            }
            // Ensure cooldown timer is cleared if somehow still running
            clearTimeout(cooldownTimerRef.current);
        } else if (newStatus === 'showing_results') {
            // Clear the question timer when results are shown
            clearInterval(timerRef.current);
            setTimeLeft(0); // Explicitly set time left to 0

            // Host starts the cooldown timer to move to the next question
            if (isHost) {
                clearTimeout(cooldownTimerRef.current); // Clear previous timeout just in case
                console.log(`Host starting ${cooldownSeconds}s cooldown timer.`);
                cooldownTimerRef.current = setTimeout(() => {
                    console.log("Cooldown finished. Host moving to next question...");
                    moveToNextQuestion(gameId, currentPlayerId.current).catch(err => {
                        console.error("Host failed to move to next question:", err);
                        setError("Error moving to the next question.");
                    });
                }, cooldownSeconds * 1000);
            }
        }

      } else {
        setError("Game not found or has been deleted.");
        setGameData(null);
        setLoading(false);
        clearTimeout(cooldownTimerRef.current); // Cleanup timer if game disappears
        clearInterval(timerRef.current);
        navigate('/');
      }
    });

    // Cleanup listener and timers on unmount
    return () => {
        unsubscribe();
        clearInterval(timerRef.current);
        clearTimeout(cooldownTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, navigate, isHost, cooldownSeconds]); // Add isHost and cooldownSeconds

  // Question Timer Logic (Runs only when status is 'playing')
  useEffect(() => {
    clearInterval(timerRef.current); // Clear previous timer

    if (gameStatus !== 'playing' || !currentQuestion || !gameData.currentQuestionStartTime) {
      setTimeLeft(0);
      return;
    }

    let questionStartTime;
    // Handle Firestore Timestamp object or JS Date object
    if (gameData.currentQuestionStartTime?.toDate) {
        questionStartTime = gameData.currentQuestionStartTime.toDate();
    } else if (gameData.currentQuestionStartTime instanceof Date) {
        questionStartTime = gameData.currentQuestionStartTime;
    } else {
        console.warn("Waiting for question start time..."); // May be pending server timestamp
        setTimeLeft(gameData.config?.timePerQuestion || 10); // Show full time initially
        return;
    }

    const timeLimit = gameData.config?.timePerQuestion || 10;

    const updateTimer = () => {
      const now = new Date();
      const elapsed = (now.getTime() - questionStartTime.getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil(timeLimit - elapsed));
      setTimeLeft(remaining);

      // When timer hits 0, host triggers the advance to results state
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (isHost && gameStatus === 'playing') { // Double check status
            console.log("Timer expired, host advancing to results state...");
            advanceToResultsState(gameId, currentPlayerId.current).catch(err => {
                console.error("Host failed to advance state on timer expiry:", err);
                // Avoid setting global error for transient issues?
            });
        }
      }
    };

    updateTimer(); // Initial calculation
    timerRef.current = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(timerRef.current); // Cleanup timer

  }, [gameStatus, currentQuestion, gameData?.currentQuestionStartTime, gameData?.config?.timePerQuestion, isHost, gameId]);


  // --- Event Handlers ---
  const handleOptionSelect = (option) => {
      // Allow selection only when playing, not submitted, and time > 0
      if (gameStatus === 'playing' && !hasSubmitted && timeLeft > 0) {
          setSelectedOption(option);
      }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedOption || hasSubmitted || gameStatus !== 'playing' || !currentPlayerId.current || timeLeft <= 0) {
        console.warn("Submit blocked:", {selectedOption, hasSubmitted, status: gameStatus, timeLeft});
        return;
    }

    setIsSubmitting(true);
    setHasSubmitted(true); // Mark submitted locally immediately

    const isCorrect = selectedOption === currentQuestion?.correctAnswer;
    setSubmissionResult(isCorrect ? 'correct' : 'incorrect'); // Set local feedback

    try {
      // Submit answer. The service function will handle checking if all players answered
      // and trigger advanceToResultsState if necessary.
      await submitAnswer(gameId, currentPlayerId.current, gameData.currentQuestionIndex, selectedOption);
      console.log(`Player ${currentPlayerId.current} submitted answer: ${selectedOption}`);
      // No need to manually trigger advance here, submitAnswer handles it.
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setError("Could not submit your answer. Please try again if possible.");
      // Revert local state? Maybe not, keep feedback but show error.
      // setHasSubmitted(false);
      // setSubmissionResult(null);
    } finally {
         setIsSubmitting(false);
    }
  };

  // --- Render Logic ---

  if (loading) return <div className="flex justify-center items-center h-64 text-xl text-gray-400">Loading game...</div>;
  if (error) return <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center"><h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2><p className="text-lg mb-6 text-gray-300">{error}</p><button onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Back to Home</button></div>;
  if (!gameData) return <div className="text-center text-xl text-gray-400 mt-10">Game data not available.</div>;

  // --- Game Over State ---
  if (gameStatus === 'finished') {
    const finalPlayers = playersArray.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.lives ?? 0) - (a.lives ?? 0);
    });
    const winner = finalPlayers.length > 0 ? finalPlayers[0] : null;
    return (
      <div className="max-w-lg mx-auto p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-yellow-400">Game Over!</h2>
        {winner && winner.lives > 0 && <p className="text-xl mb-2 text-green-400">🏆 Winner: {winner.name}! 🏆</p>}
        {winner && winner.lives <= 0 && finalPlayers.length > 1 && <p className="text-xl mb-2 text-orange-400">Highest Score (Eliminated): {winner.name}</p>}
        {finalPlayers.length <= 1 && (!winner || winner.lives <= 0) && <p className="text-xl mb-2 text-gray-400">No winner survived!</p>}
        <p className="text-lg mb-6 text-gray-200">Final Standings:</p>
        <ul className="space-y-2 mb-6 text-left max-w-sm mx-auto">
            {finalPlayers.map((p, index) => (
                <li key={p.id} className={`flex justify-between items-center px-4 py-2 rounded ${index === 0 ? 'bg-yellow-800 border border-yellow-600' : 'bg-gray-700'}`}>
                    <span className="font-medium text-gray-100">{index + 1}. {p.name} {p.isHost ? '(Host)' : ''}</span>
                    <span className="text-gray-200">Score: {p.score} | Lives: {p.lives}</span>
                </li>
            ))}
        </ul>
        <button onClick={() => { localStorage.removeItem(`ytg-host-${gameId}`); localStorage.removeItem(`ytg-player-${gameId}`); navigate('/'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Back to Home</button>
      </div>
    );
  }

  // --- Waiting / Loading Question State ---
  if ((gameStatus === 'playing' && !currentQuestion) || gameStatus === 'waiting') {
      return <div className="text-center text-xl text-gray-400 mt-10">Loading question...</div>;
  }
  // Should not happen if logic is correct, but fallback
  if (!currentQuestion && gameStatus !== 'showing_results') {
       return <div className="text-center text-xl text-gray-400 mt-10">Waiting for game state...</div>;
  }

  // --- Main Game Area (Playing or Showing Results) ---
  const renderQuestionContent = (questionData) => {
    if (!questionData) return null;
    switch (questionData.type) {
      case 'flag': return <div className="text-7xl md:text-8xl mb-8">{questionData.question}</div>;
      default: return <div className="text-xl md:text-2xl font-medium mb-8 text-gray-100"><p>{questionData.question}</p></div>;
    }
  };

  // Determine which question data to display (current or last for results)
  const displayQuestionData = gameStatus === 'showing_results'
                              ? gameData.questions[gameData.lastQuestionResults?.questionIndex]
                              : currentQuestion;
  const lastResults = gameData.lastQuestionResults;
  const correctAnswer = gameStatus === 'showing_results'
                        ? lastResults?.correctAnswer
                        : currentQuestion?.correctAnswer; // Needed for button styling during results

  return (
    <div className="max-w-4xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl">
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left Side: Quiz Area */}
        <div className="flex-grow md:w-2/3">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-xl md:text-2xl font-bold text-blue-300">
                  {gameStatus === 'showing_results' ? `Results for Q ${gameData.lastQuestionResults?.questionIndex + 1}` : `Question ${gameData.currentQuestionIndex + 1}`} / {gameData.questions.length}
              </h2>
              <div className={`text-lg md:text-xl font-semibold ${gameStatus === 'playing' ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {gameStatus === 'playing' ? `Time Left: ${timeLeft}s` : `Next question in...`}
              </div>
          </div>

          {/* Question Content */}
          <div className="min-h-[80px] flex justify-center items-center text-center bg-gray-700 p-4 rounded mb-6 shadow">
            {renderQuestionContent(displayQuestionData)}
          </div>

          {/* Options Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {(displayQuestionData?.options || []).map((option) => {
              const isCorrect = option === correctAnswer;
              const isSelected = option === selectedOption; // Player's local selection
              const playerResultData = gameStatus === 'showing_results' ? lastResults?.playerResults?.[currentPlayerId.current] : null;
              const playerSubmittedThisOption = playerResultData?.submittedAnswer === option;

              // Determine button state and style
              let buttonClasses = "w-full py-3 px-4 rounded-lg text-lg font-medium transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75 ";
              let isDisabled = true; // Disabled by default unless playing

              if (gameStatus === 'playing') {
                  isDisabled = hasSubmitted || timeLeft <= 0 || (gameData.players[currentPlayerId.current]?.lives ?? 0) <= 0;
                  if ((gameData.players[currentPlayerId.current]?.lives ?? 0) <= 0) {
                      buttonClasses += 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed line-through';
                  } else if (hasSubmitted) {
                      // Show local feedback immediately after submission
                      if (isCorrect) buttonClasses += 'bg-green-600 text-white ring-green-400 scale-105 shadow-lg';
                      else if (isSelected) buttonClasses += 'bg-red-600 text-white ring-red-400 scale-105 shadow-lg';
                      else buttonClasses += 'bg-gray-600 text-gray-400 opacity-60 cursor-not-allowed';
                  } else if (timeLeft <= 0) {
                      buttonClasses += 'bg-gray-600 text-gray-400 opacity-70 cursor-not-allowed';
                  } else if (isSelected) {
                      buttonClasses += 'bg-blue-700 text-white ring-blue-400 scale-105 shadow-md';
                  } else {
                      isDisabled = false; // Enable button if playing, not submitted, time > 0, has lives
                      buttonClasses += 'bg-gray-700 hover:bg-gray-600 text-gray-100 hover:shadow-md transform hover:-translate-y-1';
                  }
              } else if (gameStatus === 'showing_results') {
                  isDisabled = true; // Always disabled during results
                  if (isCorrect) {
                      buttonClasses += 'bg-green-600 text-white ring-green-400 scale-105 shadow-lg'; // Highlight correct answer
                  } else if (playerSubmittedThisOption) { // Player submitted this incorrect option
                      buttonClasses += 'bg-red-600 text-white ring-red-400 opacity-80';
                  } else { // Other incorrect options
                      buttonClasses += 'bg-gray-600 text-gray-400 opacity-60';
                  }
              }

              return (
                <button
                  key={`${displayQuestionData?.id}-${option}`}
                  onClick={() => handleOptionSelect(option)}
                  className={buttonClasses}
                  disabled={isDisabled}
                >
                  {option}
                </button>
              );
            })}
          </div>

           {/* Submit Button - Show only when playing, not submitted, time > 0, has lives */}
           {gameStatus === 'playing' && !hasSubmitted && timeLeft > 0 && (gameData.players[currentPlayerId.current]?.lives ?? 0) > 0 && (
                <div className="mb-6 text-center">
                    <button
                        onClick={handleAnswerSubmit}
                        disabled={!selectedOption || isSubmitting}
                        className={`bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-lg ${!selectedOption || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                    </button>
                </div>
           )}

           {/* Feedback Area */}
           <div className="min-h-[2em] mb-6 flex flex-col justify-center items-center text-center px-4">
                {/* Eliminated Message */}
                {(gameData.players[currentPlayerId.current]?.lives ?? 0) <= 0 && <p className="text-red-600 font-bold text-lg">You have been eliminated!</p>}

                {/* Playing State Feedback */}
                {gameStatus === 'playing' && (gameData.players[currentPlayerId.current]?.lives ?? 0) > 0 && (
                    <>
                        {hasSubmitted && submissionResult === 'correct' && <p className="text-green-400 font-semibold text-lg">Correct! Waiting for others...</p>}
                        {hasSubmitted && submissionResult === 'incorrect' && <p className="text-red-400 font-semibold text-lg">Incorrect! Waiting for others...</p>}
                        {timeLeft <= 0 && !hasSubmitted && <p className="text-red-400 font-semibold text-lg">Time's up!</p>}
                        {!hasSubmitted && timeLeft > 0 && !selectedOption && <p className="text-gray-400 text-lg">Select your answer.</p>}
                        {!hasSubmitted && timeLeft > 0 && selectedOption && <p className="text-yellow-400 text-lg">You selected: "{selectedOption}". Submit!</p>}
                    </>
                )}
                {/* Showing Results State Feedback */}
                 {gameStatus === 'showing_results' && lastResults?.playerResults?.[currentPlayerId.current] && (
                    <>
                        {lastResults.playerResults[currentPlayerId.current].wasCorrect ?
                            <p className="text-green-400 font-semibold text-lg">You were Correct! (+{lastResults.playerResults[currentPlayerId.current].scoreChange} Score)</p> :
                            <p className="text-red-400 font-semibold text-lg">You were Incorrect! ({lastResults.playerResults[currentPlayerId.current].lifeChange} Life)</p>
                        }
                        {gameData.config.gameMode === 'first_correct_wins' && lastResults.playerResults[currentPlayerId.current].isFirstCorrect &&
                            <p className="text-yellow-400 text-sm">(You answered first!)</p>
                        }
                    </>
                 )}
           </div>

           {/* Host Debug Controls - Keep minimal */}
           {isHost && gameStatus === 'playing' && timeLeft <= 0 && (
               <div className="mt-4 text-center border-t border-gray-600 pt-4">
                   <button onClick={() => advanceToResultsState(gameId, currentPlayerId.current).catch(err => console.error("Host manual advance failed:", err))} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded text-sm" title="Debug: Force results state if timer failed">
                       Host: Force Results
                   </button>
               </div>
           )}
            {isHost && gameStatus === 'showing_results' && (
               <div className="mt-4 text-center border-t border-gray-600 pt-4">
                   <button onClick={() => moveToNextQuestion(gameId, currentPlayerId.current).catch(err => console.error("Host manual next failed:", err))} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded text-sm" title="Debug: Force next question if cooldown failed">
                       Host: Force Next Q
                   </button>
               </div>
           )}

        </div>

        {/* Right Side: Player List / Scoreboard */}
        <div className="md:w-1/3 bg-gray-700 p-4 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">Players</h3>
            <ul className="space-y-3">
                {playersArray.map(player => {
                    const isCurrent = player.id === currentPlayerId.current;
                    const playerLives = player.lives ?? 0;
                    const playerResultData = gameStatus === 'showing_results' ? lastResults?.playerResults?.[player.id] : null;

                    // Determine status indicator
                    let statusIndicator = '';
                    let statusColor = 'text-gray-400';

                    if (playerLives <= 0) {
                         statusIndicator = '💀 Eliminated'; statusColor = 'text-red-600 font-bold';
                    } else if (gameStatus === 'playing') {
                        if (player.currentAnswer !== null) { statusIndicator = '✅ Submitted'; statusColor = 'text-green-400'; }
                        else if (timeLeft > 0) { statusIndicator = '🤔 Thinking...'; statusColor = 'text-yellow-400'; }
                        else { statusIndicator = '⌛ Timed Out'; statusColor = 'text-orange-400'; }
                    } else if (gameStatus === 'showing_results' && playerResultData) {
                        if (playerResultData.wasCorrect) { statusIndicator = `✅ Correct (${playerResultData.scoreChange > 0 ? '+' + playerResultData.scoreChange : '0'})`; statusColor = 'text-green-400'; }
                        else if (playerResultData.submittedAnswer !== null) { statusIndicator = `❌ Incorrect (${playerResultData.lifeChange < 0 ? playerResultData.lifeChange : '0'} ❤️)`; statusColor = 'text-red-400'; }
                        else { statusIndicator = '⌛ No Answer'; statusColor = 'text-orange-400'; } // Didn't submit in time
                    } else {
                        statusIndicator = 'Waiting...'; // Default/transitioning
                    }

                    return (
                        <li key={player.id} className={`flex justify-between items-center p-2 rounded ${isCurrent ? 'bg-blue-900 ring-2 ring-blue-500' : 'bg-gray-600'} ${playerLives <= 0 ? 'opacity-60' : ''}`}>
                            <div className="flex flex-col">
                                <span className={`font-medium ${isCurrent ? 'text-white' : 'text-gray-100'} ${playerLives <= 0 ? 'line-through' : ''}`}>
                                    {player.name} {player.isHost ? '(Host)' : ''} {isCurrent ? '(You)' : ''}
                                </span>
                                <span className={`text-xs ${statusColor}`}>
                                    {statusIndicator}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-yellow-400 block">Score: {player.score}</span>
                                <span className={`text-sm ${playerLives > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {playerLives > 0 ? '❤️'.repeat(playerLives) : '💔'}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>

      </div>
    </div>
  );
}

export default QuizGame;