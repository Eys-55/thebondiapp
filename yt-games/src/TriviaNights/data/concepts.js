/**
 * Unified Concept Data Structure for Quiz Questions
 *
 * Each object represents a single piece of knowledge ("concept").
 * For MC questions, distractors will be generated dynamically from other concepts
 * within the same category.
 */
export const concepts = [
  // --- Geography ---
  {
    id: 'geo-capital-fr',
    category: 'geography',
    subject: 'What is the capital of France?',
    correctAnswer: 'Paris',
    tags: ['europe', 'capital', 'city'],
  },
  {
    id: 'geo-capital-ph',
    category: 'geography',
    subject: 'What is the capital of the Philippines?',
    correctAnswer: 'Manila',
    tags: ['asia', 'capital', 'city'],
  },
  {
    id: 'geo-capital-jp',
    category: 'geography',
    subject: 'What is the capital of Japan?',
    correctAnswer: 'Tokyo',
    tags: ['asia', 'capital', 'city'],
  },
  {
    id: 'geo-capital-de',
    category: 'geography',
    subject: 'What is the capital of Germany?',
    correctAnswer: 'Berlin',
    tags: ['europe', 'capital', 'city'],
  },
  {
    id: 'geo-ocean-largest',
    category: 'geography',
    subject: 'What is the largest ocean on Earth?',
    correctAnswer: 'Pacific Ocean',
    tags: ['ocean', 'earth'],
  },

  // --- Science ---
  {
    id: 'sci-planet-red',
    category: 'science',
    subject: 'Which planet is known as the Red Planet?',
    correctAnswer: 'Mars',
    tags: ['astronomy', 'planet', 'solar system'],
  },
  {
    id: 'sci-planet-gas',
    category: 'science',
    subject: 'Which is the largest planet in our solar system and known as a gas giant?',
    correctAnswer: 'Jupiter',
    tags: ['astronomy', 'planet', 'solar system'],
  },
  {
    id: 'sci-water-symbol',
    category: 'science',
    subject: 'What is the chemical symbol for water?',
    correctAnswer: 'H2O',
    tags: ['chemistry', 'molecule', 'symbol'],
  },
  {
    id: 'sci-salt-symbol',
    category: 'science',
    subject: 'What is the chemical symbol for table salt?',
    correctAnswer: 'NaCl',
    tags: ['chemistry', 'compound', 'symbol'],
  },
   {
    id: 'sci-gravity-person',
    category: 'science',
    subject: 'Who is credited with formulating the theory of universal gravitation?',
    correctAnswer: 'Isaac Newton',
    tags: ['physics', 'scientist', 'gravity'],
  },


  // --- Literature ---
  {
    id: 'lit-hamlet',
    category: 'literature',
    subject: 'Who wrote the play "Hamlet"?',
    correctAnswer: 'William Shakespeare',
    tags: ['play', 'shakespeare', 'author'],
  },
  {
    id: 'lit-mockingbird',
    category: 'literature',
    subject: 'Who wrote the novel "To Kill a Mockingbird"?',
    correctAnswer: 'Harper Lee',
    tags: ['novel', 'american', 'author'],
  },
  {
    id: 'lit-gatsby',
    category: 'literature',
    subject: 'Who wrote the novel "The Great Gatsby"?',
    correctAnswer: 'F. Scott Fitzgerald',
    tags: ['novel', 'american', 'author'],
  },
   {
    id: 'lit-1984',
    category: 'literature',
    subject: 'Who wrote the dystopian novel "Nineteen Eighty-Four"?',
    correctAnswer: 'George Orwell',
    tags: ['novel', 'dystopian', 'author'],
  },

  // --- Flags ---
  // For flags, the 'subject' is the flag emoji.
  {
    id: 'flag-ph',
    category: 'flags',
    subject: '🇵🇭', // Question: "Which country's flag is this?"
    correctAnswer: 'Philippines',
    tags: ['asia', 'country'],
  },
  {
    id: 'flag-jp',
    category: 'flags',
    subject: '🇯🇵',
    correctAnswer: 'Japan',
    tags: ['asia', 'country'],
  },
  {
    id: 'flag-de',
    category: 'flags',
    subject: '🇩🇪',
    correctAnswer: 'Germany',
    tags: ['europe', 'country'],
  },
  {
    id: 'flag-us',
    category: 'flags',
    subject: '🇺🇸',
    correctAnswer: 'United States',
    tags: ['north america', 'country'],
  },
  {
    id: 'flag-ca',
    category: 'flags',
    subject: '🇨🇦',
    correctAnswer: 'Canada',
    tags: ['north america', 'country'],
  },

  // --- Languages ---
  // For languages, 'subject' is the foreign phrase.
  {
    id: 'lang-jp',
    category: 'languages',
    subject: 'こんにちは世界', // Question: ""こんにちは世界" means "Hello World" in which language?"
    correctAnswer: 'Japanese',
    tags: ['asia', 'greeting'],
  },
  {
    id: 'lang-es',
    category: 'languages',
    subject: 'Hola Mundo',
    correctAnswer: 'Spanish',
    tags: ['europe', 'americas', 'greeting'],
  },
  {
    id: 'lang-fr',
    category: 'languages',
    subject: 'Bonjour le monde',
    correctAnswer: 'French',
    tags: ['europe', 'greeting'],
  },
  {
    id: 'lang-de',
    category: 'languages',
    subject: 'Hallo Welt',
    correctAnswer: 'German',
    tags: ['europe', 'greeting'],
  },
   {
    id: 'lang-ko',
    category: 'languages',
    subject: '안녕하세요 세계',
    correctAnswer: 'Korean',
    tags: ['asia', 'greeting'],
  },
];