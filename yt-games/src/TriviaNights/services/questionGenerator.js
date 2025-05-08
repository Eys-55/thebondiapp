import { concepts } from '../data/concepts'; // Assuming concepts are needed directly or passed

/**
 * Shuffles array in place.
 * @param {Array} array items An array containing the items.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generates a specified number of unique quiz questions based on game configuration.
 *
 * @param {object} gameConfig - Configuration for the game.
 * @param {string[]} gameConfig.selectedCategories - Array of category IDs.
 * @param {number} gameConfig.numQuestions - Total number of questions to generate.
 * @param {boolean} gameConfig.includeChoices - Whether to generate multiple-choice questions or direct identification.
 * @param {object[]} allConcepts - The full list of concept objects from concepts.js.
 * @returns {object[]} An array of generated question objects.
 */
export const generateQuestions = (gameConfig, allConcepts = concepts) => {
  const { selectedCategories, numQuestions, includeChoices } = gameConfig;
  const questions = [];
  let availableConcepts = [...allConcepts];

  // Filter concepts by selected categories
  if (selectedCategories && selectedCategories.length > 0) {
    availableConcepts = availableConcepts.filter(concept =>
      selectedCategories.includes(concept.category)
    );
  }

  // Shuffle available concepts to get variety
  shuffleArray(availableConcepts);

  for (let i = 0; i < Math.min(numQuestions, availableConcepts.length); i++) {
    const concept = availableConcepts[i];
    let questionType;

    // Determine question type based on category and includeChoices
    if (includeChoices) {
      switch (concept.category) {
        case 'flags':
          questionType = 'flag_mc';
          break;
        case 'languages':
          questionType = 'language_mc';
          break;
        default:
          questionType = 'text_mc';
          break;
      }
    } else {
      questionType = 'identification';
    }

    let questionObj = {
      id: `${concept.id}-${questionType}`,
      conceptId: concept.id,
      category: concept.category,
      type: questionType,
      question: '', // Will be populated below
      options: [],
      correctAnswer: concept.correctAnswer, // Already set from concept
    };

    // Generate distractors (only for MC types)
    const getDistractors = (currentConcept, count = 3) => {
      const distractors = [];
      // Prioritize distractors from the same category
      const potentialDistractors = allConcepts.filter(c =>
        c.id !== currentConcept.id &&
        c.category === currentConcept.category &&
        c.correctAnswer !== currentConcept.correctAnswer
      );
      shuffleArray(potentialDistractors);
      for (let k = 0; k < Math.min(count, potentialDistractors.length); k++) {
        distractors.push(potentialDistractors[k].correctAnswer);
      }
      // Fallback: if not enough distractors from the same category, pick from any other concept
      if (distractors.length < count) {
        const fallbackDistractors = allConcepts.filter(c =>
            c.id !== currentConcept.id &&
            c.correctAnswer !== currentConcept.correctAnswer &&
            !distractors.includes(c.correctAnswer) && // Ensure no duplicates with already picked distractors
            c.correctAnswer !== currentConcept.correctAnswer // Ensure no duplicates with correct answer
        );
        shuffleArray(fallbackDistractors);
        for (let k = 0; k < Math.min(count - distractors.length, fallbackDistractors.length); k++) {
            distractors.push(fallbackDistractors[k].correctAnswer);
        }
      }
      return distractors;
    };

    // Populate question text and options based on type
    switch (questionType) {
      case 'text_mc':
        questionObj.question = concept.subject; // The subject IS the question text
        questionObj.options = [concept.correctAnswer, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'flag_mc':
        questionObj.question = concept.subject; // The flag emoji (actual question text handled by UI)
        // UI should ask "Which country's flag is this?"
        questionObj.options = [concept.correctAnswer, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'language_mc':
        // UI should ask `"${concept.subject}" means "Hello World" in which language?`
        // For now, storing the foreign phrase as the question, UI can contextualize
        questionObj.question = concept.subject;
        questionObj.options = [concept.correctAnswer, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'identification':
        // The subject IS the question text for most categories.
        // For flags/languages, the UI will need to present it appropriately.
        // e.g. for flag: "Which country's flag is this: 🇯🇵 ?"
        // e.g. for language: ""こんにちは世界" means "Hello World" in which language?"
        questionObj.question = concept.subject;
        questionObj.options = []; // No options for identification
        break;
      default:
        console.warn(`Unhandled question type: ${questionType} for concept ${concept.id}`);
        continue; // Skip if type is unknown (should not happen with current logic)
    }
    questions.push(questionObj);
  }

  return questions.slice(0, numQuestions);
};