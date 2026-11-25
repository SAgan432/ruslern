import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EGE_SCORE_TABLE, EGE_TASKS_INFO, EGE_FULL_VARIANT } from './egeData';
import { AntiCheatShield } from './AntiCheatShield';
import { sounds } from './sounds';

export function EgeExamPage({ store }) {
  const { state, submitTest, addXP } = store;
  const user = state.user;
  const acMetricsRef = useRef({ tabSwitches: 0, copyAttempts: 0, hadBrowserExit: false });

  // Режимы: 'full_exam' (полный вариант с таймером) или 'task_trainer' (по отдельным заданиям)
  const [mode, setMode] = useState('full_exam');
  const [selectedTaskNum, setSelectedTaskNum] = useState(1);
  
  // Ответы пользователя: { [taskNum]: string }
  const [answers, setAnswers] = useState({});
  const [matchingAnswers, setMatchingAnswers] = useState({}); // { [taskNum]: { 'А': 1, 'Б': 2, ... } }
  const [essayText, setEssayText] = useState('');
  
  // Таймер экзамена (в секундах: 210 минут = 12600 сек)
  const [timeLeft, setTimeLeft] = useState(210 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Статус завершения
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState(null);
  const [showExplanation, setShowExplanation] = useState({}); // { [taskNum]: boolean }
  const [showReadingText, setShowReadingText] = useState(true);

  // Таймер обратного отсчета
  useEffect(() => {
    if (!isTimerRunning || isFinished) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isFinished]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Все задания варианта (объединяем часть 1 и часть 2)
  const allTasks = useMemo(() => {
    return [...EGE_FULL_VARIANT.tasks, ...EGE_FULL_VARIANT.textTasks];
  }, []);

  const currentTask = allTasks.find(t => t.num === selectedTaskNum) || allTasks[0];
  const currentTaskInfo = EGE_TASKS_INFO.find(t => t.num === selectedTaskNum) || EGE_TASKS_INFO[0];

  // Обработка ввода текстового ответа
  const handleTextAnswerChange = (taskNum, val) => {
    setAnswers(prev => ({
      ...prev,
      [taskNum]: val.trim().toLowerCase().replace(/\s+/g, '')
    }));
  };

  // Обработка выбора чекбокса/опции
  const handleToggleOption = (taskNum, optId) => {
    sounds.click();
    setAnswers(prev => {
      const current = prev[taskNum] || '';
      let nextStr = '';
      if (current.includes(optId)) {
        nextStr = current.replace(optId, '');
      } else {
        nextStr = (current + optId).split('').sort().join('');
      }
      return { ...prev, [taskNum]: nextStr };
    });
  };

  // Обработка сопоставления для заданий 8 и 26
  const handleMatchingSelect = (taskNum, key, sentenceId) => {
    sounds.click();
    setMatchingAnswers(prev => {
      const taskMatching = { ...(prev[taskNum] || {}) };
      taskMatching[key] = sentenceId;
      
      // Формируем строковый ответ
      const keys = Object.keys(taskMatching).sort();
      const strAnswer = keys.map(k => taskMatching[k]).join('');
      setAnswers(a => ({ ...a, [taskNum]: strAnswer }));

      return { ...prev, [taskNum]: taskMatching };
    });
  };

  // Подсчёт количества введённых ответов
  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].length > 0).length + (essayText.trim().length > 30 ? 1 : 0);

  // Завершение экзамена и проверка
  const handleFinishExam = () => {
    sounds.levelUp();
    setIsTimerRunning(false);
    
    let primaryScore = 0;
    const taskBreakdown = {};

    allTasks.forEach(task => {
      let isCorrect = false;
      let earned = 0;

      if (task.type === 'essay') {
        // Оценка сочинения: эвристика по объёму слов и абзацев
        const words = essayText.trim().split(/\s+/).filter(Boolean).length;
        if (words >= 150) earned = 18;
        else if (words >= 100) earned = 12;
        else if (words >= 50) earned = 6;
        else earned = 0;
        primaryScore += earned;
        taskBreakdown[task.num] = {
          earned,
          max: task.points,
          isCorrect: words >= 150,
          userAnswer: `Сочинение: ${words} слов`,
          correctAnswer: 'Сочинение по критериям К1–К12'
        };
        return;
      }

      const userAns = (answers[task.num] || '').toLowerCase().trim();
      const acceptable = (task.acceptableAnswers || [task.answer]).map(a => a.toLowerCase().trim());

      if (task.type === 'matching_table') {
        // Для задания 8 и 26 частичный балл
        const correctStr = task.answer;
        let matchCount = 0;
        for (let i = 0; i < correctStr.length; i++) {
          if (userAns[i] === correctStr[i]) matchCount++;
        }
        if (matchCount === correctStr.length) earned = task.points;
        else if (matchCount >= 3) earned = 2;
        else if (matchCount >= 1) earned = 1;
        else earned = 0;
        isCorrect = earned === task.points;
      } else {
        // Обычные задания (1 балл)
        if (acceptable.includes(userAns)) {
          earned = task.points;
          isCorrect = true;
        } else {
          earned = 0;
          isCorrect = false;
        }
      }

      primaryScore += earned;
      taskBreakdown[task.num] = {
        earned,
        max: task.points,
        isCorrect,
        userAnswer: userAns || '(нет ответа)',
        correctAnswer: task.answer
      };
    });

    const scaledScore = EGE_SCORE_TABLE[Math.min(50, primaryScore)] || 0;
    const accuracy = Math.round((primaryScore / 50) * 100);

    const examResults = {
      primaryScore,
      maxPrimary: 50,
      scaledScore,
      accuracy,
      taskBreakdown,
      durationSpent: 210 * 60 - timeLeft
    };

    setResults(examResults);
    setIsFinished(true);

    // Сохраняем в SQLite БД через API с реальными метриками античита
    if (submitTest) {
      submitTest({
        testTitle: 'Тренировочный вариант ЕГЭ 2026 (Полный вариант)',
        topicId: 'ege_full_variant',
        score: primaryScore,
        total: 50,
        accuracy,
        tabSwitches: acMetricsRef.current.tabSwitches || 0,
        copyAttempts: acMetricsRef.current.copyAttempts || 0,
        hadBrowserExit: Boolean(acMetricsRef.current.hadBrowserExit),
        suspiciousSpeedCount: 0,
        durationSeconds: 210 * 60 - timeLeft
      });
    }

    if (addXP) {
      addXP(primaryScore * 20, accuracy >= 70);
    }
  };

  return (
    <AntiCheatShield
      store={store}
      activityName="Симулятор ЕГЭ 2026/2027"
      isFinished={isFinished}
      onMetricsChange={(m) => { acMetricsRef.current = m; }}
    >
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Top Banner */}
      <div className="card p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.45), rgba(15, 15, 26, 0.95))',
          borderColor: 'rgba(147, 51, 234, 0.4)'
        }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
              <span>🎯</span> Официальная модель ЕГЭ 2026/2027 • 100% авторский контент без плагиата
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Решатель и тренажёр <span className="gradient-text">ЕГЭ по русскому языку</span>
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-2xl">
              27 заданий по спецификации ФИПИ. Авторские алгоритмы решений, моментальная проверка, разборы ловушек и шкала перевода баллов.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => { sounds.click(); setMode('full_exam'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'full_exam'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📝 Полный вариант (27 заданий)
            </button>
            <button
              onClick={() => { sounds.click(); setMode('task_trainer'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'task_trainer'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Тренажёр по темам (1–27)
            </button>
          </div>
        </div>

        {/* Exam Status Bar */}
        {mode === 'full_exam' && !isFinished && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 font-mono font-bold text-sm">
                <span>⏱️</span> {formatTime(timeLeft)}
              </div>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-gray-400 hover:text-white transition-colors"
                title={isTimerRunning ? 'Пауза таймера' : 'Возобновить таймер'}
              >
                {isTimerRunning ? '⏸️' : '▶️'}
              </button>
              <div className="text-gray-300">
                Заполнено ответов: <strong className="text-white">{answeredCount}</strong> из 27
              </div>
            </div>

            <button
              onClick={handleFinishExam}
              className="btn-primary py-2 px-5 text-xs font-bold shadow-lg"
            >
              Завершить экзамен и узнать балл 🏆
            </button>
          </div>
        )}
      </div>

      {/* Results View */}
      {isFinished && results && (
        <div className="card p-6 sm:p-8 space-y-6 border-purple-500/50 bg-purple-950/20 animate-scaleUp">
          <div className="text-center space-y-2">
            <div className="text-5xl animate-bounce">🎓</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Экзамен завершён!</h2>
            <p className="text-gray-300 text-sm">Ваши результаты автоматически записаны в базу данных SQLite</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl sm:text-4xl font-black text-purple-400">{results.scaledScore}</div>
              <div className="text-[11px] text-gray-400 mt-1 uppercase font-bold">Итоговый балл ЕГЭ (из 100)</div>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">{results.primaryScore} / {results.maxPrimary}</div>
              <div className="text-[11px] text-gray-400 mt-1 uppercase font-bold">Первичный балл</div>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl sm:text-4xl font-black text-cyan-400">{results.accuracy}%</div>
              <div className="text-[11px] text-gray-400 mt-1 uppercase font-bold">Точность ответов</div>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-3xl sm:text-4xl font-black text-pink-400">{Math.round(results.durationSpent / 60)} мин</div>
              <div className="text-[11px] text-gray-400 mt-1 uppercase font-bold">Затраченное время</div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Подробный аудит по каждому заданию:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
              {allTasks.map(t => {
                const b = results.taskBreakdown[t.num];
                if (!b) return null;
                return (
                  <div key={t.num} className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    b.isCorrect ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-red-950/20 border-red-500/40 text-red-200'
                  }`}>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{b.isCorrect ? '✅' : '❌'}</span> Задание {t.num} ({t.type === 'essay' ? 'Сочинение' : `${b.earned} / ${b.max} б.`})
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">
                        Твой ответ: <strong className="text-white">{b.userAnswer}</strong>
                      </div>
                      {!b.isCorrect && (
                        <div className="text-[11px] text-emerald-300 mt-0.5">
                          Правильный ответ: <strong>{b.correctAnswer}</strong>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTaskNum(t.num)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white shrink-0"
                    >
                      К заданию ➜
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setIsFinished(false);
                setResults(null);
                setAnswers({});
                setEssayText('');
                setTimeLeft(210 * 60);
              }}
              className="btn-primary py-2.5 px-6 text-xs font-bold"
            >
              Пройти вариант заново 🔄
            </button>
          </div>
        </div>
      )}

      {/* Task Navigator (Swipeable on Mobile) */}
      <div className="card p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-bold uppercase tracking-wider">Задания ЕГЭ:</span>
          <div className="flex items-center gap-2">
            <span className="text-purple-300 font-bold">№{selectedTaskNum} из 27</span>
            <span className="text-[10px] hidden sm:inline text-gray-500">({currentTaskInfo.block})</span>
          </div>
        </div>

        {/* Mobile Horizontal Carousel */}
        <div className="flex sm:grid sm:grid-cols-9 md:grid-cols-14 lg:grid-cols-27 gap-1.5 overflow-x-auto no-scrollbar py-1">
          {allTasks.map(t => {
            const hasAns = answers[t.num] && answers[t.num].length > 0;
            const isEssayDone = t.num === 27 && essayText.trim().length > 30;
            const isCurrent = t.num === selectedTaskNum;
            const res = results?.taskBreakdown[t.num];

            let bgClass = 'bg-white/5 text-gray-300 border-white/10';
            if (isFinished && res) {
              bgClass = res.isCorrect ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-red-600 text-white border-red-400';
            } else if (isCurrent) {
              bgClass = 'bg-purple-600 text-white border-purple-400 shadow-md scale-105';
            } else if (hasAns || isEssayDone) {
              bgClass = 'bg-purple-950/60 text-purple-300 border-purple-500/40';
            }

            return (
              <button
                key={t.num}
                onClick={() => { sounds.click(); setSelectedTaskNum(t.num); }}
                className={`min-w-[42px] sm:min-w-0 py-2.5 text-xs font-bold rounded-xl border text-center transition-all shrink-0 sm:shrink ${bgClass}`}
                title={`Задание ${t.num}: ${EGE_TASKS_INFO.find(info => info.num === t.num)?.title || ''}`}
              >
                {t.num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Task Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task Formulation & Input (Cols 7 or 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="card p-4 sm:p-6 space-y-5 border-purple-500/30">
            {/* Header of Task */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center font-black text-purple-300 text-sm">
                  {currentTask.num}
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {currentTaskInfo.title}
                  </h2>
                  <span className="text-[11px] text-purple-300 font-semibold">
                    {currentTaskInfo.block} • {currentTask.points} {currentTask.points === 1 ? 'балл' : 'балла'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={selectedTaskNum <= 1}
                  onClick={() => setSelectedTaskNum(prev => prev - 1)}
                  className="p-2 sm:px-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white disabled:opacity-30 text-xs font-bold"
                  title="Предыдущее задание"
                >
                  ◀
                </button>
                <button
                  disabled={selectedTaskNum >= 27}
                  onClick={() => setSelectedTaskNum(prev => prev + 1)}
                  className="p-2 sm:px-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white disabled:opacity-30 text-xs font-bold"
                  title="Следующее задание"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Micro-text for tasks 1–3 (Collapsible on Mobile) */}
            {currentTask.num >= 1 && currentTask.num <= 3 && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/20 text-xs sm:text-sm text-gray-300 leading-relaxed font-serif">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-purple-400 uppercase mb-2">
                  <span>Текст к заданиям 1–3:</span>
                  <button
                    type="button"
                    onClick={() => setShowReadingText(!showReadingText)}
                    className="text-[10px] text-gray-400 hover:text-white"
                  >
                    {showReadingText ? '▲ Свернуть' : '▼ Развернуть'}
                  </button>
                </div>
                {showReadingText && EGE_FULL_VARIANT.microText}
              </div>
            )}

            {/* Big text for tasks 22–27 (Collapsible on Mobile) */}
            {currentTask.num >= 22 && currentTask.num <= 27 && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/20 text-xs sm:text-sm text-gray-300 leading-relaxed font-serif space-y-2">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-purple-400 uppercase">
                  <span>Текст ({EGE_FULL_VARIANT.bigText.author}):</span>
                  <button
                    type="button"
                    onClick={() => setShowReadingText(!showReadingText)}
                    className="text-[10px] text-gray-400 hover:text-white"
                  >
                    {showReadingText ? '▲ Свернуть' : '▼ Развернуть'}
                  </button>
                </div>
                {showReadingText && (
                  <div className="whitespace-pre-line max-h-64 sm:max-h-80 overflow-y-auto pr-1">
                    {EGE_FULL_VARIANT.bigText.text}
                  </div>
                )}
              </div>
            )}

            {/* Task Instruction */}
            <div className="text-xs sm:text-sm font-semibold text-gray-200">
              {currentTask.instruction}
            </div>

            {/* Context Sentences for Task 21 */}
            {currentTask.contextSentences && (
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 text-xs text-gray-300 space-y-1.5 font-mono">
                {currentTask.contextSentences.map((sent, i) => (
                  <div key={i}>{sent}</div>
                ))}
              </div>
            )}

            {/* Sentence for Tasks 5, 6, 7, 15, 17, 18, 19, 20 */}
            {currentTask.sentence && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs sm:text-sm text-white font-medium">
                {currentTask.sentence}
              </div>
            )}

            {/* Review text for Task 26 */}
            {currentTask.reviewText && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs sm:text-sm text-gray-200 leading-relaxed">
                {currentTask.reviewText}
              </div>
            )}

            {/* Task Inputs by Type */}
            {/* 1. Multiple Choice (Checkboxes) */}
            {currentTask.type === 'multiple_choice' && currentTask.options && (
              <div className="space-y-2">
                <div className="text-xs text-gray-400 mb-1">Выберите варианты ответов (цифры):</div>
                {currentTask.options.map(opt => {
                  const isSelected = (answers[currentTask.num] || '').includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleOption(currentTask.num, opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-purple-900/40 border-purple-500 text-white shadow'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected ? 'bg-purple-600 border-purple-400 text-white' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Single Choice (Task 2) */}
            {currentTask.type === 'single_choice' && currentTask.options && (
              <div className="space-y-2">
                <div className="text-xs text-gray-400 mb-1">Выберите верные цифры (значения слов):</div>
                {currentTask.options.map(opt => {
                  const isSelected = (answers[currentTask.num] || '').includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleOption(currentTask.num, opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-purple-900/40 border-purple-500 text-white shadow'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected ? 'bg-purple-600 border-purple-400 text-white' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Text Input (Numbers or Word) */}
            {currentTask.type === 'text_input' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase">
                  Ответ (запишите без пробелов, запятых и дефисов):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field text-sm font-mono uppercase tracking-wider py-2.5"
                    placeholder="Ваш ответ..."
                    value={answers[currentTask.num] || ''}
                    onChange={e => handleTextAnswerChange(currentTask.num, e.target.value)}
                  />
                  {answers[currentTask.num] && (
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, [currentTask.num]: '' }))}
                      className="px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                      title="Очистить"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. Matching Table (Task 8 and Task 26) */}
            {currentTask.type === 'matching_table' && (
              <div className="space-y-4">
                {currentTask.errors && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-purple-300 uppercase">Грамматические ошибки (А–Д):</div>
                    {currentTask.errors.map(err => (
                      <div key={err.key} className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                            {err.key}
                          </span>
                          <span className="text-gray-300">{err.text}</span>
                        </div>
                        <select
                          className="bg-black/80 border border-purple-500/40 rounded-lg px-2 py-1 text-xs text-white font-mono"
                          value={matchingAnswers[currentTask.num]?.[err.key] || ''}
                          onChange={e => handleMatchingSelect(currentTask.num, err.key, e.target.value)}
                        >
                          <option value="">Выбрать</option>
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <option key={n} value={n}>Предл. {n}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {currentTask.sentences && (
                  <div className="space-y-1.5 text-xs text-gray-300 p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="font-bold text-gray-400 mb-1">Предложения для выбора:</div>
                    {currentTask.sentences.map(sent => (
                      <div key={sent.id}>{sent.text}</div>
                    ))}
                  </div>
                )}

                {currentTask.terms && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['А', 'Б', 'В', 'Г'].map(letter => (
                        <div key={letter} className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                          <div className="font-bold text-purple-400 mb-1">Пропуск ({letter}):</div>
                          <select
                            className="w-full bg-black/80 border border-purple-500/40 rounded-lg px-2 py-1 text-xs text-white"
                            value={matchingAnswers[currentTask.num]?.[letter] || ''}
                            onChange={e => handleMatchingSelect(currentTask.num, letter, e.target.value)}
                          >
                            <option value="">Термин...</option>
                            {currentTask.terms.map(t => (
                              <option key={t.id} value={t.id}>{t.id}) {t.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-300 p-3 rounded-xl bg-black/30 border border-white/10">
                      {currentTask.terms.map(t => (
                        <div key={t.id}>{t.id}) {t.name}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">Сформированный ответ в бланк:</span>
                  <span className="text-base font-bold text-purple-300 tracking-widest">
                    {answers[currentTask.num] || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Essay (Task 27) */}
            {currentTask.type === 'essay' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Слов: <strong className="text-white font-mono">{essayText.trim().split(/\s+/).filter(Boolean).length}</strong> (мин. 150)
                  </span>
                  <span className="text-purple-300 font-semibold">
                    Критерии 2026/2027: 7 абзацев (К1–К12)
                  </span>
                </div>

                <textarea
                  className="input-field min-h-64 font-serif text-sm leading-relaxed p-4"
                  placeholder="Напишите сочинение-рассуждение по структуре 7 абзацев..."
                  value={essayText}
                  onChange={e => setEssayText(e.target.value)}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    1. Проблема текста
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    2. Пример 1 + пояснение
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    3. Пример 2 + пояснение
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    4. Анализ связи примеров
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    5. Позиция автора
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    6. Своя позиция + аргумент
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                    7. Заключение
                  </div>
                  <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-200 font-bold">
                    Максимум: 21 балл
                  </div>
                </div>
              </div>
            )}

            {/* Explanation Toggle */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setShowExplanation(prev => ({ ...prev, [currentTask.num]: !prev[currentTask.num] }));
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5"
              >
                <span>💡</span> {showExplanation[currentTask.num] ? 'Скрыть разбор' : 'Показать разбор и ответ'}
              </button>

              {isFinished && results?.taskBreakdown[currentTask.num] && (
                <div className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  results.taskBreakdown[currentTask.num].isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {results.taskBreakdown[currentTask.num].isCorrect ? 'Верно (+1 б.)' : 'Неверно (0 б.)'}
                </div>
              )}
            </div>

            {/* Detailed Explanation Box */}
            {showExplanation[currentTask.num] && currentTask.explanation && (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-xs sm:text-sm text-purple-200 space-y-2 animate-fadeIn">
                <div className="font-bold flex items-center gap-2 text-white">
                  <span>🔑</span> Правильный ответ: <code className="bg-purple-900/60 px-2 py-0.5 rounded text-white font-mono">{currentTask.answer}</code>
                </div>
                <p className="leading-relaxed opacity-90">
                  {currentTask.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Zero-Plagiarism Author Algorithm & Traps (Cols 5 or 4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Author Algorithm Card */}
          <div className="card p-5 space-y-4 border-indigo-500/40 bg-indigo-950/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="text-sm font-bold text-white">Авторский алгоритм решения</h3>
                <div className="text-[10px] text-indigo-300">Формула: {currentTaskInfo.formula}</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300">
              {currentTaskInfo.algorithm.map((step, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-black/40 border border-indigo-500/20 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FIPI Trap Card */}
          <div className="card p-5 space-y-3 border-amber-500/40 bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <span>⚠️</span> Ловушка составителей ФИПИ
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {currentTaskInfo.trap}
            </p>
          </div>

          {/* Scale Table Quick Reference */}
          <div className="card p-5 space-y-3 border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300">Шкала перевода баллов 2026:</span>
              <span className="text-[10px] text-purple-400">Первичный ➜ Тестовый</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
              <div className="p-1.5 rounded bg-white/5"><div className="text-gray-400">16 б.</div><div className="text-purple-300 font-bold">40 (порог)</div></div>
              <div className="p-1.5 rounded bg-white/5"><div className="text-gray-400">25 б.</div><div className="text-purple-300 font-bold">58 б.</div></div>
              <div className="p-1.5 rounded bg-white/5"><div className="text-gray-400">35 б.</div><div className="text-purple-300 font-bold">77 б.</div></div>
              <div className="p-1.5 rounded bg-white/5"><div className="text-gray-400">45 б.</div><div className="text-emerald-300 font-bold">97 б.</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Floating Thumb Bar (One-hand control) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 p-2 bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-purple-500/30 flex items-center justify-between gap-2 shadow-2xl safe-bottom">
        <button
          disabled={selectedTaskNum <= 1}
          onClick={() => { sounds.click(); setSelectedTaskNum(p => Math.max(1, p - 1)); }}
          className="flex-1 py-3 rounded-xl bg-white/10 text-xs font-bold text-white disabled:opacity-20 active:scale-95 flex items-center justify-center gap-1"
        >
          ◀ Пред.
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.click();
            setShowExplanation(prev => ({ ...prev, [currentTask.num]: !prev[currentTask.num] }));
          }}
          className="px-3.5 py-3 rounded-xl bg-purple-600/30 border border-purple-500/50 text-xs font-bold text-purple-200 active:scale-95 shrink-0"
        >
          💡 Разбор
        </button>

        <button
          disabled={selectedTaskNum >= 27}
          onClick={() => { sounds.click(); setSelectedTaskNum(p => Math.min(27, p + 1)); }}
          className="flex-1 py-3 rounded-xl bg-purple-600 text-xs font-bold text-white disabled:opacity-20 active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-purple-600/40"
        >
          След. ▶
        </button>

        {!isFinished && (
          <button
            onClick={handleFinishExam}
            className="px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white active:scale-95 shrink-0"
            title="Завершить экзамен"
          >
            🏆
          </button>
        )}
      </div>
    </div>
    </AntiCheatShield>
  );
}
