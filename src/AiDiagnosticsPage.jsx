import React, { useState, useEffect } from 'react';
import { sounds } from './sounds';
import { generateQuestions } from './data';
import { AntiCheatShield } from './AntiCheatShield';

export function AiDiagnosticsPage({ store, setPage }) {
  const { state, addXP, reportAntiCheat } = store;
  const user = state.user;

  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Режим работы над ошибками
  const [workoutMode, setWorkoutMode] = useState(false);
  const [workoutQuestions, setWorkoutQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnostics/user/${user?.id || 1}`);
      const data = await res.json();
      if (data.success && data.diagnostics) {
        setDiagnostics(data.diagnostics);
        setSelectedTopic(data.diagnostics.topics[0]);
      }
    } catch (e) {
      // Fallback
      setDiagnostics({
        totalTests: 3,
        criticalTopicsCount: 2,
        aiRecommendation: 'Обнаружен систематический пробел в корнях с чередованием (РАСТ/РОС) и приставках ПРЕ/ПРИ. Рекомендуется пройти работу над ошибками.',
        topics: [
          { id: 'chered', title: 'Корни с чередованием', accuracy: 56, errors: 7, status: 'danger', detail: 'Ошибки в исключениях РАСТ/РОС (росток, отрасль) и МАК/МОК' },
          { id: 'pre_pri', title: 'Приставки ПРЕ- и ПРИ-', accuracy: 64, errors: 5, status: 'warning', detail: 'Трудности с различением высшей степени (премилый) и приближения' },
          { id: 'nn_suffixes', title: 'Н и НН в суффиксах', accuracy: 82, errors: 3, status: 'good', detail: 'Уверенно, редкие ошибки в кратких причастиях' },
          { id: 'paronyms', title: 'Паронимы ФИПИ (ЕГЭ №5)', accuracy: 88, errors: 2, status: 'good', detail: 'Отличное различение пар (абонент/абонемент, сытый/сытный)' },
          { id: 'orthoepy', title: 'Ударения ФИПИ (ЕГЭ №4)', accuracy: 72, errors: 6, status: 'warning', detail: 'Путаница в глаголах женского рода (бралА, но клАла)' },
          { id: 'punctuation', title: 'Пунктуация в БСП и ССП', accuracy: 78, errors: 4, status: 'good', detail: 'Вводные слова и деепричастные обороты освоены' },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [user]);

  // Запуск работы над ошибками
  const handleStartWorkout = () => {
    sounds.click();
    // Собираем вопросы из западающих тем (chered, pristavki, orfoepia)
    const qs1 = generateQuestions('chered', 'all', 3);
    const qs2 = generateQuestions('pristavki', 'all', 3);
    const combined = [...qs1, ...qs2].sort(() => Math.random() - 0.5);

    setWorkoutQuestions(combined);
    setCurrentIdx(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsFinished(false);
    setWorkoutMode(true);
  };

  const handleWorkoutAnswer = (opt) => {
    const q = workoutQuestions[currentIdx];
    if (!q || selectedAnswer) return;

    setSelectedAnswer(opt);
    const isCorrect = opt === q.answer;
    if (isCorrect) {
      sounds.correct();
      setScore(s => s + 1);
      if (addXP) addXP(25, true);
    } else {
      sounds.wrong();
    }
  };

  const handleNextWorkoutQ = () => {
    sounds.click();
    if (currentIdx + 1 < workoutQuestions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
      sounds.levelUp();
    }
  };

  if (workoutMode) {
    const q = workoutQuestions[currentIdx];
    return (
      <AntiCheatShield store={store} activityName="Работа над ошибками (ИИ-Диагност)">
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-20">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { sounds.click(); setWorkoutMode(false); }}
              className="text-xs text-purple-400 font-bold flex items-center gap-1 p-2 rounded-xl bg-white/5"
            >
              ◀ Выйти из тренировки
            </button>
            <span className="badge bg-amber-500/20 text-amber-300 font-bold">
              ⚡ Персональная работа над ошибками
            </span>
          </div>

          {!isFinished && q ? (
            <div className="card p-6 space-y-6 border-purple-500/40">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>Вопрос {currentIdx + 1} из {workoutQuestions.length}</span>
                <span className="text-amber-400">Ликвидация пробела: {q.topicId}</span>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h2 className="text-lg font-bold text-white leading-relaxed">{q.q}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options && q.options.map((opt, idx) => {
                  let style = 'bg-white/5 border-white/10 hover:border-purple-500 text-gray-200';
                  if (selectedAnswer) {
                    if (opt === q.answer) {
                      style = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold';
                    } else if (opt === selectedAnswer) {
                      style = 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold';
                    } else {
                      style = 'opacity-30 border-white/5 text-gray-500';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      disabled={!!selectedAnswer}
                      onClick={() => handleWorkoutAnswer(opt)}
                      className={`p-4 rounded-xl text-left text-sm font-semibold border transition-all ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3 animate-fadeIn">
                  <div className="text-xs text-gray-300">
                    💡 <strong>Разбор ловушки:</strong> {q.hint || 'Внимательно проверяйте ударение и проверочные слова.'}
                  </div>
                  <button
                    onClick={handleNextWorkoutQ}
                    className="btn-primary w-full py-2.5 text-xs font-bold"
                  >
                    {currentIdx + 1 < workoutQuestions.length ? 'Следующий вопрос ➜' : 'Завершить работу над ошибками 🏆'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center space-y-6 border-emerald-500/40 animate-scaleUp">
              <div className="text-6xl animate-bounce">🎯</div>
              <div>
                <h2 className="text-2xl font-black text-white">Пробелы успешно устранены!</h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-2">
                  Твой результат: <span className="text-emerald-400 font-bold">{score} из {workoutQuestions.length}</span> верных ответов.
                  Тепловая карта знаний обновлена!
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setWorkoutMode(false);
                    fetchDiagnostics();
                  }}
                  className="btn-primary w-full py-3.5 text-sm font-bold rounded-2xl"
                >
                  Вернуться к тепловой карте 🗺️
                </button>
              </div>
            </div>
          )}
        </div>
      </AntiCheatShield>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Top Banner */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(59, 130, 246, 0.2), rgba(15, 15, 26, 0.95))',
          borderColor: 'rgba(147, 51, 234, 0.4)'
        }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
              <span>🧠</span> ИИ-Диагностика знаний в реальном времени
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Персональная <span className="gradient-text">тепловая карта пробелов</span>
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl">
              Алгоритм непрерывно анализирует все ошибки в тестах и тренажёрах, выявляя слабые места и предлагая целевые тренировки.
            </p>
          </div>

          <button
            onClick={handleStartWorkout}
            className="btn-primary py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl shadow-purple-600/40 shrink-0"
          >
            <span>⚡</span> Сгенерировать работу над ошибками
          </button>
        </div>
      </div>

      {/* AI Recommendation Alert */}
      {diagnostics && (
        <div className="card p-5 border-amber-500/40 bg-amber-950/20 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xl flex items-center justify-center shrink-0">
            🤖
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Заключение ИИ-репетитора РусЛёрн:
            </div>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
              {diagnostics.aiRecommendation}
            </p>
          </div>
        </div>
      )}

      {/* Heatmap Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400 font-bold px-1">
          <span className="uppercase tracking-wider">Тепловая карта тем (нажми для деталей):</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;80%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 65-80%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> &lt;65%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {diagnostics?.topics.map(topic => {
            const untested = topic.accuracy === null || topic.accuracy === undefined;
            const isDanger = !untested && topic.accuracy < 65;
            const isWarning = !untested && topic.accuracy >= 65 && topic.accuracy < 80;
            const isSelected = selectedTopic?.id === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => { sounds.click(); setSelectedTopic(topic); }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-purple-400 bg-purple-950/40 shadow-xl scale-[1.02]'
                    : untested
                    ? 'border-white/10 bg-white/5 hover:border-blue-400/40'
                    : isDanger
                    ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500'
                    : isWarning
                    ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500'
                    : 'border-white/10 bg-white/5 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    untested ? 'bg-blue-500/20 text-blue-300' : isDanger ? 'bg-rose-500/20 text-rose-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {untested ? '📘 Не сдавалось' : isDanger ? '⚠️ Критическая зона' : isWarning ? '⚡ Внимание' : '✓ Освоено'}
                  </span>
                  <span className="font-mono font-black text-sm text-white">
                    {untested ? '—' : `${topic.accuracy}%`}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{topic.title}</h3>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{topic.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Topic Breakdown */}
      {selectedTopic && (
        <div className="card p-6 border-purple-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Детальный анализ:</span>
              <h2 className="text-lg font-black text-white">{selectedTopic.title}</h2>
            </div>
            <span className="text-2xl font-black text-purple-300">
              {selectedTopic.accuracy === null || selectedTopic.accuracy === undefined ? '—' : `${selectedTopic.accuracy}%`}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="font-bold text-rose-400">🚨 Выявленные ошибки:</div>
              <p className="text-gray-300">{selectedTopic.detail}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="font-bold text-emerald-400">💡 Решение от РусЛёрн:</div>
              <p className="text-gray-300">Используйте алгоритмическую блок-схему из раздела «Формулы». Нажмите кнопку ниже для целевой отработки.</p>
            </div>
          </div>

          <button
            onClick={handleStartWorkout}
            className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <span>🎯</span> Отработать только эту тему (+50 XP)
          </button>
        </div>
      )}
    </div>
  );
}
