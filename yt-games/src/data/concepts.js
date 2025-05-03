/**
 * Unified Concept Data Structure for Quiz Questions
 *
 * Each object represents a single piece of knowledge ("concept").
 * Distractors for MC questions will be generated dynamically based on category/attribute.
 */
export const concepts = [
  // --- Geography / Facts ---
  {
    id: 'geo-capital-fr',
    category: 'geography',
    tags: ['europe', 'capital', 'city'],
    subject: 'France',
    attribute: 'Capital', // Helps find relevant distractors (other capitals)
    correctValue: 'Paris',
    trueFalseStatement: {
      true: "Paris is the capital of France.",
      // False template still useful, generator will find a distractor dynamically
      falseTemplate: "{distractor} is the capital of France."
    }
  },
   {
    id: 'geo-capital-ph',
    category: 'geography',
    tags: ['asia', 'capital', 'city'],
    subject: 'Philippines',
    attribute: 'Capital',
    correctValue: 'Manila',
    trueFalseStatement: {
      true: "Manila is the capital of the Philippines.",
      falseTemplate: "{distractor} is the capital of the Philippines."
    }
  },
   {
    id: 'geo-capital-jp',
    category: 'geography',
    tags: ['asia', 'capital', 'city'],
    subject: 'Japan',
    attribute: 'Capital',
    correctValue: 'Tokyo',
    trueFalseStatement: {
      true: "Tokyo is the capital of Japan.",
      falseTemplate: "{distractor} is the capital of Japan."
    }
  },
   {
    id: 'geo-capital-de',
    category: 'geography',
    tags: ['europe', 'capital', 'city'],
    subject: 'Germany',
    attribute: 'Capital',
    correctValue: 'Berlin',
    trueFalseStatement: {
      true: "Berlin is the capital of Germany.",
      falseTemplate: "{distractor} is the capital of Germany."
    }
  },
  {
    id: 'sci-planet-red',
    category: 'science',
    tags: ['astronomy', 'planet', 'solar system'],
    subject: 'Mars',
    attribute: 'Nickname',
    correctValue: 'Red Planet',
    // Distractors for nicknames might be harder to generate dynamically,
    // consider adding specific distractors here if needed, or improve generator logic.
    trueFalseStatement: {
      true: "Mars is known as the Red Planet.",
      falseTemplate: "Mars is known as the {distractor}." // Generator needs to find other planet nicknames/descriptions
    }
  },
   {
    id: 'sci-planet-gas',
    category: 'science',
    tags: ['astronomy', 'planet', 'solar system'],
    subject: 'Jupiter',
    attribute: 'Type',
    correctValue: 'Gas Giant',
    trueFalseStatement: {
      true: "Jupiter is a Gas Giant.",
      falseTemplate: "Jupiter is a {distractor}." // Generator needs to find other planet types/descriptions
    }
  },
  {
    id: 'geo-ocean-largest',
    category: 'geography',
    tags: ['ocean', 'earth'],
    subject: 'Largest Ocean on Earth',
    attribute: null,
    correctValue: 'Pacific Ocean',
    trueFalseStatement: {
      true: "The Pacific Ocean is the largest ocean on Earth.",
      falseTemplate: "The {distractor} is the largest ocean on Earth." // Needs other ocean names
    }
  },
  {
    id: 'lit-hamlet',
    category: 'literature',
    tags: ['play', 'shakespeare', 'author'],
    subject: 'Hamlet',
    attribute: 'Author',
    correctValue: 'William Shakespeare',
    trueFalseStatement: {
      true: "William Shakespeare wrote Hamlet.",
      falseTemplate: "{distractor} wrote Hamlet." // Needs other authors
    }
  },
   {
    id: 'lit-mockingbird',
    category: 'literature',
    tags: ['novel', 'american', 'author'],
    subject: 'To Kill a Mockingbird',
    attribute: 'Author',
    correctValue: 'Harper Lee',
    trueFalseStatement: {
      true: "Harper Lee wrote To Kill a Mockingbird.",
      falseTemplate: "{distractor} wrote To Kill a Mockingbird." // Needs other authors
    }
  },
  {
    id: 'sci-water-symbol',
    category: 'science',
    tags: ['chemistry', 'molecule', 'symbol'],
    subject: 'Water',
    attribute: 'Chemical Symbol',
    correctValue: 'H2O',
    trueFalseStatement: {
      true: "The chemical symbol for water is H2O.",
      falseTemplate: "The chemical symbol for water is {distractor}." // Needs other chemical symbols
    }
  },
   {
    id: 'sci-salt-symbol',
    category: 'science',
    tags: ['chemistry', 'compound', 'symbol'],
    subject: 'Table Salt',
    attribute: 'Chemical Symbol',
    correctValue: 'NaCl',
    trueFalseStatement: {
      true: "The chemical symbol for table salt is NaCl.",
      falseTemplate: "The chemical symbol for table salt is {distractor}." // Needs other chemical symbols
    }
  },

  // --- Flags ---
  // For flags, the 'subject' is the flag, 'attribute' is 'Country', 'correctValue' is the country name.
  // Distractors will be other country names from flag concepts.
  {
    id: 'flag-ph',
    category: 'flags',
    tags: ['asia', 'country'],
    subject: '🇵🇭',
    attribute: 'Country',
    correctValue: 'Philippines',
    trueFalseStatement: {
      true: "🇵🇭 is the flag of the Philippines.",
      falseTemplate: "🇵🇭 is the flag of {distractor}." // Needs other country names
    }
  },
  {
    id: 'flag-jp',
    category: 'flags',
    tags: ['asia', 'country'],
    subject: '🇯🇵',
    attribute: 'Country',
    correctValue: 'Japan',
    trueFalseStatement: {
      true: "🇯🇵 is the flag of Japan.",
      falseTemplate: "🇯🇵 is the flag of {distractor}."
    }
  },
  {
    id: 'flag-de',
    category: 'flags',
    tags: ['europe', 'country'],
    subject: '🇩🇪',
    attribute: 'Country',
    correctValue: 'Germany',
    trueFalseStatement: {
      true: "🇩🇪 is the flag of Germany.",
      falseTemplate: "🇩🇪 is the flag of {distractor}."
    }
  },
   {
    id: 'flag-us',
    category: 'flags',
    tags: ['north america', 'country'],
    subject: '🇺🇸',
    attribute: 'Country',
    correctValue: 'United States',
    trueFalseStatement: {
      true: "🇺🇸 is the flag of the United States.",
      falseTemplate: "🇺🇸 is the flag of {distractor}."
    }
  },
   {
    id: 'flag-ca',
    category: 'flags',
    tags: ['north america', 'country'],
    subject: '🇨🇦',
    attribute: 'Country',
    correctValue: 'Canada',
    trueFalseStatement: {
      true: "🇨🇦 is the flag of Canada.",
      falseTemplate: "🇨🇦 is the flag of {distractor}."
    }
  },

  // --- Languages ---
  // For languages, 'subject' is the phrase, 'attribute' is 'Language', 'correctValue' is the language name.
  // Distractors will be other language names.
  {
    id: 'lang-jp',
    category: 'languages',
    tags: ['asia', 'greeting'],
    subject: 'こんにちは世界',
    attribute: 'Language',
    correctValue: 'Japanese',
    trueFalseStatement: {
      true: '"こんにちは世界" means "Hello World" in Japanese.',
      falseTemplate: '"こんにちは世界" means "Hello World" in {distractor}.' // Needs other language names
    }
  },
  {
    id: 'lang-es',
    category: 'languages',
    tags: ['europe', 'americas', 'greeting'],
    subject: 'Hola Mundo',
    attribute: 'Language',
    correctValue: 'Spanish',
    trueFalseStatement: {
      true: '"Hola Mundo" means "Hello World" in Spanish.',
      falseTemplate: '"Hola Mundo" means "Hello World" in {distractor}.'
    }
  },
  {
    id: 'lang-fr',
    category: 'languages',
    tags: ['europe', 'greeting'],
    subject: 'Bonjour le monde',
    attribute: 'Language',
    correctValue: 'French',
    trueFalseStatement: {
      true: '"Bonjour le monde" means "Hello World" in French.',
      falseTemplate: '"Bonjour le monde" means "Hello World" in {distractor}.'
    }
  },
   {
    id: 'lang-de',
    category: 'languages',
    tags: ['europe', 'greeting'],
    subject: 'Hallo Welt',
    attribute: 'Language',
    correctValue: 'German',
    trueFalseStatement: {
      true: '"Hallo Welt" means "Hello World" in German.',
      falseTemplate: '"Hallo Welt" means "Hello World" in {distractor}.'
    }
  },
];