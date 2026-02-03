'use client';

import { useBackground } from './components/BackgroundProvider';

export default function Home() {
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
              className={`inline-flex items-center px-4 text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${textColorClass}`}
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
        <div className={`text-center ${selectedPhoto ? 'bg-black/60 backdrop-blur-sm rounded-lg p-8' : ''}`}>
          <h1 className={`text-4xl font-bold mb-4 ${textColorClass}`}>
            Welcome to Poopaloopakayatia
          </h1>
          <p className={`text-lg ${textColorSecondary}`}>
            Select a menu item above to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
