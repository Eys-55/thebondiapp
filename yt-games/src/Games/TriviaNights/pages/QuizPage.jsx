import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import concepts from '../data/concepts.json';
import { generateQuestions as generateQuestionsForGame } from '../services/questionGenerator';
import Leaderboard from '../../Utils/Leaderboard'; // Import Leaderboard
// SVG Icons
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
  
  const [pendingAwardedPlayerIds, setPendingAwardedPlayerIds] = useState([]); // IDs of players selected, not yet confirmed
  const [awardedPlayerIdsThisRound, setAwardedPlayerIdsThisRound] = useState([]); // IDs of players confirmed for points this round

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
      return;
    }
    const fullGameConfig = { scoringMode: 'fastest', ...initialGameConfig };
    setGameConfig(fullGameConfig);
    setPlayers(initialPlayersSetup.map(p => ({...p, score: p.score || 0})));

    try {
      const generatedQuestions = generateQuestionsForGame(fullGameConfig, concepts);
      if (generatedQuestions.length === 0) {
        toast.error("No questions could be generated. Please try different options.");
        setGamePhase('finished');
        return;
      }
      setQuestions(generatedQuestions);
      setTimeLeft(fullGameConfig.timePerQuestion);
      setGamePhase('answering');
    } catch (e) {
      console.error("Error generating questions:", e);
      toast.error(`Error setting up game: ${e.message}`);
      setGamePhase('finished');
    }
    
    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [initialGameConfig, initialPlayersSetup, navigate]);

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
        return; // Cannot change selection if points already confirmed for this player
    }

    setPendingAwardedPlayerIds(prevPending => {
        if (gameConfig.scoringMode === 'fastest') {
            if (prevPending.includes(selectedPlayerId)) {
                return []; // Deselect if already pending
            }
            return [selectedPlayerId]; // Select, replacing any other pending
        } else { // 'multiple' mode
            if (prevPending.includes(selectedPlayerId)) {
                return prevPending.filter(id => id !== selectedPlayerId); // Deselect
            }
            return [...prevPending, selectedPlayerId]; // Select
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

    let newPointsAwarded = 0;
    const playerNamesAwarded = [];

    const updatedPlayers = players.map(player => {
        if (pendingAwardedPlayerIds.includes(player.id) && !awardedPlayerIdsThisRound.includes(player.id)) {
            newPointsAwarded++;
            playerNamesAwarded.push(player.name);
            return { ...player, score: player.score + 10 };
        }
        return player;
    });

    if (newPointsAwarded > 0) {
        setPlayers(updatedPlayers);
        setAwardedPlayerIdsThisRound(prevConfirmed => [...new Set([...prevConfirmed, ...pendingAwardedPlayerIds])]);
        toast.success(`${playerNamesAwarded.join(', ')} awarded 10 points!`);
    } else {
        toast.info("Selected players already had points confirmed or no new selections.");
    }
    setPendingAwardedPlayerIds([]); // Clear pending selections after confirmation
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

  if (gamePhase === 'loading') return <div className="flex items-center justify-center h-64 text-xl text-textSecondary">Setting up your multiplayer game...</div>;
  
  if ((!initialGameConfig || !initialPlayersSetup || initialPlayersSetup.length === 0 || (questions.length === 0 && gamePhase !== 'loading')) && gamePhase === 'finished') {
     return (
       <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
         <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Setup Error</h2>
         <p className="text-lg mb-6 text-textPrimary">There was an issue setting up the game. Please return to the setup page and try again.</p>
         <button onClick={() => navigate('/trivia-nights/setup')} className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded">Back to Setup</button>
       </div>
     );
  }
  
  if (gamePhase === 'finished') {
    // Prepare playerScores for the Leaderboard component
    const playerScoresForLeaderboard = players.reduce((acc, player) => {
      acc[player.id] = { score: player.score, name: player.name }; // Leaderboard expects score data under player.id
      return acc;
    }, {});

    const triviaLeaderboardFormatter = (player, scoreData, rank) => (
      <li key={player.id} className={`flex justify-between items-center px-4 py-2 rounded border ${ rank === 1 ? 'bg-success-dark border-success-light ring-2 ring-success-light shadow-lg' : 'bg-gray-700 border-gray-600' }`}>
        <span className={`font-medium ${rank === 1 ? 'text-white' : 'text-textPrimary'}`}>{rank}. {player.name} {rank === 1 ? '🏆' : ''}</span>
        <span className={`${rank === 1 ? 'text-white' : 'text-textPrimary'} font-medium`}>Score: {scoreData.score}</span>
      </li>
    );

    return (
      <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h2 className="text-4xl font-bold mb-4 text-warning-light">🏁 Game Over! 🏁</h2>
        <Leaderboard
          title="Final Scores"
          players={players} // The players array already contains names and IDs
          playerScores={playerScoresForLeaderboard}
          primarySortField="score"
          displayFormatter={triviaLeaderboardFormatter}
        />
        <button onClick={() => navigate('/trivia-nights/setup')} className="mt-8 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg"> Play Again? </button>
      </div>
    );
  }

  if (!currentQuestion || !gameConfig) return <div className="flex items-center justify-center h-64 text-xl text-textSecondary">Loading question or game configuration...</div>;

  return (
    <div className="max-w-4xl mx-auto p-5 md:p-8 bg-gray-800 rounded-lg shadow-xl flex flex-col min-h-[calc(100vh-120px)]">
      <div className="mb-4 px-2 pb-3 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-primary-light">Q: {currentQuestionIndex + 1} / {questions.length}</h2>
          <div className={`text-lg md:text-xl font-semibold ${gamePhase === 'answering' && timeLeft > 0 ? 'text-warning-light' : 'text-gray-500'}`}>
              <TimerIcon className="inline-block mr-1"/> {timeLeft > 0 ? `${timeLeft}s` : (gamePhase === 'answer_revealed' ? 'Revealed' : "Time's Up")}
          </div>
      </div>

      <div key={`question-area-${currentQuestionIndex}`} className="flex-grow flex flex-col justify-center items-center text-center bg-gray-700 p-6 rounded mb-4 shadow">
        <p className="text-xl md:text-2xl font-medium text-textPrimary">{renderQuestionText(currentQuestion)}</p>
      </div>

      {gameConfig.includeChoices && currentQuestion.options && currentQuestion.options.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {currentQuestion.options.map((option, index) => (
            <div key={index} className={`p-3 rounded-lg text-left text-md border-2 ${gamePhase === 'answer_revealed' ? (option === currentQuestion.correctAnswer ? 'bg-success-dark border-success text-white' : 'bg-gray-600 border-gray-500 text-gray-300') : 'bg-gray-600 border-gray-500 text-textPrimary'}`}>
              {option}
              {gamePhase === 'answer_revealed' && option === currentQuestion.correctAnswer && <CheckIcon className="h-5 w-5 float-right text-white" />}
            </div>
          ))}
        </div>
      )}

      {gamePhase === 'answer_revealed' && (
        <div className={`mb-4 p-3 rounded text-center bg-info-dark border border-info`}>
            <p className="font-semibold text-lg text-white">The correct answer is: <span className="font-bold">{currentQuestion.correctAnswer}</span></p>
            {awardedPlayerIdsThisRound.length > 0 && <p className="text-sm text-success-light mt-1">{players.filter(p => awardedPlayerIdsThisRound.includes(p.id)).map(p => p.name).join(', ')} scored this round!</p>}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
          {players.map(p => {
              const isConfirmedAward = awardedPlayerIdsThisRound.includes(p.id);
              const isPendingAward = pendingAwardedPlayerIds.includes(p.id) && !isConfirmedAward;
              
              let buttonClass = 'bg-gray-600 hover:bg-gray-500 border-gray-500 hover:border-gray-400 cursor-pointer'; // Default
              if (isConfirmedAward) {
                buttonClass = '!bg-success border-success-light ring-2 ring-white cursor-not-allowed';
              } else if (isPendingAward) {
                buttonClass = 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 ring-2 ring-yellow-200 cursor-pointer';
              }

              return (
                <button
                    key={p.id}
                    onClick={() => handlePlayerSelectionToggle(p.id)}
                    disabled={isConfirmedAward || (gamePhase !== 'answering' && gamePhase !== 'answer_revealed')}
                    className={`p-3 rounded-lg text-center transition duration-200 ease-in-out border-2 ${buttonClass}`}
                >
                    <p className="text-md font-semibold truncate text-white">{p.name}</p>
                    <p className="text-xl font-bold text-success-light">{p.score}</p>
                </button>
              );
          })}
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 mt-auto">
          {gamePhase === 'answering' && (
              <button
                  onClick={handleShowAnswer}
                  className="flex-1 bg-info hover:bg-info-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                  Show Answer
              </button>
          )}
          {(gamePhase === 'answering' || gamePhase === 'answer_revealed') && pendingAwardedPlayerIds.length > 0 && (
              <button
                  onClick={handleConfirmAwards}
                  className="flex-1 bg-success hover:bg-success-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                  Confirm Awards ({pendingAwardedPlayerIds.length})
              </button>
          )}
          <button
              onClick={handleNextQuestion}
              className={`flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg text-lg ${(gamePhase === 'loading' || gamePhase === 'finished') ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={gamePhase === 'loading' || gamePhase === 'finished'}
          >
              {gamePhase === 'answering' && awardedPlayerIdsThisRound.length === 0 && pendingAwardedPlayerIds.length === 0 ? 'Skip Question' : 'Next Question'}
          </button>
      </div>
    </div>
  );
}

export default QuizPage;