import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="text-center py-10">
      <h1 className="text-6xl font-bold text-danger mb-4">404</h1>
      <p className="text-2xl text-textSecondary mb-8">Oops! Page Not Found.</p>
      <p className="mb-8">
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
      >
        Go to Home
      </Link>
    </div>
  );
}

export default NotFound;