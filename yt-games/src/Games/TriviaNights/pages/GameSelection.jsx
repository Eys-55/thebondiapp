import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout'; // Import the layout
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition'; // Import transition component
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';
import CategorySelectionModal from '../../Utils/utils_components/CategorySelectionModal';
import SelectedCategoriesDisplay from '../../Utils/utils_setup/SelectedCategoriesDisplay';

// Updated categories based on new JSON files
const CATEGORIES = [
  { id: 'ancient_history', name: '📜 Ancient History' },
  { id: 'world_mythology', name: '🔱 World Mythology' },
  { id: 'famous_landmarks', name: '🏛️ Famous Landmarks' },
  { id: 'musical_instruments', name: '🎸 Musical Instruments' },
  { id: 'classic_literature', name: '📚 Classic Literature' },
  { id: 'space_exploration', name: '🚀 Space Exploration' },
  { id: 'world_cuisine', name: '🍲 World Cuisine' },
  { id: 'animal_kingdom', name: '🐾 Animal Kingdom' },
  { id: 'art_history', name: '🎨 Art History' },
  { id: 'inventions_discoveries', name: '💡 Inventions & Discoveries' },
  { id: 'sports_general', name: '⚽ Sports Trivia' },
  { id: 'movie_quotes', name: '🎬 Movie Quotes' },
  { id: 'video_game_lore', name: '🎮 Video Game Lore' },
  { id: 'computer_science_basics', name: '💻 CS Basics' },
  { id: 'logical_riddles', name: '🧠 Logical Riddles' },
];

const MAX_PLAYERS = 10; // Increased max players
const MIN_PLAYERS = 2; // Assuming a local multiplayer game needs at least 2 players
const SESSION_STORAGE_KEY = 'triviaNightsSetup';

// Define default state values for reset
const defaultState = {
  selectedCategories: [],
  numQuestions: 10,
  timePerQuestion: 10,
  questionFormat: 'show_mc', // 'show_mc' or 'open_ended'
  scoringRule: 'fastest_finger', // 'fastest_finger' or 'any_correct'
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
};

function GameSelection({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState(defaultState.selectedCategories);
  const [numQuestions, setNumQuestions] = useState(defaultState.numQuestions);
  const [timePerQuestion, setTimePerQuestion] = useState(defaultState.timePerQuestion);
  const [questionFormat, setQuestionFormat] = useState(defaultState.questionFormat);
  const [scoringRule, setScoringRule] = useState(defaultState.scoringRule);

  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // New state for transition
  const [transitionGameConfig, setTransitionGameConfig] = useState(null); // Store config and players for transition
  const gameRoutePath = '/trivia-nights/play'; // Define game route path

  // Load settings from session storage on mount
  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSelectedCategories(parsedSettings.selectedCategories || defaultState.selectedCategories);
        setNumQuestions(parsedSettings.numQuestions || defaultState.numQuestions);
        setTimePerQuestion(parsedSettings.timePerQuestion || defaultState.timePerQuestion);
        setQuestionFormat(parsedSettings.questionFormat || defaultState.questionFormat);
        setScoringRule(parsedSettings.scoringRule || defaultState.scoringRule);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        
        // Ensure playerNames array matches numPlayersUI
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
      }
    } catch (error) {
      console.error("Failed to load Trivia Nights settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  // Save settings to session storage when they change
  useEffect(() => {
    const settingsToSave = {
      selectedCategories,
      numQuestions,
      timePerQuestion,
      questionFormat,
      scoringRule,
      numPlayersUI,
      playerNames,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Trivia Nights settings to session storage:", error);
    }
  }, [selectedCategories, numQuestions, timePerQuestion, questionFormat, scoringRule, numPlayersUI, playerNames]);


  // --- Validation ---
  const validateForm = useCallback((updateState = true) => {
    const newErrors = {};
    const currentPlayersToValidate = playerNames.slice(0, numPlayersUI);
    currentPlayersToValidate.forEach((name, index) => {
        if (!name.trim()) {
            if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
            newErrors.playerNames[index] = `Player ${index + 1} name is required.`;
        } else if (name.trim().length > 20) {
            if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
            newErrors.playerNames[index] = `Player ${index + 1} name max 20 chars.`;
        }
    });
    if (newErrors.playerNames && !newErrors.playerNames.some(e => e)) {
        delete newErrors.playerNames;
    }

    if (selectedCategories.length === 0) newErrors.categories = 'Please select at least one category.';
    if (numQuestions <= 0 || numQuestions > 50) newErrors.numQuestions = 'Must be between 1 and 50.';
    if (timePerQuestion < 2 || timePerQuestion > 60) newErrors.timePerQuestion = 'Must be between 2 and 60 seconds.';
    
    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, selectedCategories, numQuestions, timePerQuestion]);

  // --- Event Handlers ---
   const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    // Clear specific error when user types
    if (errors.playerNames && errors.playerNames[index]) {
        const updatedPlayerErrors = [...errors.playerNames];
        updatedPlayerErrors[index] = null;
        setErrors(prev => ({ ...prev, playerNames: updatedPlayerErrors.some(e => e) ? updatedPlayerErrors : null }));
    }
  };

  const handleNumPlayersChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayersUI(count);
    const newPlayerNames = Array(count).fill('').map((_, i) => playerNames[i] || '');
    setPlayerNames(newPlayerNames);
    if (errors.playerNames) setErrors(prev => ({ ...prev, playerNames: null }));
  };

  const handleNumberInputChange = (setter, fieldName) => (event) => {
    setter(parseInt(event.target.value) || 0);
    if (errors[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: null }));
  };

  // const handleCategoryChange = (event) => { // Old handler
  //   const { value, checked } = event.target;
  //   setSelectedCategories((prev) =>
  //     checked ? [...prev, value] : prev.filter((cat) => cat !== value)
  //   );
  //   if (errors.categories) setErrors(prev => ({ ...prev, categories: null }));
  // };

  const handleOpenCategoryModal = () => setIsCategoryModalOpen(true);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

  const handleConfirmCategorySelection = (newlySelectedIds) => {
    setSelectedCategories(Array.isArray(newlySelectedIds) ? newlySelectedIds : []);
    setIsCategoryModalOpen(false);
    if (errors.categories) setErrors(prev => ({ ...prev, categories: null }));
  };

  const handleStartLocalMultiplayerGame = useCallback(() => {
    const formErrors = validateForm(true); // Validate and set errors
    if (Object.keys(formErrors).length > 0) {
        toast.warn("Please fix the errors in the form.");
        return;
    }

    setIsLoading(true);

    const gameConfig = {
        selectedCategories,
        numQuestions: Math.min(50, Math.max(1, numQuestions)),
        timePerQuestion: Math.min(60, Math.max(2, timePerQuestion)),
        questionFormat: questionFormat,
        scoringRule: scoringRule,
    };

    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
        id: crypto.randomUUID(),
        name: name.trim(),
        score: 0
    }));
    
    // Instead of navigating directly, set up for transition
    setTransitionGameConfig({ gameSettings: gameConfig, players: activePlayers });
    setIsTransitioning(true);
    // setIsLoading(true); // Keep form disabled
  }, [validateForm, selectedCategories, numQuestions, timePerQuestion, questionFormat, scoringRule, playerNames, numPlayersUI]);
  
  
  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSelectedCategories(defaultState.selectedCategories);
    setNumQuestions(defaultState.numQuestions);
    setTimePerQuestion(defaultState.timePerQuestion);
    setQuestionFormat(defaultState.questionFormat);
    setScoringRule(defaultState.scoringRule);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setErrors({}); // Clear errors
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false); // Don't set state
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled;
  }, [validateForm, playerNames, numPlayersUI]);

  useEffect(() => {
    if (registerNavbarActions) {
      registerNavbarActions({
        startHandler: handleStartLocalMultiplayerGame,
        resetHandler: handleResetSettings,
        isLoading: isLoading || isTransitioning, // Navbar loading during transition
        isValidToStart: isTransitioning ? false : checkValidity(), // Not valid to start again during transition
      });
    }
    return () => {
      if (unregisterNavbarActions) {
        unregisterNavbarActions();
      }
    };
  }, [
    registerNavbarActions, unregisterNavbarActions,
    handleStartLocalMultiplayerGame, handleResetSettings,
    isLoading, checkValidity,
    playerNames, numPlayersUI, selectedCategories, numQuestions, timePerQuestion, questionFormat, scoringRule, errors, isTransitioning
  ]);

  const handleTransitionComplete = useCallback(() => {
    if (transitionGameConfig && gameRoutePath) {
      navigate(gameRoutePath, { state: { gameConfig: transitionGameConfig.gameSettings, players: transitionGameConfig.players } });
    } else {
      console.error("TriviaNights/GameSelection: Transition complete but game config or path missing.");
      toast.error("Failed to start game. Please try again.");
      setIsTransitioning(false); // Revert to setup form
      setIsLoading(false);
    }
  }, [navigate, transitionGameConfig, gameRoutePath]);

  if (isTransitioning) {
    return (
      <GameStartTransition
        gameName="Trivia Nights"
        onComplete={handleTransitionComplete}
      />
    );
  }
  
  return (
    <SetupPageLayout title="Multiplayer Quiz Setup">
      {/* Player Setup Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-success-light border-b border-gray-600 pb-2">1. Player Setup</h3>
        <PlayerSetup
          minPlayers={MIN_PLAYERS}
          maxPlayers={MAX_PLAYERS}
          numPlayersUI={numPlayersUI}
          onNumPlayersChange={handleNumPlayersChange}
          playerNames={playerNames}
          onPlayerNameChange={handlePlayerNameChange}
          playerNameErrors={errors.playerNames}
          isLoading={isLoading}
        />
      </div>

      {/* Game Settings Section */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-info-light border-b border-gray-600 pb-2">2. Customize Your Quiz</h3>

        <div className="mb-4">
          <SelectedCategoriesDisplay
            label="Select Categories (At least one):"
            selectedCategories={selectedCategories}
            allCategoriesData={CATEGORIES}
            onManageCategoriesClick={handleOpenCategoryModal}
            error={errors.categories}
            disabled={isLoading}
            isLoading={isLoading}
            containerClass="bg-gray-700 p-3 rounded-md border border-gray-600" // Keep card style
            buttonText="Manage Categories"
          />
        </div>
        <CategorySelectionModal
          isOpen={isCategoryModalOpen}
          onClose={handleCloseCategoryModal}
          onConfirm={handleConfirmCategorySelection}
          title="Select Quiz Categories"
          allCategories={CATEGORIES}
          initiallySelectedCategories={selectedCategories}
          allowMultiple={true}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StyledNumberInput
            id="num-questions"
            label="Questions (1-50):"
            value={numQuestions}
            onChange={handleNumberInputChange(setNumQuestions, 'numQuestions')}
            min={1} max={50}
            disabled={isLoading}
            error={errors.numQuestions}
          />
          <StyledNumberInput
            id="time-limit"
            label="Time per Question (2-60s):"
            value={timePerQuestion}
            onChange={handleNumberInputChange(setTimePerQuestion, 'timePerQuestion')}
            min={2} max={60}
            disabled={isLoading}
            error={errors.timePerQuestion}
          />
        </div>

        <div className="mb-4">
          <GameOptionSelector
            label="Question Style:"
            options={[
              { id: 'show_mc', value: 'show_mc', name: 'Show Multiple Choice' },
              { id: 'open_ended', value: 'open_ended', name: 'Open Ended (No Choices Shown)' },
            ]}
            selectedOption={questionFormat}
            onOptionChange={(value) => setQuestionFormat(value)}
            type="radio"
            groupName="triviaQuestionFormat"
            isLoading={isLoading}
          />
        </div>

        {/* Scoring Rule Selection */}
        <div className="mb-4">
          <GameOptionSelector
            label="Scoring Rule:"
            options={[
              { id: 'fastest_finger', value: 'fastest_finger', name: 'One Winner' },
              { id: 'any_correct', value: 'any_correct', name: 'Multiple Winners' },
            ]}
            selectedOption={scoringRule}
            onOptionChange={(value) => setScoringRule(value)}
            type="radio"
            groupName="scoringRule"
            isLoading={isLoading}
          />
        </div>
      </div>
    </SetupPageLayout>
  );
}

export default GameSelection;