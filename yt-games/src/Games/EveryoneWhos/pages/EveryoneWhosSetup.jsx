import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout';
import Modal from '../../Utils/utils_components/Modal';
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition';
import CategorySelectionModal from '../../Utils/utils_components/CategorySelectionModal';
import SelectedCategoriesDisplay from '../../Utils/utils_setup/SelectedCategoriesDisplay';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

const CATEGORIES = [
  { id: "GeneralEveryoneWhos", name: "🤔 General Topic Questions", fileName: "general_ew_questions.json", isRRatedHint: false },
  { id: "ExperienceEveryoneWhos", name: "✈️ Life Experiences", fileName: "experience_ew_questions.json", isRRatedHint: false },
  { id: "FunnyEveryoneWhos", name: "🤪 Funny & Quirky", fileName: "funny_ew_questions.json", isRRatedHint: false },
  { id: "EwFunnyAwkwardSituations", name: "😳 Funny: Awkward Situations", fileName: "ew_funny_awkward_situations.json", isRRatedHint: false },
  { id: "EwFunnySillyHabits", name: "🐒 Funny: Silly Habits", fileName: "ew_funny_silly_habits.json", isRRatedHint: false },
  { id: "EwFunnyWouldYouRatherStyle", name: "🤷 Funny: Would You Rather...", fileName: "ew_funny_would_you_rather_style.json", isRRatedHint: false },
  { id: "EwFunnyPetPeeves", name: "😤 Funny: Pet Peeves", fileName: "ew_funny_pet_peeves.json", isRRatedHint: false },
  { id: "EwFunnyChildhoodMischief", name: "🧸 Funny: Childhood Mischief", fileName: "ew_funny_childhood_mischief.json", isRRatedHint: false },
  { id: "EwFunnySocialBlunders", name: "🤦 Funny: Social Blunders", fileName: "ew_funny_social_blunders.json", isRRatedHint: false },
  { id: "EwFunnyQuirkyTalents", name: "✨ Funny: Quirky Talents", fileName: "ew_funny_quirky_talents.json", isRRatedHint: false },
  { id: "EwRelationshipsDatingApps", name: "📱 Relationships: Dating Apps", fileName: "ew_relationships_dating_apps.json", isRRatedHint: true },
  { id: "EwRelationshipsFirstDates", name: "🥂 Relationships: First Dates", fileName: "ew_relationships_first_dates.json", isRRatedHint: true },
  { id: "EwRelationshipsLongTerm", name: "💖 Relationships: Long Term", fileName: "ew_relationships_long_term.json", isRRatedHint: false },
  { id: "EwRelationshipsFriendships", name: "🧑‍🤝‍🧑 Relationships: Friendships", fileName: "ew_relationships_friendships.json", isRRatedHint: false },
  { id: "EwRelationshipsFamilyDynamics", name: "👨‍👩‍👧‍👦 Relationships: Family Dynamics", fileName: "ew_relationships_family_dynamics.json", isRRatedHint: false },
  { id: "EwRelationshipsBreakupsLight", name: "💔 Relationships: Breakups (Lighthearted)", fileName: "ew_relationships_breakups_light.json", isRRatedHint: true },
  { id: "EwRelationshipsLoveLanguages", name: "💌 Relationships: Love Languages", fileName: "ew_relationships_love_languages.json", isRRatedHint: false },
];

const SESSION_STORAGE_KEY = 'everyoneWhosSetup_v1';

const MIN_CARDS = 5;
const MAX_CARDS_SETUP = 30; // Can be adjusted based on total questions available

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategories: [],
  rRatedModalConfirmed: false,
  numberOfCards: 10,
};

function EveryoneWhosSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [selectedCategories, setSelectedCategories] = useState(defaultState.selectedCategories);
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(defaultState.rRatedModalConfirmed);
  const [numberOfCards, setNumberOfCards] = useState(defaultState.numberOfCards);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionGameConfig, setTransitionGameConfig] = useState(null);
  const gameRoutePath = '/everyone-whos/play';

  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
        setSelectedCategories(parsedSettings.selectedCategories || defaultState.selectedCategories);
        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
        setNumberOfCards(parsedSettings.numberOfCards || defaultState.numberOfCards);
      }
    } catch (error) {
      console.error("Failed to load Everyone Who's settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      numPlayersUI,
      playerNames,
      selectedCategories,
      rRatedModalConfirmed,
      numberOfCards,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Everyone Who's settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategories, rRatedModalConfirmed, numberOfCards]);

  const hasSelectedRRatedCategory = useMemo(() => {
    return selectedCategories.some(catId => {
      const category = CATEGORIES.find(c => c.id === catId);
      return category && category.isRRatedHint;
    });
  }, [selectedCategories]);

  useEffect(() => {
    if (!hasSelectedRRatedCategory && rRatedModalConfirmed) {
      setRRatedModalConfirmed(false);
    }
    if (!hasSelectedRRatedCategory && showRRatedModal) {
        setShowRRatedModal(false);
    }
  }, [hasSelectedRRatedCategory, rRatedModalConfirmed, showRRatedModal]);


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

    if (!selectedCategories || selectedCategories.length === 0) {
      newErrors.category = 'Please select at least one question category.';
    }

    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
        newErrors.category = `Please confirm age restriction for selected R-rated categories.`;
        if (updateState && !showRRatedModal) setShowRRatedModal(true);
    }

    if (!numberOfCards || numberOfCards < MIN_CARDS || numberOfCards > MAX_CARDS_SETUP) {
      newErrors.numberOfCards = `Number of cards must be between ${MIN_CARDS} and ${MAX_CARDS_SETUP}.`;
    } else if (!Number.isInteger(numberOfCards)) {
      newErrors.numberOfCards = 'Number of cards must be a whole number.';
    }

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, selectedCategories, rRatedModalConfirmed, showRRatedModal, numberOfCards, hasSelectedRRatedCategory]);

  const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    if (errors.playerNames && errors.playerNames[index]) {
      const updatedPlayerErrors = [...(errors.playerNames || [])];
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

  const handleOpenCategoryModal = () => setIsCategoryModalOpen(true);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

  const handleConfirmCategorySelection = (newlySelectedIds) => {
    setSelectedCategories(newlySelectedIds);
    setIsCategoryModalOpen(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    const newlySelectedRRated = newlySelectedIds.some(catId => {
        const category = CATEGORIES.find(c => c.id === catId);
        return category && category.isRRatedHint;
    });

    if (newlySelectedRRated && !rRatedModalConfirmed) {
      setShowRRatedModal(true);
    } else if (!newlySelectedRRated && showRRatedModal) {
      setShowRRatedModal(false);
    }
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalCancel = () => {
    const rRatedCategoryIds = CATEGORIES.filter(c => c.isRRatedHint).map(c => c.id);
    setSelectedCategories(prev => prev.filter(id => !rRatedCategoryIds.includes(id)));
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    toast.info("R-Rated categories deselected due to age confirmation cancellation.");
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }
    
    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
        if (!showRRatedModal) setShowRRatedModal(true);
        toast.warn(`Please confirm age restriction for selected R-rated categories.`);
        return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
    }));

    const selectedCategoryObjects = CATEGORIES.filter(cat => selectedCategories.includes(cat.id));

    const gameConfig = {
      players: activePlayers,
      selectedCategories: selectedCategoryObjects.map(cat => cat.id),
      selectedCategoryNames: selectedCategoryObjects.map(cat => cat.name),
      numberOfCards,
      // Pass rRatedModalConfirmed if needed by game logic to filter questions again (though ideally setup handles this)
      // rRatedConfirmed: rRatedModalConfirmed
    };

    setTransitionGameConfig(gameConfig);
    setIsTransitioning(true);
  }, [validateForm, selectedCategories, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, numberOfCards, hasSelectedRRatedCategory]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategories(defaultState.selectedCategories);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
    setNumberOfCards(defaultState.numberOfCards);
    setShowRRatedModal(false);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    
    let rRatedCheckPassed = true;
    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
      rRatedCheckPassed = false;
    }
    const categoriesSelected = selectedCategories.length > 0;
    const numCardsValid = numberOfCards >= MIN_CARDS && numberOfCards <= MAX_CARDS_SETUP && Number.isInteger(numberOfCards);

    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && categoriesSelected && rRatedCheckPassed && numCardsValid;
  }, [validateForm, playerNames, numPlayersUI, selectedCategories, rRatedModalConfirmed, numberOfCards, hasSelectedRRatedCategory]);

  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading || isTransitioning,
    isValidToStart: isTransitioning ? false : isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isTransitioning, isValidToStartValue]);
  
  const registerNavbarActionsRef = useRef(registerNavbarActions);
  const unregisterNavbarActionsRef = useRef(unregisterNavbarActions);

  useEffect(() => {
    registerNavbarActionsRef.current = registerNavbarActions;
    unregisterNavbarActionsRef.current = unregisterNavbarActions;
  }, [registerNavbarActions, unregisterNavbarActions]);

  useEffect(() => {
    const currentRegister = registerNavbarActionsRef.current;
    if (currentRegister) {
      currentRegister(navbarConfig);
    }
    return () => {
      const currentUnregister = unregisterNavbarActionsRef.current;
      if (currentUnregister) {
        currentUnregister();
      }
    };
  }, [navbarConfig]);

  const handleTransitionComplete = useCallback(() => {
    if (transitionGameConfig && gameRoutePath) {
      navigate(gameRoutePath, { state: { gameConfig: transitionGameConfig } });
    } else {
      console.error("EveryoneWhosSetup: Transition complete but game config or path missing.");
      toast.error("Failed to start game. Please try again.");
      setIsTransitioning(false);
      setIsLoading(false);
    }
  }, [navigate, transitionGameConfig, gameRoutePath]);

  if (isTransitioning) {
    return (
      <GameStartTransition
        gameName="Everyone Who's..."
        onComplete={handleTransitionComplete}
      />
    );
  }

  return (
    <SetupPageLayout>
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">1. Players</h3>
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

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Question Categories</h3>
        <SelectedCategoriesDisplay
          selectedCategories={selectedCategories}
          allCategoriesData={CATEGORIES}
          onManageCategoriesClick={handleOpenCategoryModal}
          placeholderText="No categories selected. Click to choose."
          buttonText="Select Categories"
          error={errors.category}
          disabled={isLoading}
          isLoading={isLoading}
          containerClass="bg-gray-700 p-0 border-none"
          labelClass="hidden"
          tagsContainerClass="flex flex-wrap gap-2 mb-3 min-h-[2.5rem] items-center"
          tagClass="px-3 py-1.5 bg-primary text-white text-sm rounded-md"
          placeholderClass="text-gray-400 italic mb-3 px-1"
          buttonClass="w-full px-4 py-2 bg-primary-dark hover:bg-primary text-white font-semibold rounded-md transition-colors disabled:opacity-50"
        />
      </div>
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        onConfirm={handleConfirmCategorySelection}
        title="Select Question Categories"
        allCategories={CATEGORIES}
        initiallySelectedCategories={selectedCategories}
        allowMultiple={true}
      />

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Number of Cards</h3>
        <StyledNumberInput
          id="number-of-cards"
          label={`Select how many cards for the game (Min: ${MIN_CARDS}, Max: ${MAX_CARDS_SETUP}):`}
          value={numberOfCards}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
               setNumberOfCards(MIN_CARDS);
            } else if (val < MIN_CARDS) {
               setNumberOfCards(MIN_CARDS);
            } else if (val > MAX_CARDS_SETUP) {
               setNumberOfCards(MAX_CARDS_SETUP);
            } else {
               setNumberOfCards(val);
            }
            if (errors.numberOfCards) setErrors(prev => ({ ...prev, numberOfCards: null }));
          }}
          min={MIN_CARDS}
          max={MAX_CARDS_SETUP}
          step="1"
          disabled={isLoading}
          error={errors.numberOfCards}
          containerClassName="flex flex-col items-start w-full sm:w-1/2"
          labelClassName="mb-2 text-sm font-medium text-gray-200"
          inputClassName="text-center"
        />
      </div>

      <Modal
        isOpen={showRRatedModal && hasSelectedRRatedCategory && !rRatedModalConfirmed}
        onClose={handleRRatedModalCancel}
        title="Age Restriction Warning!"
        titleColor="text-yellow-400"
        footerContent={
          <>
            <button onClick={handleRRatedModalCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">
              Cancel & Deselect R-Rated
            </button>
            <button onClick={handleRRatedModalConfirm} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md transition-colors">
              Confirm (All Players 18+)
            </button>
          </>
        }
      >
        <p>
          One or more selected categories may contain content intended for players aged 18 and above.
          Please ensure all players meet this age requirement before proceeding.
        </p>
      </Modal>
    </SetupPageLayout>
  );
}

export default EveryoneWhosSetup;