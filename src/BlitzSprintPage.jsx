import React, { useState, useEffect, useRef } from 'react';
import { ORTHOEPY_WORDS } from './data';
import { AntiCheatShield } from './AntiCheatShield';
import { sounds } from './sounds';

export function BlitzSprintPage({ store, setPage }) {
  const { addXP, state } = store;
  const user = state.user;

  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'gameover'
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'

  // Список слов для спринта
  const wordsPool = ORTHOEPY_WORDS;

  const generateRound = () => {
    const item = wordsPool[Math.floor(Math.random() * wordsPool.length)];
    // Создаем 2 варианта ударения
    const correct = item.word;
    const vowels = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
    const clean = correct.toLowerCase();
    
    // Ищем ударную гласную
    let correctIdx = -1;
    for (let i = 0; i < correct.length; i++) {
      if (correct[i] === correct[i].toUpperCase() && vowels.includes(correct[i])) {
        correctIdx = i;
        break;
      }
    }

    // Ищем другие гласные
    const otherVowelIndices = [];
    for (let i = 0; i < clean.length; i++) {
      if (vowels.toLowerCase().includes(clean[i]) && i !== correctIdx) {
        otherVowelIndices.push(i);
      }
    }

    let fake = correct;
    if (otherVowelIndices.length > 0) {
      const fakeIdx = otherVowelIndices[Math.floor(Math.random() * otherVowelIndices.length)];
      const chars = clean.split('');
      chars[fakeIdx] = chars[fakeIdx].toUpperCase();
      fake = chars.join('');
    } else {
      fake = clean;
    }

    const opts = Math.random() > 0.5 ? [correct, fake] : [fake, correct];
    setCurrentWord({ ...item, correct });
    setOptions(opts);
  };

  const handleStart = () => {
    sounds.click();
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(60);
    setFeedback(null);
    setGameState('playing');
    generateRound();
  };

  // Таймер игры
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleGameOver = () => {
    sounds.levelUp();
    setGameState('gameover');
  };

  const handleAnswer = (choice) => {
    if (gameState !== 'playing') return;
    const isCorrect = choice === currentWord.correct;

    if (isCorrect) {
      sounds.correct();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      
      const mult = nextStreak >= 5 ? 3 : nextStreak >= 3 ? 2 : 1;
      const pts = 10 * mult;
      setScore(s => s + pts);
      setFeedback('correct');

      if (addXP) addXP(pts, true);
    } else {
      sounds.wrong();
      setStreak(0);
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      generateRound();
    }, 180);
  };

  const handleVoice = (text) => {
    if (sounds.speak) sounds.speak(text);
  };

  return (
    <AntiCheatShield store={store} activityName="Блиц-Спринт ЕГЭ (60 сек)">
      <div className="max-w-md mx-auto space-y-4 animate-fadeIn pb-20">
        {/* Top Mobile Bar */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => { sounds.click(); setPage('home'); }}
          className="text-xs text-purple-400 font-bold flex items-center gap-1 p-2 rounded-xl bg-white/5"
        >
          ◀ На главную
        </button>
        <div className="text-xs font-bold text-gray-400">
          ⚡ Мобильный спринт (60 сек)
        </div>
      </div>

      {gameState === 'ready' && (
        <div className="card p-6 text-center space-y-6 border-purple-500/40">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-4xl shadow-xl shadow-purple-500/30 animate-pulse">
            ⚡
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Блиц-Спринт ЕГЭ
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Проверь скорость реакции большим пальцем! 60 секунд, непрерывный поток слов, комбо-множители и виброотклик.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-purple-400 font-black text-lg">60 с</div>
              <div className="text-gray-400 text-[10px]">Время</div>
            </div>
            <div>
              <div className="text-pink-400 font-black text-lg">x3</div>
              <div className="text-gray-400 text-[10px]">Комбо-стрик</div>
            </div>
            <div>
              <div className="text-emerald-400 font-black text-lg">+XP</div>
              <div className="text-gray-400 text-[10px]">Прокачка</div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="btn-primary w-full py-4 text-base font-black uppercase tracking-wider shadow-2xl rounded-2xl active:scale-95"
          >
            Погнали! 🚀
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="space-y-4">
          {/* HUD Bar */}
          <div className="card p-3 flex items-center justify-between border-purple-500/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2.5 py-1 rounded-xl">
                ⏱️ {timeLeft}с
              </span>
              {streak >= 3 && (
                <span className="badge bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-bold animate-bounce">
                  🔥 Стрик x{streak >= 5 ? 3 : 2}!
                </span>
              )}
            </div>

            <div className="text-right">
              <div className="text-base font-black text-emerald-400 font-mono">
                {score} <span className="text-[10px] text-gray-400">очков</span>
              </div>
            </div>
          </div>

          {/* Flash Card */}
          <div className={`card p-8 text-center space-y-4 transition-all duration-150 border-2 min-h-52 flex flex-col justify-center items-center ${
            feedback === 'correct'
              ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/20'
              : feedback === 'wrong'
              ? 'border-red-500 bg-red-950/30 shadow-lg shadow-red-500/20'
              : 'border-white/10'
          }`}>
            <div className="text-xs uppercase tracking-widest text-purple-400 font-bold">
              Где правильное ударение?
            </div>

            <div className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {currentWord?.word.toLowerCase()}
            </div>

            {currentWord?.hint && (
              <div className="text-[11px] text-gray-400">
                Подсказка: {currentWord.hint}
              </div>
            )}
          </div>

          {/* Huge Touch Thumb Buttons (48px+ touch target) */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(opt)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/40 text-xl sm:text-2xl font-black text-white hover:border-purple-400 active:scale-95 transition-transform shadow-lg shadow-black/40 flex items-center justify-center gap-3"
              >
                <span>{opt}</span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => handleVoice(currentWord?.correct)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mx-auto py-2 px-3 rounded-xl bg-white/5"
            >
              <span>🔊</span> Послушать правильное произношение
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="card p-6 sm:p-8 text-center space-y-6 border-purple-500/50 bg-purple-950/20 animate-scaleUp">
          <div className="text-5xl animate-bounce">🏁</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Время вышло!</h2>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">Отличная тренировка реакции!</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl font-black text-purple-400">{score}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">Очков набрано</div>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl font-black text-pink-400">{maxStreak}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">Макс. комбо 🔥</div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleStart}
              className="btn-primary w-full py-3.5 text-sm font-black rounded-2xl"
            >
              Сыграть ещё раз 🔄
            </button>
            <button
              onClick={() => { sounds.click(); setPage('ege_exam'); }}
              className="btn-secondary w-full py-3 text-xs font-bold rounded-2xl"
            >
              Перейти к решению полного ЕГЭ ➜
            </button>
          </div>
        </div>
      )}
    </div>
    </AntiCheatShield>
  );
}
