'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface BackgroundContextType {
  selectedPhoto: string | null;
  setSelectedPhoto: (photo: string | null) => void;
  resetTimer: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within BackgroundProvider');
  }
  return context;
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [selectedPhoto, setSelectedPhotoState] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kpop-background');
    if (saved && saved !== 'null') {
      setSelectedPhotoState(saved);
    }
  }, []);

  const startTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new 60-second timer
    timerRef.current = setTimeout(() => {
      setSelectedPhotoState(null);
      localStorage.removeItem('kpop-background');
      localStorage.removeItem('kpop-background-time');
    }, 60000); // 60 seconds
  };

  const setSelectedPhoto = (photo: string | null) => {
    setSelectedPhotoState(photo);

    if (photo) {
      localStorage.setItem('kpop-background', photo);
      localStorage.setItem('kpop-background-time', Date.now().toString());
      startTimer();
    } else {
      localStorage.removeItem('kpop-background');
      localStorage.removeItem('kpop-background-time');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resetTimer = () => {
    if (selectedPhoto) {
      startTimer();
    }
  };

  // Start timer when photo is loaded from localStorage
  useEffect(() => {
    if (selectedPhoto) {
      const savedTime = localStorage.getItem('kpop-background-time');
      if (savedTime) {
        const elapsed = Date.now() - parseInt(savedTime);
        const remaining = 60000 - elapsed;

        if (remaining > 0) {
          // Clear any existing timer
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }

          // Set timer for remaining time
          timerRef.current = setTimeout(() => {
            setSelectedPhotoState(null);
            localStorage.removeItem('kpop-background');
            localStorage.removeItem('kpop-background-time');
          }, remaining);
        } else {
          // Time already expired
          setSelectedPhotoState(null);
          localStorage.removeItem('kpop-background');
          localStorage.removeItem('kpop-background-time');
        }
      }
    }
  }, [selectedPhoto]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const backgroundStyle = (selectedPhoto && selectedPhoto !== 'null')
    ? {
        backgroundImage: `url(/kpop-photos/${selectedPhoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : {};

  return (
    <BackgroundContext.Provider value={{ selectedPhoto, setSelectedPhoto, resetTimer }}>
      <div
        className="min-h-screen fixed inset-0 -z-10"
        style={backgroundStyle}
      />
      <div className="relative z-0">
        {children}
      </div>
    </BackgroundContext.Provider>
  );
}
