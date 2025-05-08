import React from 'react';
import { Link } from 'react-router-dom';

// Placeholder data for games
const games = [
  {
    id: 'trivia-nights',
    name: 'Trivia Nights',
    description: 'Challenge friends in this local multiplayer quiz! Features flexible question styles: identification or multiple choice.',
    imageUrl: 'https://via.placeholder.com/300x200/FF5733/FFFFFF?text=Trivia+Nights', // Placeholder image
    link: '/trivia-nights/setup', // Link to the setup page for this game
    tags: ['Quiz', 'Multiplayer', 'Local'],
  },
  {
    id: 'charades-challenge',
    name: 'Charades Challenge',
    description: 'Act it out! A classic party game for hilarious moments.',
    imageUrl: 'https://via.placeholder.com/300x200/33FF57/FFFFFF?text=Charades',
    link: '#', // Link to '#' for now as it's disabled
    tags: ['Party', 'Acting', 'Multiplayer'],
    disabled: true,
  },
  {
    id: 'picture-puzzle',
    name: 'Picture Puzzle',
    description: 'Guess the word or phrase based on the pictures shown.',
    imageUrl: 'https://via.placeholder.com/300x200/3357FF/FFFFFF?text=Picture+Puzzle',
    link: '#',
    tags: ['Puzzle', 'Word Game', 'Visual'],
    disabled: true,
  },
  {
    id: 'drawing-duel',
    name: 'Drawing Duel',
    description: 'Can your friends guess what you\'re drawing before time runs out?',
    imageUrl: 'https://via.placeholder.com/300x200/FFFF33/000000?text=Drawing+Duel',
    link: '#',
    tags: ['Drawing', 'Party', 'Creative'],
    disabled: true,
  },
    {
    id: 'never-have-i-ever',
    name: 'Never Have I Ever',
    description: 'Discover secrets and funny stories with this classic icebreaker.',
    imageUrl: 'https://via.placeholder.com/300x200/FF33FF/FFFFFF?text=Never+Have+I+Ever',
    link: '#',
    tags: ['Party', 'Icebreaker', 'Social'],
    disabled: true,
  },
];

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Optional: Add a global Navbar here if needed later, or keep it removed */}
      {/* <nav className="bg-gray-800 text-white sticky top-0 z-50 shadow-md mb-8">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="navbar-brand">
            <Link to="/" className="text-xl font-bold hover:text-primary-light transition duration-200">
              YT Games Hub
            </Link>
          </div>
        </div>
      </nav> */}
      
      {/* The Navbar now handles the main title/branding like "YT Games" */}
      {/* You can add a subtitle or welcome message here if desired */}
      <h2 className="text-3xl font-semibold text-center text-gray-300 mb-10">Welcome to the Game Hub!</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => (
          <div
            key={game.id}
            className={`bg-gray-800 rounded-lg shadow-xl overflow-hidden transition-transform duration-300 ease-in-out ${game.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            <img src={game.imageUrl} alt={game.name} className="w-full h-48 object-cover" />
            <div className="p-6 flex flex-col">
              <h2 className="text-2xl font-semibold text-white mb-2">{game.name}</h2>
              <div className="mb-3 space-x-2 flex-wrap">
                {game.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-700 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded mb-1">
                        {tag}
                    </span>
                ))}
              </div>
              <p className="text-textSecondary mb-4 flex-grow">{game.description}</p>
              {game.disabled ? (
                 <button
                    className="w-full mt-auto bg-gray-600 text-gray-400 font-bold py-2 px-4 rounded cursor-not-allowed"
                    disabled
                 >
                    Coming Soon
                 </button>
              ) : (
                <Link
                    to={game.link}
                    className="block w-full mt-auto text-center bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Play Now
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;