import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  collection,
  addDoc,
  runTransaction,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
// Import concept data
import { concepts } from '../data/concepts.js';
// Import question generators
import { generateMultipleChoice, generateTrueFalse, generateIdentification } from './questionGenerator.js';

// --- Helper Functions ---

// Gets all concepts belonging to the specified categories.
const getConceptsByCategory = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }
  // Ensure case-insensitive matching if needed, though current IDs are lowercase
  const lowerCaseCategories = categories.map(cat => cat.toLowerCase());
  return concepts.filter(concept => lowerCaseCategories.includes(concept.category.toLowerCase()));
};

const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

// --- Game Creation ---

/**
 * Generates a list of formatted quiz questions based on game config,
 * respecting allowed question types and using dynamic distractors.
 * @param {object} config - The game configuration object, including `allowedQuestionTypes`.
 * @returns {Array<object>} An array of formatted question objects.
 */
 // Export this function so it can be used by SinglePlayerQuiz
 export const generateQuestions = (config) => {
 const { selectedCategories, numQuestions, allowedQuestionTypes = ['mc', 'tf'] } = config; // Default to allow both if not specified
 console.log(`Generating ${numQuestions} questions for categories: ${selectedCategories.join(', ')}. Allowed types: ${allowedQuestionTypes.join(', ')}`);

    // 1. Get all relevant concepts
    const conceptPool = getConceptsByCategory(selectedCategories);
    console.log(`Found ${conceptPool.length} concepts in selected categories.`);

    if (conceptPool.length === 0) {
        console.error("No concepts found for the selected categories.");
        throw new Error("No questions available for the selected categories. Please select different categories.");
    }

    // 2. Shuffle concepts
    const shuffledConcepts = shuffleArray([...conceptPool]);

    // 3. Generate formatted questions from selected concepts until numQuestions is reached
    const generatedQuestions = [];
    let conceptsConsidered = 0;

    while (generatedQuestions.length < numQuestions && conceptsConsidered < shuffledConcepts.length) {
        const concept = shuffledConcepts[conceptsConsidered];
        conceptsConsidered++;

        const possibleGenerators = [];

        // Check if Multiple Choice is possible AND allowed
        if (allowedQuestionTypes.includes('mc')) {
            // MC generation now depends on finding distractors dynamically,
            // so we check that inside the generator. We assume it *might* be possible.
             possibleGenerators.push(generateMultipleChoice);
        }
        // Check if True/False is possible AND allowed
        if (allowedQuestionTypes.includes('tf') &&
            concept.trueFalseStatement?.true &&
            concept.trueFalseStatement?.falseTemplate) {
            // TF generation also needs distractors dynamically now.
            possibleGenerators.push(generateTrueFalse);
        }
        // Check if Identification is possible AND allowed
        // Identification is generally possible if there's a correctValue and subject/attribute
        if (allowedQuestionTypes.includes('id') && concept.correctValue && (concept.subject || concept.attribute)) {
             possibleGenerators.push(generateIdentification);
        }


        if (possibleGenerators.length === 0) {
            // console.warn(`Concept ${concept.id} cannot generate any *allowed* question type. Skipping.`);
            continue; // Skip this concept
        }

        // Randomly choose an allowed generator function
        const chosenGenerator = possibleGenerators[Math.floor(Math.random() * possibleGenerators.length)];

        // Call the generator, passing the concept AND the pool for distractor lookup
        const generatedQuestion = chosenGenerator(concept, conceptPool);

        if (generatedQuestion) {
            generatedQuestions.push(generatedQuestion);
        } else {
             console.warn(`Generator failed for concept ${concept.id} (Type: ${chosenGenerator.name}). Skipping.`);
        }
    }


    if (generatedQuestions.length < numQuestions) {
        console.warn(`Requested ${numQuestions} questions, but could only generate ${generatedQuestions.length} valid questions from ${conceptsConsidered} considered concepts with allowed types.`);
    }
     if (generatedQuestions.length === 0) {
         throw new Error("Failed to generate any questions for the selected configuration and allowed types.");
     }

    console.log(`Successfully generated ${generatedQuestions.length} questions.`);

     // Add question numbers
     return generatedQuestions.map((q, index) => ({ ...q, questionNumber: index + 1 }));
};


/**
 * Creates a new game document in Firestore.
 * @param {string} hostName - The name of the host creating the game.
 * @param {object} gameConfig - The configuration object for the game settings (must include allowedQuestionTypes).
 * @returns {Promise<{gameId: string, hostId: string}>} The new game ID and host ID.
 */
export const createGame = async (hostName, gameConfig) => {
  console.log("Attempting to create game with config:", gameConfig);
  if (!hostName || !gameConfig) {
    throw new Error("Host name and game configuration are required.");
  }
   // Validate config structure (basic check, more detailed in rules)
   if (!gameConfig.selectedCategories || gameConfig.selectedCategories.length === 0 ||
       !gameConfig.numQuestions || gameConfig.numQuestions <= 0 ||
       !gameConfig.timePerQuestion || gameConfig.timePerQuestion < 2 ||
       !gameConfig.numLives || gameConfig.numLives <= 0 ||
       !gameConfig.cooldownSeconds || gameConfig.cooldownSeconds < 1 ||
       !gameConfig.gameMode ||
       !gameConfig.allowedQuestionTypes || gameConfig.allowedQuestionTypes.length === 0) { // Added check for allowed types
       console.error("Invalid game configuration provided:", gameConfig);
       throw new Error("Invalid game configuration provided.");
   }


  try {
    // Generate the questions based on the config *before* creating the document
    const questions = generateQuestions(gameConfig);
    if (questions.length === 0) {
        throw new Error("Failed to generate any questions for the selected configuration.");
    }
     // Adjust numQuestions in config if fewer were generated
     const finalGameConfig = questions.length < gameConfig.numQuestions
         ? { ...gameConfig, numQuestions: questions.length }
         : gameConfig;


    const hostId = `host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newGameData = {
      hostId: hostId,
      config: finalGameConfig, // Use potentially adjusted config
      status: 'waiting',
      players: {
        [hostId]: {
          id: hostId,
          name: hostName,
          isHost: true,
          lives: finalGameConfig.numLives,
          score: 0,
          joinedAt: serverTimestamp(),
          currentAnswer: null,
          answeredCorrectlyFirst: null,
          answerTimestamp: null,
        },
      },
      questions: questions, // Store the generated questions
      currentQuestionIndex: -1,
      currentQuestionStartTime: null,
      lastQuestionResults: null,
      createdAt: serverTimestamp(),
    };

    const gameCollectionRef = collection(db, 'games');
    const gameDocRef = await addDoc(gameCollectionRef, newGameData);

    console.log(`Game created successfully with ID: ${gameDocRef.id} by host ${hostId}`);
    return { gameId: gameDocRef.id, hostId: hostId };

  } catch (error) {
    console.error("Error creating game:", error);
    throw new Error(`Failed to create game: ${error.message}`);
  }
};


// --- Player Management --- (addPlayerToGame, leaveGame remain the same)

/**
 * Adds a player to an existing game using a transaction.
 * @param {string} gameId - The ID of the game to join.
 * @param {string} playerName - The name of the player joining.
 * @returns {Promise<{playerId: string}>} The ID assigned to the new player.
 */
export const addPlayerToGame = async (gameId, playerName) => {
  console.log(`Attempting to add player "${playerName}" to game ${gameId}`);
  if (!gameId || !playerName) {
    throw new Error("Game ID and player name are required.");
  }
  if (playerName.length > 20) {
      throw new Error("Player name cannot exceed 20 characters.");
  }

  const gameDocRef = doc(db, 'games', gameId);
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameDocRef);

      if (!gameDoc.exists()) {
        throw new Error("Game not found. Please check the Game ID.");
      }

      const gameData = gameDoc.data();

      if (gameData.status !== 'waiting') {
        throw new Error(`Cannot join game: Game is already ${gameData.status}.`);
      }

      const lowerCasePlayerName = playerName.toLowerCase();
      const existingPlayers = Object.values(gameData.players || {});
      if (existingPlayers.some(p => p.name.toLowerCase() === lowerCasePlayerName)) {
        throw new Error(`Player name "${playerName}" is already taken in this lobby.`);
      }

      const newPlayerData = {
        id: playerId,
        name: playerName,
        isHost: false,
        lives: gameData.config?.numLives || 3,
        score: 0,
        joinedAt: serverTimestamp(),
        currentAnswer: null,
        answeredCorrectlyFirst: null,
        answerTimestamp: null,
      };

      transaction.update(gameDocRef, {
        [`players.${playerId}`]: newPlayerData
      });
    });

    console.log(`Player ${playerName} (${playerId}) successfully added to game ${gameId}`);
    return { playerId: playerId };

  } catch (error) {
    console.error(`Error adding player ${playerName} to game ${gameId}:`, error);
    throw error;
  }
};


/**
 * Removes a player from a game. If the host leaves, assigns a new host or updates status.
 * @param {string} gameId - The ID of the game.
 * @param {string} userIdToLeave - The ID of the player or host leaving.
 */
export const leaveGame = async (gameId, userIdToLeave) => {
    console.log(`User ${userIdToLeave} attempting to leave game ${gameId}`);
    if (!gameId || !userIdToLeave) {
        throw new Error("Game ID and User ID are required to leave.");
    }

    const gameDocRef = doc(db, 'games', gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) {
                console.warn(`Leave game failed: Game ${gameId} not found.`);
                throw new Error("Game not found.");
            }

            const gameData = gameDoc.data();
            const players = gameData.players || {};
            const leavingPlayer = players[userIdToLeave];

            if (!leavingPlayer) {
                console.warn(`User ${userIdToLeave} not found in game ${gameId}. Allowing leave anyway.`);
                return;
            }

            const updates = {
                [`players.${userIdToLeave}`]: deleteField()
            };

            const remainingPlayerIds = Object.keys(players).filter(id => id !== userIdToLeave);

            if (leavingPlayer.isHost) {
                console.log(`Host ${userIdToLeave} is leaving game ${gameId}.`);
                if (remainingPlayerIds.length > 0) {
                    const newHostId = remainingPlayerIds[0]; // Simple assignment
                    updates.hostId = newHostId;
                    updates[`players.${newHostId}.isHost`] = true;
                    console.log(`New host assigned: ${newHostId}`);
                } else {
                    updates.status = 'abandoned';
                    updates.hostId = null;
                    console.log(`Host left, no players remaining. Setting status to abandoned.`);
                }
            }

            transaction.update(gameDocRef, updates);
            console.log(`Successfully processed leave for user ${userIdToLeave} in game ${gameId}.`);
        });
    } catch (error) {
        console.error(`Error processing leave for user ${userIdToLeave} in game ${gameId}:`, error);
        throw new Error(`Failed to update game state on leave: ${error.message}`);
    }
};


// --- Game State Management --- (listenToGame, startGame, submitAnswer, advanceToResultsState, moveToNextQuestion remain largely the same)
// Note: The logic within advanceToResultsState for calculating scores/lives doesn't need to change significantly
// as it operates on the already generated question's correctAnswer.

/**
 * Listens for real-time updates to a specific game document.
 * @param {string} gameId - The ID of the game to listen to.
 * @param {function} callback - Function to call with game data (or null if not found) and error.
 * @returns {function} Unsubscribe function.
 */
export const listenToGame = (gameId, callback) => {
  if (!gameId) {
    console.error("listenToGame called without gameId");
    callback(null, new Error("Game ID is required to listen for updates."));
    return () => {};
  }
  const gameDocRef = doc(db, 'games', gameId);
  console.log(`Setting up listener for game: ${gameId}`);

  const unsubscribe = onSnapshot(gameDocRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const gameData = docSnapshot.data();
        // Convert Timestamps
        if (gameData.createdAt instanceof Timestamp) {
            gameData.createdAt = gameData.createdAt.toDate();
        }
         if (gameData.currentQuestionStartTime instanceof Timestamp) {
            gameData.currentQuestionStartTime = gameData.currentQuestionStartTime.toDate();
        }
        callback(gameData, null);
      } else {
        console.log(`Listener update: Game ${gameId} not found.`);
        callback(null, null);
      }
    },
    (error) => {
      console.error(`Error listening to game ${gameId}:`, error);
      callback(null, error);
    }
  );

  return unsubscribe;
};

/**
 * Starts the game by updating its status and setting the first question index.
 * (Should only be called by the host).
 * @param {string} gameId - The ID of the game.
 * @param {string} hostId - The ID of the host initiating the start.
 */
export const startGame = async (gameId, hostId) => {
    console.log(`Host ${hostId} attempting to start game ${gameId}`);
    if (!gameId || !hostId) {
        throw new Error("Game ID and Host ID are required to start the game.");
    }

    const gameDocRef = doc(db, 'games', gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Game not found.");

            const gameData = gameDoc.data();

            if (gameData.hostId !== hostId) throw new Error("Only the host can start the game.");
            if (gameData.status !== 'waiting') throw new Error(`Game cannot be started, status is already '${gameData.status}'.`);
            if (!gameData.players || Object.keys(gameData.players).length < 1) console.warn(`Starting game ${gameId} with only the host.`);
            if (!gameData.questions || gameData.questions.length === 0) throw new Error("Cannot start game: No questions found.");

            const updates = {
                status: 'playing',
                currentQuestionIndex: 0,
                currentQuestionStartTime: serverTimestamp(),
                lastQuestionResults: null,
            };

            const initialLives = gameData.config?.numLives || 3;
            Object.keys(gameData.players).forEach(pId => {
                updates[`players.${pId}.score`] = 0;
                updates[`players.${pId}.lives`] = initialLives;
                updates[`players.${pId}.currentAnswer`] = null;
                updates[`players.${pId}.answeredCorrectlyFirst`] = null;
                updates[`players.${pId}.answerTimestamp`] = null;
            });

            transaction.update(gameDocRef, updates);
            console.log(`Game ${gameId} successfully started by host ${hostId}.`);
        });
    } catch (error) {
        console.error(`Error starting game ${gameId}:`, error);
        throw new Error(`Failed to start game: ${error.message}`);
    }
};


/**
 * Submits a player's answer for the current question.
 * @param {string} gameId - The ID of the game.
 * @param {string} playerId - The ID of the player submitting the answer.
 * @param {number} questionIndex - The index of the question being answered.
 * @param {string} answer - The selected answer option.
 */
export const submitAnswer = async (gameId, playerId, questionIndex, answer) => {
    console.log(`Player ${playerId} submitting answer "${answer}" for Q${questionIndex} in game ${gameId}`);
    if (!gameId || !playerId || questionIndex === undefined || questionIndex < 0 || !answer) {
        throw new Error("Missing required parameters for submitting answer.");
    }

    const gameDocRef = doc(db, 'games', gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Game not found.");

            const gameData = gameDoc.data();

            if (gameData.status !== 'playing') throw new Error("Cannot submit answer: Game is not currently playing.");
            if (gameData.currentQuestionIndex !== questionIndex) throw new Error("Cannot submit answer: Incorrect question index.");

            const player = gameData.players?.[playerId];
            if (!player) throw new Error("Cannot submit answer: Player not found in game.");
            if (player.lives <= 0) throw new Error("Cannot submit answer: Player is eliminated.");
            if (player.currentAnswer !== null) throw new Error("Answer already submitted for this question.");

            const updates = {
                [`players.${playerId}.currentAnswer`]: answer,
                [`players.${playerId}.answerTimestamp`]: serverTimestamp(),
            };

            transaction.update(gameDocRef, updates);
            console.log(`Answer recorded for player ${playerId} in game ${gameId}.`);

            // Check if all active players have answered (optional immediate trigger)
            // const updatedPlayers = { ...gameData.players, [playerId]: { ...player, ...updates } };
            // const activePlayers = Object.values(updatedPlayers).filter(p => p.lives > 0);
            // const allAnswered = activePlayers.every(p => p.currentAnswer !== null);
            // if (allAnswered) { console.log(`All active players answered Q${questionIndex}.`); }
        });
    } catch (error) {
        console.error(`Error submitting answer for player ${playerId} in game ${gameId}:`, error);
        throw new Error(`Failed to submit answer: ${error.message}`);
    }
};


/**
 * Calculates results, updates player scores/lives, and moves game to 'showing_results'.
 * (Should only be called by the host).
 * @param {string} gameId - The ID of the game.
 * @param {string} hostId - The ID of the host triggering the state change.
 */
export const advanceToResultsState = async (gameId, hostId) => {
    console.log(`Host ${hostId} attempting to advance game ${gameId} to results state.`);
     if (!gameId || !hostId) throw new Error("Game ID and Host ID are required.");

    const gameDocRef = doc(db, 'games', gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Game not found.");

            const gameData = gameDoc.data();

            if (gameData.hostId !== hostId) throw new Error("Only the host can advance the game state.");
            if (gameData.status !== 'playing') throw new Error(`Game is not in 'playing' state (current: ${gameData.status}).`);
            if (gameData.currentQuestionIndex < 0 || gameData.currentQuestionIndex >= gameData.questions.length) throw new Error("Invalid current question index.");

            const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
            if (!currentQuestion) throw new Error("Current question data not found.");

            const playerResults = {};
            const updates = {};
            const players = gameData.players || {};
            const gameMode = gameData.config?.gameMode || 'safe_if_correct';
            const baseScore = 10;
            // const timeLimit = gameData.config?.timePerQuestion || 10; // Needed only for time bonus

            let firstCorrectPlayerId = null;
            let firstCorrectTimestamp = null;

            if (gameMode === 'first_correct_wins') {
                Object.values(players).forEach(p => {
                    if (p.lives > 0 && p.currentAnswer === currentQuestion.correctAnswer && p.answerTimestamp) {
                         const answerTimeMs = p.answerTimestamp instanceof Timestamp ? p.answerTimestamp.toMillis() : new Date(p.answerTimestamp).getTime();
                         if (!firstCorrectTimestamp || answerTimeMs < firstCorrectTimestamp) {
                             firstCorrectTimestamp = answerTimeMs;
                             firstCorrectPlayerId = p.id;
                         }
                    }
                });
                 console.log(`First correct wins mode: First correct player ID is ${firstCorrectPlayerId}`);
            }

            Object.keys(players).forEach(pId => {
                const player = players[pId];
                if (player.lives <= 0) {
                    playerResults[pId] = { submittedAnswer: player.currentAnswer, wasCorrect: false, scoreChange: 0, lifeChange: 0, isFirstCorrect: false };
                    return;
                }

                const submittedAnswer = player.currentAnswer;
                const isCorrect = submittedAnswer === currentQuestion.correctAnswer;
                let scoreChange = 0;
                let lifeChange = 0;
                let isFirstCorrect = false;

                if (isCorrect) {
                    scoreChange = baseScore; // Basic score
                    if (gameMode === 'first_correct_wins') {
                        if (pId === firstCorrectPlayerId) isFirstCorrect = true;
                        else lifeChange = -1;
                    } // else safe_if_correct: lifeChange = 0;
                } else { // Incorrect or No Answer
                    if (gameMode === 'first_correct_wins') {
                        lifeChange = -1;
                    } else { // safe_if_correct
                        if (submittedAnswer !== null) lifeChange = -1; // Incorrect loses life
                        // else timeout: lifeChange = 0; // Timeout is safe
                    }
                }

                const newScore = (player.score || 0) + scoreChange;
                const newLives = Math.max(0, (player.lives || 0) + lifeChange);

                updates[`players.${pId}.score`] = newScore;
                updates[`players.${pId}.lives`] = newLives;

                playerResults[pId] = { submittedAnswer, wasCorrect: isCorrect, scoreChange, lifeChange, isFirstCorrect };
            });

            updates.status = 'showing_results';
            updates.currentQuestionStartTime = null;
            updates.lastQuestionResults = {
                questionIndex: gameData.currentQuestionIndex,
                correctAnswer: currentQuestion.correctAnswer,
                playerResults: playerResults,
            };

            transaction.update(gameDocRef, updates);
            console.log(`Game ${gameId} advanced to results state for Q${gameData.currentQuestionIndex}.`);
        });
    } catch (error) {
        console.error(`Error advancing game ${gameId} to results state:`, error);
        throw new Error(`Failed to advance game state: ${error.message}`);
    }
};


/**
 * Moves the game from 'showing_results' to the next question ('playing') or 'finished'.
 * (Should only be called by the host).
 * @param {string} gameId - The ID of the game.
 * @param {string} hostId - The ID of the host triggering the state change.
 */
export const moveToNextQuestion = async (gameId, hostId) => {
    console.log(`Host ${hostId} attempting to move game ${gameId} to next question/finish.`);
     if (!gameId || !hostId) throw new Error("Game ID and Host ID are required.");

    const gameDocRef = doc(db, 'games', gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Game not found.");

            const gameData = gameDoc.data();

            if (gameData.hostId !== hostId) throw new Error("Only the host can advance the game.");
            if (gameData.status !== 'showing_results') throw new Error(`Game is not in 'showing_results' state (current: ${gameData.status}).`);

            const currentQuestionIndex = gameData.currentQuestionIndex;
            const totalQuestions = gameData.questions.length;
            const players = gameData.players || {};
            const activePlayersExist = Object.values(players).some(p => p.lives > 0);
            const nextQuestionIndex = currentQuestionIndex + 1;

            let nextStatus = '';
            let finalQuestionIndex = -1;
            let nextStartTime = null;

            if (nextQuestionIndex < totalQuestions && activePlayersExist) {
                nextStatus = 'playing';
                finalQuestionIndex = nextQuestionIndex;
                nextStartTime = serverTimestamp();
                console.log(`Moving game ${gameId} to question ${finalQuestionIndex}.`);
            } else {
                nextStatus = 'finished';
                finalQuestionIndex = -1;
                nextStartTime = null;
                console.log(`Finishing game ${gameId}. Reason: ${activePlayersExist ? 'Last question reached' : 'No active players left'}.`);
            }

            const updates = {
                status: nextStatus,
                currentQuestionIndex: finalQuestionIndex,
                currentQuestionStartTime: nextStartTime,
                lastQuestionResults: null,
            };

            Object.keys(players).forEach(pId => {
                updates[`players.${pId}.currentAnswer`] = null;
                updates[`players.${pId}.answeredCorrectlyFirst`] = null;
                updates[`players.${pId}.answerTimestamp`] = null;
            });

            transaction.update(gameDocRef, updates);
        });
    } catch (error) {
        console.error(`Error moving game ${gameId} to next state:`, error);
        throw new Error(`Failed to move to next question/finish: ${error.message}`);
    }
};


// --- Utility ---

/**
 * Gets the current state of a game (single read).
 * @param {string} gameId - The ID of the game.
 * @returns {Promise<object|null>} Game data or null if not found.
 */
export const getGame = async (gameId) => {
  if (!gameId) {
    console.error("getGame called without gameId");
    return null;
  }
  const gameDocRef = doc(db, 'games', gameId);
  try {
    const docSnap = await getDoc(gameDocRef);
    if (docSnap.exists()) {
      console.log("Game data retrieved for:", gameId);
      return docSnap.data();
    } else {
      console.log("No such game document:", gameId);
      return null;
    }
  } catch (error) {
    console.error("Error getting game:", error);
    throw error;
  }
};