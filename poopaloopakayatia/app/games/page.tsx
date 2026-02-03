'use client';

import { useBackground } from '../components/BackgroundProvider';

export default function Games() {
  const { selectedPhoto } = useBackground();
  const textColorClass = selectedPhoto ? 'text-yellow-400' : 'text-zinc-900 dark:text-zinc-100';
  const textColorSecondary = selectedPhoto ? 'text-yellow-300' : 'text-zinc-600 dark:text-zinc-400';

  return (
    <div className={`min-h-screen ${selectedPhoto ? 'bg-transparent' : 'bg-zinc-50 dark:bg-zinc-900'}`}>
      <nav className={`${selectedPhoto ? 'bg-black/50 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-8 h-16">
            <a
              href="/"
              className={`inline-flex items-center px-4 text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${textColorClass}`}
            >
              Home
            </a>
            <a
              href="/games"
              className={`inline-flex items-center px-4 text-lg font-medium border-b-2 ${selectedPhoto ? 'text-yellow-400 border-yellow-400' : 'text-blue-600 dark:text-blue-400 border-blue-600'}`}
            >
              Games
            </a>
            <a
              href="/about"
              className={`inline-flex items-center px-4 text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${textColorClass}`}
            >
              About
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className={`text-4xl font-bold mb-8 text-center ${textColorClass}`}>
          Games
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="/games/k-pop"
            className={`block p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow ${selectedPhoto ? 'bg-black/60 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800'}`}
          >
            <h2 className={`text-2xl font-semibold mb-2 ${textColorClass}`}>
              K-pop Demon Hunters Trivia
            </h2>
            <p className={textColorSecondary}>
              Test your knowledge about the K-pop Demon Hunters movie!
            </p>
          </a>

          <a
            href="/games/favorite-photo"
            className={`block p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow ${selectedPhoto ? 'bg-black/60 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800'}`}
          >
            <h2 className={`text-2xl font-semibold mb-2 ${textColorClass}`}>
              Favorite K-pop Photo
            </h2>
            <p className={textColorSecondary}>
              Choose your favorite K-pop photo and set it as your background!
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
