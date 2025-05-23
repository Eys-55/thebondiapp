import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Import new question data directly
import icebreakersQuestions from '../data/icebreakers_questions.json';
import deepDiveQuestions from '../data/deep_dive_questions.json';
import hypotheticalsQuestions from '../data/hypotheticals_questions.json';
import favoritesPreferencesQuestions from '../data/favorites_preferences_questions.json';
import childhoodMemoriesQuestions from '../data/childhood_memories_questions.json';
import travelAdventureQuestions from '../data/travel_adventure_questions.json';
import popCultureQuestions from '../data/pop_culture_questions.json';
import workAmbitionsQuestions from '../data/work_ambitions_questions.json';
import funnyQuirkyQuestions from '../data/funny_quirky_questions.json';
import philosophicalMusingsQuestions from '../data/philosophical_musings_questions.json';
import relationshipReflectionsGeneralQuestions from '../data/relationship_reflections_general_questions.json';
import spicyDaringQuestions from '../data/spicy_daring_questions.json';
import selfReflectionQuestions from '../data/self_reflection_questions.json';
import creativeCornerQuestions from '../data/creative_corner_questions.json';
import futureGazingQuestions from '../data/future_gazing_questions.json';

// Import components
import GetToKnowHeader from '../components/GetToKnowHeader';
import GetToKnowLoading from '../components/GetToKnowLoading';
import GetToKnowPlayerTurn from '../components/GetToKnowPlayerTurn';
import GetToKnowQuestionDisplay from '../components/GetToKnowQuestionDisplay';
import GetToKnowGameOver from '../components/GetToKnowGameOver';

// Helper to map category IDs to their data
const allQuestionDataSets = {
  "Icebreakers": icebreakersQuestions,
  "DeepDive": deepDiveQuestions,
  "Hypotheticals": hypotheticalsQuestions,
  "FavoritesPreferences": favoritesPreferencesQuestions,
  "ChildhoodMemories": childhoodMemoriesQuestions,
  "TravelAdventure": travelAdventureQuestions,
  "PopCulture": popCultureQuestions,
  "WorkAmbitions": workAmbitionsQuestions,
  "FunnyQuirky": funnyQuirkyQuestions,
  "PhilosophicalMusings": philosophicalMusingsQuestions,
  "RelationshipReflections": relationshipReflectionsGeneralQuestions,
  "SpicyDaring": spicyDaringQuestions,
  "SelfReflection": selfReflectionQuestions,
  "CreativeCorner": creativeCornerQuestions,
  "FutureGazing": futureGazingQuestions,
};


function GetToKnowGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const [gameConfig, setGameConfig] = useState(location.state?.gameConfig || null);
  const [players, setPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [gameQuestions, setGameQuestions] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [shuffledPlayersForRound, setShuffledPlayersForRound] = useState([]);
  const [turnsTakenInRandomRound, setTurnsTakenInRandomRound] = useState(0);
  const [gamePhase, setGamePhase] = useState('loading');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!gameConfig) {
      toast.error("Game configuration is missing. Redirecting to setup.");
      navigate('/get-to-know/setup');
      setGamePhase('game_ended');
      return;
    }
    
    const configPlayers = gameConfig.players || [];
    setPlayers(configPlayers);

    const selectedCategoryIds = gameConfig.selectedCategories || [];
    if (selectedCategoryIds.length === 0) {
        toast.error("No categories selected for the game. Redirecting to setup.");
        navigate('/get-to-know/setup');
        setGamePhase('game_ended');
        return;
    }

    let allCombinedRawQuestions = [];
    selectedCategoryIds.forEach(categoryId => {
      if (allQuestionDataSets[categoryId]) {
        allCombinedRawQuestions = allCombinedRawQuestions.concat(
          allQuestionDataSets[categoryId].map(q => ({ ...q, sourceCategory: categoryId })) // Optionally tag source
        );
      } else {
        console.warn(`No question data found for category ID: ${categoryId}`);
      }
    });

    if (allCombinedRawQuestions.length === 0) {
      toast.error(`No questions found for the selected categories: ${gameConfig.selectedCategoryNames?.join(', ') || 'Unknown'}. Ending game.`);
      setGamePhase('game_ended');
      return;
    }

    const shuffledCombinedQuestions = [...allCombinedRawQuestions].sort(() => Math.random() - 0.5);

    const numQs = Math.min(gameConfig.numberOfQuestions || 15, shuffledCombinedQuestions.length);
    if (numQs < (gameConfig.numberOfQuestions || 15) && shuffledCombinedQuestions.length > 0) {
        toast.warn(`Only ${numQs} questions available for the selected categories, less than ${gameConfig.numberOfQuestions} requested.`);
    }
    
    const finalGameQuestions = shuffledCombinedQuestions
      .slice(0, numQs)
      .map((q, index) => ({
          id: `q-${index}`,
          text: q.text,
          isRRated: q.isRRated,
          revealed: false
        }));
    
    setGameQuestions(finalGameQuestions);

    if (finalGameQuestions.length === 0) {
       toast.error(`Not enough questions to start the game for the selected categories. Please select more or try different categories.`);
       setGamePhase('game_ended');
       return;
    }

    setCurrentPlayerIndex(0);
    setTurnsTakenInRandomRound(0);
    if (gameConfig.turnProgression === 'random' && configPlayers.length > 0) {
      setShuffledPlayersForRound([...configPlayers].sort(() => Math.random() - 0.5));
    } else {
      setShuffledPlayersForRound([...configPlayers]);
    }

    setGamePhase('player_turn');

  }, [gameConfig, navigate]);


  const getCurrentPlayer = useCallback(() => {
    const playerList = gameConfig?.turnProgression === 'random' ? shuffledPlayersForRound : players;
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
    let currentTurnsTaken = turnsTakenInRandomRound;
    let currentShuffledPlayers = [...shuffledPlayersForRound];

    if (players.length > 0) {
       if (gameConfig.turnProgression === 'random') {
           currentTurnsTaken++;
           if (currentTurnsTaken >= players.length) {
               currentShuffledPlayers = [...players].sort(() => Math.random() - 0.5);
               setShuffledPlayersForRound(currentShuffledPlayers);
               nextPlayerIndex = 0;
               currentTurnsTaken = 0;
               toast.info("Next round! Player order re-shuffled.");
           } else {
               nextPlayerIndex = (currentPlayerIndex + 1) % currentShuffledPlayers.length;
           }
       } else { // Sequential
           nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
           if (nextPlayerIndex === 0) {
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
    return null;
  };

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