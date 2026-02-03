'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBackground } from '@/app/components/BackgroundProvider';

const kpopPhotos = [
  {
    name: "Default (Original)",
    filename: null,
    isDefault: true,
  },
  {
    name: "Demon Hunters 1",
    filename: "demon-hunters-052125-1-81d65e4e50ba4f9eaf43935dfd5ebe6b.jpg",
    isDefault: false,
  },
  {
    name: "Photo 1",
    filename: "IMG_9806.JPEG",
    isDefault: false,
  },
  {
    name: "Photo 2",
    filename: "IMG_9807.JPEG",
    isDefault: false,
  },
  {
    name: "K-pop Heroes",
    filename: "kpop_h.webp",
    isDefault: false,
  },
  {
    name: "K-pop Demon Hunters",
    filename: "Kpop-Demon-Hunters-1.webp",
    isDefault: false,
  },
  {
    name: "Huntrix Netflix",
    filename: "Kpop-Demon-Hunters-Huntrix-Netflix.webp",
    isDefault: false,
  },
  {
    name: "Demon Hunters Scenes",
    filename: "kpop-demon-hunters-scenes-2.jpg",
    isDefault: false,
  },
  {
    name: "Tiger Scene",
    filename: "Kpop-Demon-Hunters-tiger-1280x853.webp",
    isDefault: false,
  },
];

export default function FavoritePhoto() {
  const { selectedPhoto, setSelectedPhoto } = useBackground();
  const [timeRemaining, setTimeRemaining] = useState<number>(60);

  useEffect(() => {
    if (!selectedPhoto) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const savedTime = localStorage.getItem('kpop-background-time');
      if (savedTime) {
        const elapsed = Date.now() - parseInt(savedTime);
        const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPhoto]);

  useEffect(() => {
    if (selectedPhoto) {
      localStorage.setItem('kpop-background-time', Date.now().toString());
    }
  }, [selectedPhoto]);

  const handlePhotoSelect = (filename: string | null) => {
    setSelectedPhoto(filename);
    if (filename) {
      setTimeRemaining(60);
      localStorage.setItem('kpop-background-time', Date.now().toString());
    }
  };

  const textColorClass = selectedPhoto ? 'text-yellow-400' : 'text-zinc-900 dark:text-zinc-100';

  return (
    <div className={`min-h-screen ${selectedPhoto ? 'bg-transparent' : 'bg-zinc-50 dark:bg-zinc-900'}`}>
      <nav className={`bg-white/90 dark:bg-zinc-800/90 shadow-sm backdrop-blur-sm ${selectedPhoto ? 'bg-black/50' : ''}`}>
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
        <div className={`${selectedPhoto ? 'bg-black/60' : 'bg-white dark:bg-zinc-800'} rounded-lg shadow-lg p-8 backdrop-blur-sm`}>
          <h1 className={`text-3xl font-bold mb-2 text-center ${textColorClass}`}>
            Choose Your Favorite K-pop Photo
          </h1>
          <p className={`mb-4 text-center ${selectedPhoto ? 'text-yellow-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
            Click on a photo to set it as your background
          </p>

          {selectedPhoto && (
            <div className={`mb-6 text-center text-lg font-semibold ${textColorClass}`}>
              Background will reset in {timeRemaining} seconds
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kpopPhotos.map((photo, index) => (
              <div
                key={index}
                onClick={() => handlePhotoSelect(photo.filename)}
                className={`cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-xl ${
                  selectedPhoto === photo.filename ? 'ring-4 ring-yellow-400 scale-105' : ''
                }`}
              >
                {photo.isDefault ? (
                  <div className="relative aspect-square bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                    <div className="text-4xl">🏠</div>
                  </div>
                ) : (
                  <div className="relative aspect-square">
                    <Image
                      src={`/kpop-photos/${photo.filename}`}
                      alt={photo.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                )}
                <div className={`p-2 text-center text-sm font-medium ${
                  selectedPhoto === photo.filename
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                }`}>
                  {photo.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
