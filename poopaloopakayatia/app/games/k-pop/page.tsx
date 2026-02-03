'use client';

import { useState } from 'react';
import { useBackground } from '@/app/components/BackgroundProvider';

const triviaQuestions = [
  {
    question: "Who is the lead vocalist and leader of Huntr/x?",
    options: ["Mira", "Zoey", "Rumi", "Celine"],
    correctAnswer: 2,
  },
  {
    question: "What combat weapon does Rumi use?",
    options: ["A saingeom sword", "A gokdo polearm", "Shinkal throwing knives", "A bow"],
    correctAnswer: 0,
  },
  {
    question: "Which Huntr/x member is the main dancer and visual?",
    options: ["Rumi", "Mira", "Zoey", "Jinu"],
    correctAnswer: 1,
  },
  {
    question: "What weapon does Mira wield?",
    options: ["A saingeom sword", "Shinkal throwing knives", "A gokdo polearm", "A staff"],
    correctAnswer: 2,
  },
  {
    question: "Who is the rapper, lyricist, and the youngest (maknae) in Huntr/x?",
    options: ["Rumi", "Mira", "Zoey", "Celine"],
    correctAnswer: 2,
  },
  {
    question: "What throwing weapons does Zoey use?",
    options: ["Shurikens", "Shinkal throwing knives", "Daggers", "Axes"],
    correctAnswer: 1,
  },
  {
    question: "What is the magical seal that Huntr/x works to build?",
    options: ["The Silver Shield", "The Golden Honmoon", "The Crystal Barrier", "The Sacred Circle"],
    correctAnswer: 1,
  },
  {
    question: "What threatens Rumi's voice during the movie?",
    options: ["A curse", "Her demon heritage and her demon marks", "An injury", "A poison"],
    correctAnswer: 1,
  },
  {
    question: "Who raised Rumi and taught her about being a demon hunter?",
    options: ["Mira", "Zoey", "Jinu", "Celine"],
    correctAnswer: 3,
  },
  {
    question: "What is the name of the rival boy band made up of demons?",
    options: ["Demon Kings", "Saja Boys", "Dark Harmony", "Shadow Band"],
    correctAnswer: 1,
  },
  {
    question: "Who leads the Saja Boys?",
    options: ["Gwi-Ma", "Rumi", "Jinu", "Celine"],
    correctAnswer: 2,
  },
  {
    question: "Which being is the supreme demon ruler in the movie?",
    options: ["Jinu", "Saja", "Celine", "Gwi-Ma"],
    correctAnswer: 3,
  },
];

export default function KPopTrivia() {
  const { selectedPhoto } = useBackground();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const textColorClass = selectedPhoto ? 'text-yellow-400' : 'text-zinc-900 dark:text-zinc-100';
  const textColorSecondary = selectedPhoto ? 'text-yellow-300' : 'text-zinc-600 dark:text-zinc-400';

  const handleAnswerClick = (selectedIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(selectedIndex);
    setIsAnswered(true);

    if (selectedIndex === triviaQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < triviaQuestions.length) {
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowScore(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`rounded-lg shadow-lg p-8 ${selectedPhoto ? 'bg-black/60 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800'}`}>
          <h1 className={`text-3xl font-bold mb-2 text-center ${textColorClass}`}>
            K-pop Demon Hunters Trivia
          </h1>
          <p className={`mb-8 text-center ${textColorSecondary}`}>
            Test your knowledge about the movie!
          </p>

          {showScore ? (
            <div className="text-center">
              <h2 className={`text-2xl font-semibold mb-4 ${textColorClass}`}>
                Quiz Complete!
              </h2>
              <p className={`text-xl mb-6 ${textColorClass}`}>
                You scored {score} out of {triviaQuestions.length}
              </p>
              <button
                onClick={restartQuiz}
                className={`px-6 py-3 rounded-lg transition-colors font-medium ${selectedPhoto ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Play Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className={`flex justify-between text-sm mb-2 ${textColorSecondary}`}>
                  <span>Question {currentQuestion + 1} of {triviaQuestions.length}</span>
                  <span>Score: {score}</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentQuestion + 1) / triviaQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className={`text-xl font-semibold mb-6 ${textColorClass}`}>
                  {triviaQuestions[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {triviaQuestions[currentQuestion].options.map((option, index) => {
                    const isCorrect = index === triviaQuestions[currentQuestion].correctAnswer;
                    const isSelected = index === selectedAnswer;

                    let buttonClass = "w-full p-4 text-left rounded-lg border-2 transition-all ";

                    if (!isAnswered) {
                      buttonClass += selectedPhoto
                        ? "border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/20"
                        : "border-zinc-300 dark:border-zinc-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-700";
                    } else if (isSelected && isCorrect) {
                      buttonClass += "border-green-500 bg-green-50 dark:bg-green-900/20";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "border-red-500 bg-red-50 dark:bg-red-900/20";
                    } else if (isCorrect) {
                      buttonClass += "border-green-500 bg-green-50 dark:bg-green-900/20";
                    } else {
                      buttonClass += selectedPhoto ? "border-yellow-400/30" : "border-zinc-300 dark:border-zinc-600";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerClick(index)}
                        disabled={isAnswered}
                        className={buttonClass}
                      >
                        <span className={`font-medium ${textColorClass}`}>
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAnswered && (
                <div className="text-center">
                  <button
                    onClick={handleNextQuestion}
                    className={`px-6 py-3 rounded-lg transition-colors font-medium ${selectedPhoto ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {currentQuestion + 1 === triviaQuestions.length ? 'See Results' : 'Next Question'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
