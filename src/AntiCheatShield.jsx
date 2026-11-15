import React, { useState, useEffect } from 'react';
import { sounds } from './sounds';

// Полноэкранный водяной знак с ФИО, ID и текущим временем
export function AntiCheatWatermark({ user }) {
  if (!user) return null;
  const now = new Date().toLocaleTimeString('ru-RU');
  const watermarkText = `${user.name} • ID #${user.id || 101} • ${now} • ЗАЩИТА ОТ СПИСЫВАНИЯ РУСЛЁРН`;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none opacity-[0.06] flex flex-wrap gap-12 p-8 justify-around items-center rotate-[-12deg]">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="text-sm font-mono font-black text-white whitespace-nowrap tracking-wider">
          {watermarkText}
        </div>
      ))}
    </div>
  );
}

// Универсальный защитный экран с поддержкой 1-2 официальных пауз
export function AntiCheatShield({ store, activityName = 'Тестирование', children, onFlagged, maxPauses = 2 }) {
  const { state, reportAntiCheat } = store;
  const user = state.user;

  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Официальная пауза (1-2 раза на тест: покушать, попить воды)
  const [pausesRemaining, setPausesRemaining] = useState(maxPauses);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSeconds, setPauseSeconds] = useState(600); // 10 минут на паузу

  // Таймер паузы
  useEffect(() => {
    if (!isPaused) return;
    const interval = setInterval(() => {
      setPauseSeconds(s => {
        if (s <= 1) {
          clearInterval(interval);
          handleResume();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleTakePause = () => {
    if (pausesRemaining <= 0 || isPaused) return;
    sounds.click();
    setIsPaused(true);
    setPausesRemaining(p => p - 1);
    setPauseSeconds(600);
    if (reportAntiCheat) {
      reportAntiCheat('PAUSE_TAKEN', `${activityName}: Ученик взял официальный перерыв. Осталось пауз: ${pausesRemaining - 1}`);
    }
  };

  const handleResume = () => {
    sounds.click();
    setIsPaused(false);
    if (reportAntiCheat) {
      reportAntiCheat('PAUSE_ENDED', `${activityName}: Ученик вернулся с перерыва к решению`);
    }
  };

  // Детектор переключения вкладок, ухода из окна и смены приложений
  useEffect(() => {
    // Учителям античит не мешает, а во время официальной паузы проверка списывания приостановлена!
    if (user?.role === 'teacher' || isPaused) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_BLUR', 'Уход с вкладки тестирования / переключение на стороннее приложение');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('WINDOW_BLUR', 'Потеря фокуса окна (возможно открытие стороннего окна)');
    };

    const handlePageHide = () => {
      triggerViolation('PAGE_HIDE', 'Сворачивание страницы на смартфоне');
    };

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && ['c', 'v', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['c', 'v', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        triggerViolation('HOTKEY_ATTEMPT', `Попытка нажатия запрещенных клавиш (${e.ctrlKey ? 'Ctrl+' : ''}${e.key})`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, tabSwitches, copyAttempts, activityName, isPaused]);

  const triggerViolation = (type, detailText) => {
    if (isPaused) return; // во время паузы нарушения не начисляются

    sounds.wrong();
    if (sounds.vibrate) sounds.vibrate([60, 40, 60]);

    if (type === 'COPY_ATTEMPT') {
      setCopyAttempts(c => {
        const next = c + 1;
        if (reportAntiCheat) {
          reportAntiCheat('COPY_ATTEMPT', `${activityName}: Попытка скопировать текст в буфер обмена (#${next})`);
        }
        return next;
      });
      setWarningMsg('🚫 КОПИРОВАНИЕ ЗАПРЕЩЕНО: Буфер обмена заблокирован! Попытка зафиксирована в журнале учителя.');
      setShowWarningModal(true);
      return;
    }

    setTabSwitches(prev => {
      const next = prev + 1;
      if (reportAntiCheat) {
        reportAntiCheat(type, `${activityName}: ${detailText} (нарушение #${next} из 3)`);
      }

      setWarningMsg(
        `🚨 ВНИМАНИЕ: Зафиксирован уход с экрана задания! (Нарушение #${next} из 3). Переход зафиксирован в журнале учителя. Для перерыва используйте кнопку «Пауза»!`
      );
      setShowWarningModal(true);

      if (next >= 3) {
        setIsLocked(true);
        if (onFlagged) onFlagged();
      }
      return next;
    });
  };

  const handleCopy = (e) => {
    if (isPaused) return;
    e.preventDefault();
    triggerViolation('COPY_ATTEMPT', 'Попытка копирования задания в буфер');
  };

  const handleContextMenu = (e) => {
    if (isPaused) return;
    e.preventDefault();
    triggerViolation('CONTEXT_MENU', 'Попытка вызова контекстного меню');
  };

  const formatPauseTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onCopy={handleCopy}
      onCut={handleCopy}
      onPaste={handleCopy}
      onContextMenu={handleContextMenu}
      className="relative select-none-all"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Водяной знак поверх области */}
      <AntiCheatWatermark user={user} />

      {/* Индикатор активного античита и кнопка официальной паузы */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs mb-3">
        <div className="flex items-center gap-1.5 font-bold text-purple-300">
          <span className={isPaused ? 'text-amber-400' : 'animate-pulse'}>
            {isPaused ? '⏸️' : '🛡️'}
          </span>
          <span>{isPaused ? 'Официальная пауза активна' : 'Античит РусЛёрн активен'}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Кнопка официальной паузы */}
          {pausesRemaining > 0 && !isPaused && (
            <button
              type="button"
              onClick={handleTakePause}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/30 transition-all flex items-center gap-1"
              title="Разрешено 1-2 раза: отойти покушать, попить воды"
            >
              <span>🥪 Пауза</span>
              <span className="text-[10px] opacity-80">({pausesRemaining})</span>
            </button>
          )}

          <span className={`${tabSwitches > 0 ? 'text-amber-400 font-bold' : 'text-gray-400'}`}>
            Уходов: <strong className="text-white">{tabSwitches}</strong> / 3
          </span>
          <span className={`${copyAttempts > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
            Копирований: <strong className="text-white">{copyAttempts}</strong>
          </span>
        </div>
      </div>

      {/* Модальное окно ОФИЦИАЛЬНОЙ ПАУЗЫ (можно покушать) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="card max-w-md w-full p-6 text-center space-y-5 border-2 border-amber-500/60 bg-amber-950/40 shadow-2xl shadow-amber-500/20">
            <div className="text-5xl animate-bounce">🥪</div>
            <div>
              <h3 className="text-xl font-black text-amber-300">ОФИЦИАЛЬНЫЙ ПЕРЕРЫВ</h3>
              <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                Античит спит! Можно спокойно отойти покушать, попить воды или отдохнуть. Нарушения и уходы с вкладки сейчас не считаются.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                Оставшееся время перерыва:
              </div>
              <div className="text-3xl font-mono font-black text-white">
                ⏱️ {formatPauseTime(pauseSeconds)}
              </div>
              <div className="text-[11px] text-gray-400">
                Осталось доступных пауз: <strong>{pausesRemaining}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResume}
              className="btn-primary w-full py-3.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
            >
              ▶️ Я готов, продолжить решение ➜
            </button>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className={isLocked || isPaused ? 'blur-md pointer-events-none opacity-40 transition-all' : ''}>
        {children}
      </div>

      {/* Модальное окно предупреждения о нарушении */}
      {showWarningModal && !isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-scaleUp">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border-2 border-red-500 bg-red-950/40 shadow-2xl shadow-red-500/30">
            <div className="text-5xl animate-bounce">🚨</div>
            <h3 className="text-xl font-black text-white">
              {tabSwitches >= 3 ? 'ТЕСТИРОВАНИЕ ЗАБЛОКИРОВАНО!' : 'НАРУШЕНИЕ ЧЕСТНОСТИ!'}
            </h3>
            <p className="text-xs sm:text-sm text-red-200 leading-relaxed">
              {warningMsg}
            </p>

            {tabSwitches >= 3 ? (
              <div className="p-3 rounded-xl bg-black/60 border border-red-500 text-xs text-red-300 font-bold">
                Превышен лимит нарушений. Статус: 🔴 СПИСЫВАНИЕ отправлен в кабинет учителя.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { sounds.click(); setShowWarningModal(false); }}
                className="btn-primary w-full py-3 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600"
              >
                Я понял, возвращаюсь к решению ➜
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
