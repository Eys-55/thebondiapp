const languageData = [
  { id: 'lang-jp', text: 'こんにちは世界', language: 'Japanese' },
  { id: 'lang-cn', text: '你好世界', language: 'Mandarin Chinese' },
  { id: 'lang-es', text: 'Hola Mundo', language: 'Spanish' },
  { id: 'lang-fr', text: 'Bonjour le monde', language: 'French' },
  { id: 'lang-de', text: 'Hallo Welt', language: 'German' },
  { id: 'lang-it', text: 'Ciao mondo', language: 'Italian' },
  { id: 'lang-ru', text: 'Привет мир', language: 'Russian' },
  { id: 'lang-pt', text: 'Olá Mundo', language: 'Portuguese' },
  { id: 'lang-kr', text: '안녕하세요 세계', language: 'Korean' },
  { id: 'lang-la', text: 'Salve Mundi', language: 'Latin' },
];

// Function to get a random subset and generate options in a standard format
export const getLanguageQuiz = (count = 5) => {
    const shuffled = [...languageData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return selected.map(item => {
      const correctAnswer = item.language;
      // Get some wrong answers
      const wrongAnswers = languageData
        .filter(l => l.language !== correctAnswer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(l => l.language);

      const options = [...wrongAnswers, correctAnswer].sort(() => 0.5 - Math.random());

      return {
        id: item.id,
        question: `Which language is this: "${item.text}"?`, // The text is part of the question
        options: options,
        correctAnswer: correctAnswer,
        type: 'language', // Add type
      };
    });
  };