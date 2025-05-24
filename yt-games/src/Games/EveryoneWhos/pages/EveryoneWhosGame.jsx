import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import EveryoneWhosHeader from '../components/EveryoneWhosHeader';
import EveryoneWhosLoading from '../components/EveryoneWhosLoading';
import EveryoneWhosCardGrid from '../components/EveryoneWhosCardGrid';
import EveryoneWhosQuestionDisplay from '../components/EveryoneWhosQuestionDisplay';
import EveryoneWhosPlayerTally from '../components/EveryoneWhosPlayerTally';
import EveryoneWhosGameOver from '../components/EveryoneWhosGameOver';

// Import question data
import generalEWQuestions from '../data/general_ew_questions.json';
import experienceEWQuestions from '../data/experience_ew_questions.json';
import funnyEWQuestions from '../data/funny_ew_questions.json';
import ewFunnyAwkwardSituations from '../data/ew_funny_awkward_situations.json';
import ewFunnySillyHabits from '../data/ew_funny_silly_habits.json';
import ewFunnyWouldYouRatherStyle from '../data/ew_funny_would_you_rather_style.json';
import ewFunnyPetPeeves from '../data/ew_funny_pet_peeves.json';
import ewFunnyChildhoodMischief from '../data/ew_funny_childhood_mischief.json';
import ewFunnySocialBlunders from '../data/ew_funny_social_blunders.json';
import ewFunnyQuirkyTalents from '../data/ew_funny_quirky_talents.json';
import ewRelationshipsDatingApps from '../data/ew_relationships_dating_apps.json';
import ewRelationshipsFirstDates from '../data/ew_relationships_first_dates.json';
import ewRelationshipsLongTerm from '../data/ew_relationships_long_term.json';
import ewRelationshipsFriendships from '../data/ew_relationships_friendships.json';
import ewRelationshipsFamilyDynamics from '../data/ew_relationships_family_dynamics.json';
import ewRelationshipsBreakupsLight from '../data/ew_relationships_breakups_light.json';
import ewRelationshipsLoveLanguages from '../data/ew_relationships_love_languages.json';


const allQuestionDataSets = {
  "GeneralEveryoneWhos": generalEWQuestions,
  "ExperienceEveryoneWhos": experienceEWQuestions,
  "FunnyEveryoneWhos": funnyEWQuestions,
  "EwFunnyAwkwardSituations": ewFunnyAwkwardSituations,
  "EwFunnySillyHabits": ewFunnySillyHabits,
  "EwFunnyWouldYouRatherStyle": ewFunnyWouldYouRatherStyle,
  "EwFunnyPetPeeves": ewFunnyPetPeeves,
  "EwFunnyChildhoodMischief": ewFunnyChildhoodMischief,
  "EwFunnySocialBlunders": ewFunnySocialBlunders,
  "EwFunnyQuirkyTalents": ewFunnyQuirkyTalents,
  "EwRelationshipsDatingApps": ewRelationshipsDatingApps,
  "EwRelationshipsFirstDates": ewRelationshipsFirstDates,
  "EwRelationshipsLongTerm": ewRelationshipsLongTerm,
  "EwRelationshipsFriendships": ewRelationshipsFriendships,
  "EwRelationshipsFamilyDynamics": ewRelationshipsFamilyDynamics,
  "EwRelationshipsBreakupsLight": ewRelationshipsBreakupsLight,
  "EwRelationshipsLoveLanguages": ewRelationshipsLoveLanguages,
};

function EveryoneWhosGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const [gameConfig, setGameConfig] = useState(location.state?.gameConfig || null);
  const [players, setPlayers] = useState([]);
  const [gameCards, setGameCards] = useState([]); // { id, text, isRRated, revealed: false }
  const [currentCard, setCurrentCard] = useState(null);
  const [playerScores, setPlayerScores] = useState({}); // { playerId: score }
  const [gamePhase, setGamePhase] = useState('loading'); // 'loading', 'card_selection', 'question_active', 'game_over'
  const [isLoadingData, setIsLoadingData] = useState(true);

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
      navigate('/everyone-whos/setup');
      setGamePhase('game_over'); // Prevent further processing
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setPlayers(gameConfig.players || []);

    let allCombinedRawQuestions = [];
    (gameConfig.selectedCategories || []).forEach(categoryId => {
      if (allQuestionDataSets[categoryId]) {
        allCombinedRawQuestions = allCombinedRawQuestions.concat(
          allQuestionDataSets[categoryId].map(q => ({ ...q, sourceCategory: categoryId }))
        );
      } else {
        console.warn(`No question data found for category ID: ${categoryId}`);
      }
    });
    
    // Filter R-Rated questions if not confirmed during setup (assuming gameConfig.rRatedConfirmed exists)
    // This might be redundant if setup already filters categories based on confirmation.
    // if (gameConfig.rRatedConfirmed === false) { // Check if explicitly false or undefined
    //    allCombinedRawQuestions = allCombinedRawQuestions.filter(q => !q.isRRated);
    // }


    if (allCombinedRawQuestions.length === 0) {
      toast.error(`No questions found for the selected categories: ${gameConfig.selectedCategoryNames?.join(', ') || 'Unknown'}. Ending game.`);
      setGameCards([]);
      setGamePhase('game_over');
      setIsLoadingData(false);
      return;
    }

    const shuffledCombinedQuestions = [...allCombinedRawQuestions].sort(() => Math.random() - 0.5);
    const numCardsToPlay = Math.min(gameConfig.numberOfCards || 10, shuffledCombinedQuestions.length);

    if (numCardsToPlay < (gameConfig.numberOfCards || 10) && shuffledCombinedQuestions.length > 0) {
        toast.warn(`Only ${numCardsToPlay} questions available for the selected categories, less than ${gameConfig.numberOfCards} requested.`);
    }
    
    const finalGameCards = shuffledCombinedQuestions
      .slice(0, numCardsToPlay)
      .map((q, index) => ({
          id: q.id || `ewq-${index}`,
          text: q.text,
          isRRated: q.isRRated || false,
          revealed: false,
        }));

    setGameCards(finalGameCards);

    const initialScores = {};
    (gameConfig.players || []).forEach(player => {
      initialScores[player.id] = 0;
    });
    setPlayerScores(initialScores);

    if (finalGameCards.length === 0) {
       toast.error(`Not enough questions to start the game for the selected categories. Please select more or try different categories.`);
       setGamePhase('game_over');
    } else {
       setGamePhase('card_selection');
    }
    setIsLoadingData(false);

  }, [gameConfig, navigate]);

  const handleCardSelect = useCallback((cardId) => {
    if (!isMountedRef.current || gamePhase !== 'card_selection') return;

    const card = gameCards.find(q => q.id === cardId);
    if (card && !card.revealed) {
      setCurrentCard(card);
      setGamePhase('question_active');
    } else if (card && card.revealed) {
      toast.info("This card has already been played.");
    }
  }, [gameCards, gamePhase]);

  const handleRandomCardSelect = useCallback(() => {
    if (!isMountedRef.current || gamePhase !== 'card_selection') return;

    const unrevealedCards = gameCards.filter(card => !card.revealed);
    if (unrevealedCards.length > 0) {
      const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
      handleCardSelect(randomCard.id);
    } else {
      toast.info("All cards have been played!");
      setGamePhase('game_over');
    }
  }, [gameCards, gamePhase, handleCardSelect]);

  const handleTallySubmit = useCallback((selectedPlayerIds) => {
    if (!isMountedRef.current || !currentCard) return;

    setPlayerScores(prevScores => {
      const newScores = { ...prevScores };
      selectedPlayerIds.forEach(playerId => {
        if (newScores[playerId] !== undefined) {
          newScores[playerId] += 1;
        }
      });
      return newScores;
    });

    const currentCardId = currentCard.id;
    setGameCards(prevCards =>
      prevCards.map(card =>
        card.id === currentCardId ? { ...card, revealed: true } : card
      )
    );
    
    toast.success("Scores tallied for this card!");
    setCurrentCard(null); // Important to set currentCard to null *before* checking allCardsRevealed with the updated gameCards state

    // Check if all cards are revealed based on the *next* state of gameCards
    // Need to use a functional update or check based on the card that was just revealed
    const allCardsNowRevealed = gameCards.map(card =>
        card.id === currentCardId ? { ...card, revealed: true } : card
      ).every(card => card.revealed);


    if (allCardsNowRevealed) {
      setGamePhase('game_over');
    } else {
      setGamePhase('card_selection');
    }
  }, [currentCard, gameCards]);


  const renderGameContent = () => {
    if (isLoadingData || gamePhase === 'loading') {
      return <EveryoneWhosLoading />;
    }
    
    if (gamePhase === 'card_selection') {
      return (
        <EveryoneWhosCardGrid
          cards={gameCards}
          onCardSelect={handleCardSelect}
          onRandomCardSelect={handleRandomCardSelect}
        />
      );
    }

    if (gamePhase === 'question_active' && currentCard) {
      return (
        <div className="space-y-6">
          <EveryoneWhosQuestionDisplay questionText={currentCard.text} />
          <EveryoneWhosPlayerTally
            players={players}
            // questionText={currentCard.text} // No longer needed here as it's in QuestionDisplay
            onSubmit={handleTallySubmit}
          />
        </div>
      );
    }

    if (gamePhase === 'game_over') {
      return (
        <EveryoneWhosGameOver
          gameConfig={gameConfig}
          players={players}
          playerScores={playerScores}
          onPlayAgain={() => navigate('/everyone-whos/setup')}
          onGoHome={() => navigate('/')}
        />
      );
    }
    return <p className="text-center text-gray-400">Something went wrong or game phase is unknown.</p>;
  };
  
  const revealedCardsCount = gameCards.filter(card => card.revealed).length;
  let currentCardNumberForDisplay = revealedCardsCount;
  if (gamePhase === 'question_active' && currentCard && !currentCard.revealed) {
    // If a card is active but not yet marked revealed (i.e., tally not submitted)
    currentCardNumberForDisplay = revealedCardsCount + 1;
  } else if (gamePhase === 'card_selection' && gameCards.length > 0 && revealedCardsCount < gameCards.length) {
    // If in card selection and not all cards are revealed, show next card number
     currentCardNumberForDisplay = revealedCardsCount + 1;
  }


  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <EveryoneWhosHeader
        gameConfig={gameConfig}
        gamePhase={gamePhase}
        currentCardNumber={currentCardNumberForDisplay}
        totalCards={gameCards.length > 0 ? gameCards.length : (gameConfig?.numberOfCards || 0)}
      />
      {renderGameContent()}
    </div>
  );
}

export default EveryoneWhosGame;