import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OGE_CATEGORIES, OGE_TASKS_DB, OGE_GRADE_SCALE, convertPercentToSchoolGrade } from './ogeData';
import { AntiCheatShield } from './AntiCheatShield';
import { sounds } from './sounds';

// Детерминированный генератор случайных чисел по номеру варианта (как на Решу ОГЭ!)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeeded(arr, count, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function ReshuOgePage({ store, setPage, initialAssignment = null, onClearAssignment }) {
  const { state, submitTest, addXP } = store;
  const user = state.user;
  const isTeacher = user?.role === 'teacher';

  const [tab, setTab] = useState('catalog'); // 'catalog' | 'variants' | 'favorites' | 'scale'
  const [counts, setCounts] = useState(() => {
    const init = {};
    OGE_CATEGORIES.forEach(c => { init[c.num] = 1; });
    return init;
  });
  const [customVariantInput, setCustomVariantInput] = useState('2026');
  const [strictExamMode, setStrictExamMode] = useState(true);

  // Прогресс и избранное из SQLite
  const [taskProgress, setTaskProgress] = useState({});

  // Состояние активного прохождения теста / варианта
  const [activeSession, setActiveSession] = useState(null);
  // { title, variantId, assignmentId, strictAnticheat, questions: [], startedAt }
  const [answers, setAnswers] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [showHint, setShowHint] = useState({});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState(null);
  const acMetricsRef = useRef({ tabSwitches: 0, copyAttempts: 0, hadBrowserExit: false });

  // Модалка быстрого назначения классу/ученику (только для учителя)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState('Вариант ОГЭ по русскому языку');
  const [assignTargetType, setAssignTargetType] = useState('class');
  const [assignClass, setAssignClass] = useState('9Б');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignStrict, setAssignStrict] = useState(true);
  const [classesList, setClassesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/user/${user.id}/task-progress`)
      .then(r => r.json())
      .then(d => { if (d.progress) setTaskProgress(d.progress); })
      .catch(() => {});

    if (isTeacher) {
      fetch('/api/classes')
        .then(r => r.json())
        .then(d => { if (d.classes) setClassesList(d.classes); })
        .catch(() => {});
      fetch('/api/teacher/students?status=active')
        .then(r => r.json())
        .then(d => {
          if (d.students) {
            setStudentsList(d.students);
            if (d.students[0]) setAssignStudentId(String(d.students[0].id));
          }
        })
        .catch(() => {});
    }
  }, [user?.id, isTeacher]);

  // Автозапуск, если ученик перешёл из "Задания от учителя"
  useEffect(() => {
    if (!initialAssignment) return;
    const cfg = initialAssignment.taskConfig || {};
    if (cfg.variantId) {
      startVariantByNumber(cfg.variantId, initialAssignment);
    } else if (cfg.counts) {
      startCustomSelection(cfg.counts, initialAssignment);
    } else {
      startVariantByNumber(String(initialAssignment.id * 101 + 2000), initialAssignment);
    }
  }, [initialAssignment]);

  // Таймер
  useEffect(() => {
    if (!activeSession || isFinished) return;
    const iv = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [activeSession, isFinished]);

  const toggleFavorite = async (taskId) => {
    sounds.click();
    const cur = Boolean(taskProgress[taskId]?.is_favorite);
    const nextVal = !cur;
    setTaskProgress(prev => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || { task_key: taskId }), is_favorite: nextVal ? 1 : 0 }
    }));
    if (user?.id) {
      fetch(`/api/user/${user.id}/task-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskKey: taskId, isFavorite: nextVal })
      }).catch(() => {});
    }
  };

  const buildQuestionsFromCounts = (countsObj, seedVal = Date.now()) => {
    const rng = mulberry32(seedVal);
    const list = [];
    OGE_CATEGORIES.forEach(cat => {
      const need = countsObj[cat.num] || 0;
      if (need > 0 && OGE_TASKS_DB[cat.num]) {
        const picked = pickSeeded(OGE_TASKS_DB[cat.num], need, rng);
        picked.forEach(q => list.push({ ...q, catTitle: cat.shortTitle, answerHint: cat.answerHint, formula: cat.formula }));
      }
    });
    return list;
  };

  const launchSession = (questions, title, variantId = null, assignmentObj = null, strictModeOverride = null) => {
    if (!questions || questions.length === 0) return;
    sounds.click();
    acMetricsRef.current = { tabSwitches: 0, copyAttempts: 0, hadBrowserExit: false };
    setAnswers({});
    setShowHint({});
    setActiveIdx(0);
    setElapsedSec(0);
    setIsFinished(false);
    setResults(null);
    setActiveSession({
      title,
      variantId,
      assignmentId: assignmentObj?.id || null,
      strictAnticheat: strictModeOverride !== null
        ? strictModeOverride
        : (assignmentObj ? Boolean(assignmentObj.strict_anticheat) : strictExamMode),
      questions,
      startedAt: Date.now()
    });
  };

  const startCustomSelection = (customCounts = counts, assignmentObj = null) => {
    const qs = buildQuestionsFromCounts(customCounts, Date.now());
    if (qs.length === 0) {
      alert('Выберите хотя бы 1 задание в каталоге!');
      return;
    }
    launchSession(
      qs,
      assignmentObj ? assignmentObj.title : `Собранный тест ОГЭ (${qs.length} зад.)`,
      null,
      assignmentObj
    );
  };

  const startSingleLine = (taskNum) => {
    const pool = OGE_TASKS_DB[taskNum] || [];
    const cat = OGE_CATEGORIES.find(c => c.num === taskNum);
    const qs = pool.map(q => ({
      ...q,
      catTitle: cat?.shortTitle || `Задание ${taskNum}`,
      answerHint: cat?.answerHint || '',
      formula: cat?.formula || ''
    }));
    launchSession(qs, `ОГЭ Задание №${taskNum}: ${cat?.shortTitle || ''}`);
  };

  const startVariantByNumber = (varId, assignmentObj = null) => {
    const numericSeed = Math.abs(parseInt(varId, 10) || varId.toString().split('').reduce((a, c) => a + c.charCodeAt(0), 100));
    const oneEach = {};
    OGE_CATEGORIES.forEach(c => { oneEach[c.num] = 1; });
    const qs = buildQuestionsFromCounts(oneEach, numericSeed);
    launchSession(
      qs,
      assignmentObj ? assignmentObj.title : `Вариант ОГЭ #${varId}`,
      String(varId),
      assignmentObj
    );
  };

  const startFavoritesPractice = () => {
    const allTasks = Object.values(OGE_TASKS_DB).flat();
    const favs = allTasks.filter(t => taskProgress[t.id]?.is_favorite).map(q => {
      const cat = OGE_CATEGORIES.find(c => c.num === q.num);
      return { ...q, catTitle: cat?.shortTitle || '', answerHint: cat?.answerHint || '', formula: cat?.formula || '' };
    });
    if (favs.length === 0) return;
    launchSession(favs, 'Повторение избранных заданий ⭐', null, null, false);
  };

  const totalSelectedCount = useMemo(() => {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }, [counts]);

  const favoriteCount = useMemo(() => {
    return Object.values(taskProgress).filter(p => p.is_favorite).length;
  }, [taskProgress]);

  const solvedCount = useMemo(() => {
    return Object.values(taskProgress).filter(p => p.is_solved && p.is_correct).length;
  }, [taskProgress]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishSession = async () => {
    if (!activeSession || isFinished) return;
    sounds.levelUp();

    let correctCount = 0;
    const breakdown = activeSession.questions.map(q => {
      const rawUser = (answers[q.id] || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      const acceptable = (q.acceptableAnswers || [q.answer]).map(a => a.toString().trim().toLowerCase().replace(/\s+/g, ''));
      const isCorrect = rawUser.length > 0 && acceptable.includes(rawUser);
      if (isCorrect) correctCount++;

      // Сохраняем в user_task_progress в SQLite
      if (user?.id) {
        setTaskProgress(prev => ({
          ...prev,
          [q.id]: { ...(prev[q.id] || { task_key: q.id }), is_solved: 1, is_correct: isCorrect ? 1 : 0 }
        }));
        fetch(`/api/user/${user.id}/task-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskKey: q.id, isSolved: true, isCorrect })
        }).catch(() => {});
      }

      return {
        ...q,
        userAnswer: answers[q.id] || '(нет ответа)',
        isCorrect
      };
    });

    const total = breakdown.length;
    const accuracy = Math.round((correctCount / total) * 100);
    const schoolGrade = convertPercentToSchoolGrade(accuracy);

    setResults({
      correctCount,
      total,
      accuracy,
      schoolGrade,
      breakdown,
      durationSeconds: elapsedSec
    });
    setIsFinished(true);

    if (submitTest) {
      await submitTest({
        testTitle: activeSession.title,
        topicId: 'reshu_oge',
        assignmentId: activeSession.assignmentId,
        variantId: activeSession.variantId,
        score: correctCount,
        total,
        accuracy,
        tabSwitches: acMetricsRef.current.tabSwitches || 0,
        copyAttempts: acMetricsRef.current.copyAttempts || 0,
        hadBrowserExit: Boolean(acMetricsRef.current.hadBrowserExit),
        durationSeconds: elapsedSec
      });
    }

    if (addXP) {
      addXP(correctCount * 30, accuracy >= 65);
    }

    if (onClearAssignment) onClearAssignment();
  };

  const handleWorkOnMistakes = () => {
    if (!results) return;
    const wrongLines = [...new Set(results.breakdown.filter(b => !b.isCorrect).map(b => b.num))];
    if (wrongLines.length === 0) return;
    const wrongCounts = {};
    wrongLines.forEach(num => { wrongCounts[num] = 2; });
    const qs = buildQuestionsFromCounts(wrongCounts, Date.now() + 7);
    launchSession(qs, 'ОГЭ: Работа над ошибками 🔁', null, null, false);
  };

  const handleAssignToStudents = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: assignTitle,
        description: `Собрано через каталог Решу ОГЭ (${totalSelectedCount} зад.)`,
        targetType: assignTargetType,
        targetClass: assignTargetType === 'class' ? assignClass : '',
        targetStudentId: assignTargetType === 'student' ? Number(assignStudentId) : null,
        mode: 'reshu_oge',
        taskConfig: { counts },
        questionCount: totalSelectedCount,
        strictAnticheat: assignStrict,
        dueDate: assignDueDate,
        createdBy: user?.id || 1,
        createdByName: user?.name || 'Учитель'
      };
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sounds.levelUp();
      setAssignSuccessMsg('✅ Задание успешно выдано в личный кабинет учеников!');
      setTimeout(() => {
        setAssignModalOpen(false);
        setAssignSuccessMsg('');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Ошибка назначения');
    }
  };

  // ===========================================================================
  // АКТИВНОЕ РЕШЕНИЕ ВАРИАНТА / ТЕСТА (И РЕЗУЛЬТАТЫ КАК НА РЕШУ ОГЭ)
  // ===========================================================================
  if (activeSession) {
    const content = (
      <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn pb-20">
        {/* Верхняя панель статуса */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {(!activeSession.strictAnticheat || isFinished || isTeacher) && (
              <button
                onClick={() => {
                  sounds.click();
                  setActiveSession(null);
                  setIsFinished(false);
                  if (onClearAssignment) onClearAssignment();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200"
              >
                ◀ К каталогу
              </button>
            )}
            <div>
              <h2 className="font-black text-white text-sm sm:text-base">{activeSession.title}</h2>
              <div className="text-[11px] text-gray-400">
                {activeSession.variantId ? `Вариант #${activeSession.variantId} • ` : ''}
                Заданий: {activeSession.questions.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 font-mono text-xs font-bold text-purple-200">
              ⏱️ {formatTimer(elapsedSec)}
            </div>
            {!isFinished && (
              <button
                onClick={() => window.print()}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-gray-300 hover:text-white no-print"
              >
                🖨️ Печать
              </button>
            )}
          </div>
        </div>

        {/* ЭКРАН РЕЗУЛЬТАТОВ В СТИЛЕ РЕШУ ОГЭ */}
        {isFinished && results ? (
          <div className="space-y-6">
            <div className={`card p-6 sm:p-8 border ${results.schoolGrade.bg} space-y-5`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="badge bg-black/40 text-white text-xs mb-2">Протокол «Решу ОГЭ РусЛёрн»</span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Вы набрали {results.correctCount} из {results.total} ({results.accuracy}%)
                  </h2>
                  <p className="text-xs text-gray-300 mt-1">
                    Время: {formatTimer(results.durationSeconds)} · Результат сохранён в базе данных
                  </p>
                </div>

                <div className="text-center px-6 py-4 rounded-2xl bg-black/40 border border-white/15 shrink-0">
                  <div className="text-[11px] text-gray-400 uppercase font-bold">Школьная оценка</div>
                  <div className={`text-3xl sm:text-4xl font-black ${results.schoolGrade.color}`}>
                    {results.schoolGrade.text}
                  </div>
                </div>
              </div>

              {/* Сетка результатов как на Решу ОГЭ */}
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="p-2 border border-white/10 bg-black/30">№</th>
                      <th className="p-2 border border-white/10 bg-black/30 text-left">Линия ФИПИ</th>
                      <th className="p-2 border border-white/10 bg-black/30">Ваш ответ</th>
                      <th className="p-2 border border-white/10 bg-black/30">Верный ответ</th>
                      <th className="p-2 border border-white/10 bg-black/30">Балл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.breakdown.map((item, idx) => (
                      <tr key={item.id} className={item.isCorrect ? 'bg-emerald-950/30' : 'bg-rose-950/30'}>
                        <td className="p-2.5 border border-white/10 font-bold text-white">{idx + 1}</td>
                        <td className="p-2.5 border border-white/10 text-left text-gray-200">
                          Задание №{item.num} · {item.catTitle}
                        </td>
                        <td className={`p-2.5 border border-white/10 font-mono font-bold ${item.isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {item.userAnswer}
                        </td>
                        <td className="p-2.5 border border-white/10 font-mono font-bold text-emerald-400">
                          {item.answer}
                        </td>
                        <td className="p-2.5 border border-white/10 font-bold">
                          {item.isCorrect ? '1 ✅' : '0 ❌'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-3">
                {results.correctCount < results.total && (
                  <button onClick={handleWorkOnMistakes} className="btn-primary text-xs py-2.5 px-5">
                    🔁 Работа над ошибками (перерешать заваленные темы)
                  </button>
                )}
                <button
                  onClick={() => { setActiveSession(null); setIsFinished(false); }}
                  className="btn-secondary text-xs py-2.5 px-5"
                >
                  ◀ Вернуться в каталог
                </button>
                <button onClick={() => window.print()} className="btn-secondary text-xs py-2.5 px-5 no-print">
                  🖨️ Сохранить в PDF / Печать
                </button>
              </div>
            </div>

            {/* Подробный разбор КАЖДОГО задания (как на Решу ОГЭ!) */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-white">📖 Подробные решения и пояснения</h3>
              {results.breakdown.map((item, idx) => (
                <div key={item.id} className={`card p-5 space-y-3 border ${item.isCorrect ? 'border-emerald-500/30' : 'border-rose-500/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        №{idx + 1} (Тип {item.num} • {item.code})
                      </span>
                      <span className="text-xs text-gray-400">{item.catTitle}</span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Сохранить в Избранное"
                    >
                      {taskProgress[item.id]?.is_favorite ? '⭐' : '☆'}
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-white">{item.prompt}</p>
                  {item.text && (
                    <div className="p-3.5 rounded-xl bg-black/35 border border-white/10 text-xs sm:text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                      {item.text}
                    </div>
                  )}
                  {item.options && (
                    <div className="space-y-1 pl-2 text-xs text-gray-300">
                      {item.options.map((op, oi) => <div key={oi}>{op}</div>)}
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-100 whitespace-pre-line leading-relaxed">
                    <div className="font-bold text-blue-300 mb-1">💡 Пояснение эксперта ФИПИ:</div>
                    {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* РЕШЕНИЕ ЗАДАНИЙ */
          <div className="grid lg:grid-cols-4 gap-5 items-start">
            {/* Навигатор по номерам (как справа на Решу ОГЭ) */}
            <div className="lg:order-2 card p-4 space-y-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Навигация по номерам</div>
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2">
                {activeSession.questions.map((q, idx) => {
                  const hasAns = Boolean((answers[q.id] || '').trim());
                  return (
                    <button
                      key={q.id}
                      onClick={() => { sounds.click(); setActiveIdx(idx); }}
                      className={`h-10 rounded-xl font-bold text-xs border transition-all ${
                        activeIdx === idx
                          ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-105'
                          : hasAns
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-[11px] text-gray-400 flex justify-between">
                  <span>Дано ответов:</span>
                  <strong className="text-white">
                    {activeSession.questions.filter(q => (answers[q.id] || '').trim()).length} / {activeSession.questions.length}
                  </strong>
                </div>
                <button
                  onClick={handleFinishSession}
                  className="btn-primary w-full py-2.5 text-xs font-black"
                >
                  ✅ Завершить и сдать
                </button>
              </div>
            </div>

            {/* Активная карточка задания */}
            {(() => {
              const q = activeSession.questions[activeIdx];
              if (!q) return null;
              return (
                <div className="lg:col-span-3 lg:order-1 card p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold">
                        Вопрос {activeIdx + 1} из {activeSession.questions.length}
                      </span>
                      <span className="badge bg-white/10 text-gray-300 text-xs">
                        ОГЭ №{q.num} • {q.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(q.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-amber-300 hover:bg-white/10"
                    >
                      {taskProgress[q.id]?.is_favorite ? '⭐ В избранном' : '☆ В избранное'}
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white leading-relaxed">{q.prompt}</h3>

                  {q.text && (
                    <div className="p-4 rounded-2xl bg-black/35 border border-white/10 text-xs sm:text-sm text-gray-100 whitespace-pre-line leading-relaxed select-none">
                      {q.text}
                    </div>
                  )}

                  {q.options && (
                    <div className="space-y-2">
                      {q.options.map((op, oi) => {
                        const digit = String(oi + 1);
                        const curAns = (answers[q.id] || '').toString();
                        const checked = curAns.includes(digit);
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => {
                              sounds.click();
                              const next = checked
                                ? curAns.replace(digit, '')
                                : (curAns + digit).split('').sort().join('');
                              setAnswers(prev => ({ ...prev, [q.id]: next }));
                            }}
                            className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-all ${
                              checked
                                ? 'bg-purple-900/50 border-purple-400 text-white font-semibold'
                                : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              checked ? 'bg-purple-500 text-white' : 'bg-black/40 text-gray-400'
                            }`}>
                              {checked ? '✓' : digit}
                            </span>
                            <span className="leading-relaxed">{op}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Поле ввода ответа (работает как на бланке Решу ОГЭ) */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <label className="block text-xs font-bold text-purple-300">
                      Ваш ответ ({q.answerHint}):
                    </label>
                    <input
                      type="text"
                      className="input-field font-mono font-bold text-base py-2.5"
                      placeholder="Введите цифры или слово без пробелов..."
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>

                  {/* Кнопка алгоритма-подсказки (только вне строгого контрольного режима!) */}
                  {!activeSession.strictAnticheat && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowHint(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                        className="text-xs font-bold text-amber-300 hover:underline"
                      >
                        {showHint[q.id] ? '▲ Скрыть памятку-алгоритм' : '💡 Показать подсказку (алгоритм ФИПИ)'}
                      </button>
                      {showHint[q.id] && (
                        <div className="mt-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-100">
                          {q.formula}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Назад / Далее */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={activeIdx === 0}
                      onClick={() => { sounds.click(); setActiveIdx(i => Math.max(0, i - 1)); }}
                      className="btn-secondary text-xs py-2 px-4 disabled:opacity-40"
                    >
                      ← Предыдущее
                    </button>
                    {activeIdx + 1 < activeSession.questions.length ? (
                      <button
                        type="button"
                        onClick={() => { sounds.click(); setActiveIdx(i => i + 1); }}
                        className="btn-primary text-xs py-2 px-5"
                      >
                        Следующее →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinishSession}
                        className="btn-primary text-xs py-2 px-5 bg-gradient-to-r from-emerald-600 to-teal-600"
                      >
                        🏁 Проверить всю работу
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );

    if (activeSession.strictAnticheat) {
      return (
        <AntiCheatShield
          store={store}
          activityName={activeSession.title}
          isFinished={isFinished}
          strictFullscreen={true}
          onMetricsChange={(m) => { acMetricsRef.current = m; }}
        >
          {content}
        </AntiCheatShield>
      );
    }
    return content;
  }

  // ===========================================================================
  // ГЛАВНЫЙ КАТАЛОГ «РЕШУ ОГЭ»
  // ===========================================================================
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Шапка в стиле Решу ОГЭ */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(124, 58, 237, 0.25))',
          borderColor: 'rgba(96, 165, 250, 0.35)'
        }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold mb-2">
              <span>📘 СДАМ ГИА • РУСЛЁРН</span>
              <span>•</span>
              <span>ОГЭ 2026 (9 класс)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Образовательный портал <span className="gradient-text">«Решу ОГЭ РусЛёрн»</span>
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Конструктор вариантов по номерам 2–12, точные номера вариантов, разборы ФИПИ, шкала оценки 2–5 и режим античита!
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Решено типов</div>
              <div className="text-lg font-black text-emerald-400">{solvedCount}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-gray-400 uppercase font-bold">Избранное ⭐</div>
              <div className="text-lg font-black text-amber-400">{favoriteCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Вкладки портала */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'catalog', label: '🗂️ Каталог заданий (2–12)' },
          { id: 'variants', label: '🎲 Варианты по № / КИМ' },
          { id: 'favorites', label: `⭐ Избранное (${favoriteCount})` },
          { id: 'scale', label: '📊 Шкала оценок ФИПИ' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { sounds.click(); setTab(t.id); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}

        <button
          onClick={() => setPage('ege_exam')}
          className="ml-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-950/60 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60"
        >
          📕 Перейти к ЕГЭ (10–11 кл.) ➜
        </button>
      </div>

      {/* ВКЛАДКА 1: КОНСТРУКТОР КАК НА РЕШУ ОГЭ */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          {/* Верхняя панель конструктора */}
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/30">
            <div className="space-y-1">
              <div className="text-sm font-black text-white">
                Выбрано заданий в тест: <span className="text-blue-400">{totalSelectedCount}</span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictExamMode}
                  onChange={e => setStrictExamMode(e.target.checked)}
                  className="rounded accent-purple-500 w-4 h-4"
                />
                <span>🛡️ Включить строгий античит (полный экран + детект выхода из браузера)</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const reset = {};
                  OGE_CATEGORIES.forEach(c => { reset[c.num] = 0; });
                  setCounts(reset);
                }}
                className="btn-secondary text-xs py-2 px-3"
              >
                Сбросить
              </button>
              <button
                onClick={() => startCustomSelection(counts)}
                className="btn-primary text-xs py-2.5 px-5 font-black"
              >
                🚀 Составить тест ({totalSelectedCount})
              </button>
              {isTeacher && (
                <button
                  onClick={() => { sounds.click(); setAssignModalOpen(true); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                >
                  📤 Задать ученикам / классу
                </button>
              )}
            </div>
          </div>

          {/* Таблица номеров ОГЭ */}
          <div className="grid gap-2.5">
            {OGE_CATEGORIES.map(cat => {
              const available = (OGE_TASKS_DB[cat.num] || []).length;
              const selected = counts[cat.num] || 0;
              return (
                <div
                  key={cat.num}
                  className="card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-300 text-sm shrink-0">
                      №{cat.num}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">{cat.title}</div>
                      <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 mt-0.5">
                        <span className="text-purple-300">{cat.block}</span>
                        <span>•</span>
                        <span>В банке: {available} заданий</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Счётчик - / + как на Решу ОГЭ */}
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setCounts(p => ({ ...p, [cat.num]: Math.max(0, (p[cat.num] || 0) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 font-bold text-white text-sm"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-white">
                        {selected}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCounts(p => ({ ...p, [cat.num]: Math.min(available, (p[cat.num] || 0) + 1) }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 font-bold text-white text-sm"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => startSingleLine(cat.num)}
                      className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/30 text-xs font-bold transition-all"
                    >
                      Решать тему ➜
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ВКЛАДКА 2: ВАРИАНТЫ ПО НОМЕРУ И ГОТОВЫЕ КИМЫ */}
      {tab === 'variants' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-black text-white">🔢 Открыть вариант по номеру (как на Решу ОГЭ)</h2>
            <p className="text-xs text-gray-300">
              Введите любой номер варианта (например, <strong>2026</strong>). У всех учеников, открывших этот номер, выпадут абсолютно одинаковые задания!
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="number"
                className="input-field max-w-[200px] font-mono font-bold text-sm py-2.5"
                value={customVariantInput}
                onChange={e => setCustomVariantInput(e.target.value)}
                placeholder="Номер варианта..."
              />
              <button
                onClick={() => startVariantByNumber(customVariantInput || '2026')}
                className="btn-primary text-xs py-2.5 px-5 font-bold"
              >
                Открыть вариант #{customVariantInput || '2026'}
              </button>
              <button
                onClick={() => {
                  const rnd = Math.floor(10000 + Math.random() * 89999);
                  setCustomVariantInput(String(rnd));
                  startVariantByNumber(rnd);
                }}
                className="btn-secondary text-xs py-2.5 px-4"
              >
                🎲 Случайный вариант
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-black text-white">📚 Готовые тренировочные варианты ОГЭ (15 вариантов)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map(v => (
                <button
                  key={v}
                  onClick={() => startVariantByNumber(1000 + v)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-400/50 text-center transition-all group"
                >
                  <div className="text-xs text-gray-400">ФИПИ ОГЭ</div>
                  <div className="text-base font-black text-white group-hover:text-blue-300">
                    Вариант № {v}
                  </div>
                  <div className="text-[10px] text-purple-300 mt-1">11 заданий</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: ИЗБРАННОЕ */}
      {tab === 'favorites' && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">⭐ Избранные и сложные задания</h2>
              <p className="text-xs text-gray-400">Отмечайте сложные задания звёздочкой при разборе ошибок, чтобы повторить их перед зачётом</p>
            </div>
            {favoriteCount > 0 && (
              <button onClick={startFavoritesPractice} className="btn-primary text-xs py-2.5 px-5">
                🚀 Прорешать избранное ({favoriteCount})
              </button>
            )}
          </div>

          {favoriteCount === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-black/20 rounded-2xl border border-white/5">
              Пока нет сохранённых заданий. Решите любой вариант ОГЭ и поставьте ⭐ понравившимся заданиям!
            </div>
          ) : (
            <div className="space-y-3">
              {Object.values(OGE_TASKS_DB).flat().filter(t => taskProgress[t.id]?.is_favorite).map(t => (
                <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300">ОГЭ №{t.num} • {t.code}</div>
                    <div className="text-sm text-white mt-1">{t.prompt}</div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(t.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30"
                  >
                    Убрать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ВКЛАДКА 4: ШКАЛА ОЦЕНОК ФИПИ */}
      {tab === 'scale' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-black text-white">📊 Официальная шкала перевода баллов ОГЭ по русскому языку (Максимум: 37)</h2>
          <p className="text-xs text-gray-300">
            Структура экзамена: Изложение (6 б.) + Тестовая часть 2–12 (11 б.) + Сочинение 13 (7 б.) + Грамотность ГК1–ГК4 (13 б.) = <strong>37 первичных баллов</strong>.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {OGE_GRADE_SCALE.map(g => (
              <div key={g.grade} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className={`text-3xl font-black ${g.color}`}>«{g.grade}»</div>
                <div className="font-bold text-white text-sm">{g.label}</div>
                <div className="text-xs font-mono text-purple-300">{g.min} – {g.max} баллов</div>
                <div className="text-[11px] text-gray-400 pt-1">{g.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* МОДАЛКА ДЛЯ УЧИТЕЛЯ: ЗАДАТЬ КЛАССУ ИЛИ УЧЕНИКУ */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleAssignToStudents} className="card max-w-md w-full p-6 space-y-4 border-emerald-500/50 bg-[#141428]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">📤 Выдать задание на дом / урок</h3>
              <button type="button" onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {assignSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-sm font-bold text-center">
                {assignSuccessMsg}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Название работы</label>
                  <input
                    type="text"
                    required
                    className="input-field text-xs py-2"
                    value={assignTitle}
                    onChange={e => setAssignTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Кому задать?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignTargetType('class')}
                      className={`py-2 rounded-xl text-xs font-bold border ${assignTargetType === 'class' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'}`}
                    >
                      🏫 Классу целиком
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignTargetType('student')}
                      className={`py-2 rounded-xl text-xs font-bold border ${assignTargetType === 'student' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'}`}
                    >
                      👤 Одному ученику
                    </button>
                  </div>
                </div>

                {assignTargetType === 'class' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Класс</label>
                    <select
                      className="input-field text-xs py-2 bg-slate-900"
                      value={assignClass}
                      onChange={e => setAssignClass(e.target.value)}
                    >
                      {classesList.map(c => (
                        <option key={c.name} value={c.name}>{c.name} ({c.student_count} уч.)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Выберите ученика</label>
                    <select
                      className="input-field text-xs py-2 bg-slate-900"
                      value={assignStudentId}
                      onChange={e => setAssignStudentId(e.target.value)}
                    >
                      {studentsList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Срок сдачи (необязательно)</label>
                  <input
                    type="text"
                    className="input-field text-xs py-2"
                    placeholder="Например: До пятницы 18:00"
                    value={assignDueDate}
                    onChange={e => setAssignDueDate(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignStrict}
                    onChange={e => setAssignStrict(e.target.checked)}
                    className="accent-purple-500 w-4 h-4"
                  />
                  <span>🛡️ Строгий античит (полный экран + детект выхода)</span>
                </label>

                <button type="submit" className="btn-primary w-full py-2.5 text-xs font-black">
                  ✅ Отправить задание ученикам
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
