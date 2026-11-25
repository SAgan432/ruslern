import React, { useState, useEffect, useRef } from 'react';
import { sounds } from './sounds';

// Полноэкранный динамический водяной знак с ФИО, классом, ID и временем
export function AntiCheatWatermark({ user }) {
  if (!user) return null;
  const now = new Date().toLocaleTimeString('ru-RU');
  const cls = user.class_name ? ` • ${user.class_name}` : '';
  const watermarkText = `${user.name}${cls} • ID #${user.id || 1} • ${now} • РУСЛЁРН`;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none opacity-[0.055] flex flex-wrap gap-12 p-8 justify-around items-center rotate-[-12deg]">
      {Array.from({ length: 28 }).map((_, i) => (
        <div key={i} className="text-xs sm:text-sm font-mono font-black text-white whitespace-nowrap tracking-wider">
          {watermarkText}
        </div>
      ))}
    </div>
  );
}

// Защитный экран с детектором выхода из браузера, фуллскрином и паузами
export function AntiCheatShield({
  store,
  activityName = 'Тестирование',
  children,
  onFlagged,
  onMetricsChange,
  isFinished = false,
  strictFullscreen = true,
  maxPauses = 2
}) {
  const { state, reportAntiCheat } = store;
  const user = state.user;
  const isTeacher = user?.role === 'teacher';
  const sessionKey = `ruslearn_ac_${user?.id || 'guest'}`;

  // Восстановление счётчика нарушений, если ученик пытался перезагрузить или закрыть браузер!
  const [initialRecovery] = useState(() => {
    if (isTeacher || typeof localStorage === 'undefined') {
      return { tabs: 0, copies: 0, hadExit: false };
    }
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.active && parsed.activityName === activityName) {
          return {
            tabs: (parsed.tabSwitches || 0) + 1,
            copies: parsed.copyAttempts || 0,
            hadExit: true,
          };
        }
      }
    } catch {}
    return { tabs: 0, copies: 0, hadExit: false };
  });

  const [tabSwitches, setTabSwitches] = useState(initialRecovery.tabs);
  const [copyAttempts, setCopyAttempts] = useState(initialRecovery.copies);
  const [hadBrowserExit, setHadBrowserExit] = useState(initialRecovery.hadExit);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsFullscreenStart, setNeedsFullscreenStart] = useState(!isTeacher && strictFullscreen && !isFinished);
  const [showWarningModal, setShowWarningModal] = useState(initialRecovery.hadExit);
  const [warningMsg, setWarningMsg] = useState(
    initialRecovery.hadExit
      ? '🚨 ОБНАРУЖЕН ПОБЕГ / ПЕРЕЗАГРУЗКА БРАУЗЕРА! Вы закрыли или обновили вкладку во время работы. Нарушение сохранено в журнале учителя, счётчик не сброшен!'
      : ''
  );
  const [isLocked, setIsLocked] = useState(initialRecovery.tabs >= 3);

  // Официальная пауза (1-2 раза на тест)
  const [pausesRemaining, setPausesRemaining] = useState(maxPauses);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSeconds, setPauseSeconds] = useState(600);

  const lastViolationAtRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const isFinishedRef = useRef(isFinished);
  const needsFsRef = useRef(needsFullscreenStart);
  const wasFullscreenRef = useRef(false);
  const initialSizeRef = useRef({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);
  useEffect(() => { needsFsRef.current = needsFullscreenStart; }, [needsFullscreenStart]);

  // Логируем аварийный перезаход из initialRecovery один раз
  useEffect(() => {
    if (!isTeacher && initialRecovery.hadExit && reportAntiCheat) {
      reportAntiCheat(
        'BROWSER_RELOAD_ESCAPE',
        `${activityName}: Ученик закрыл/обновил браузер во время активного теста и вернулся`
      );
    }
  }, []);

  // Сохранение активной сессии в localStorage (чтобы F5 / закрытие браузера не обнуляло счётчик)
  useEffect(() => {
    if (isTeacher || typeof localStorage === 'undefined') return;
    if (isFinished) {
      localStorage.removeItem(sessionKey);
      // Выходим из полноэкранного режима по окончании
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    try {
      localStorage.setItem(sessionKey, JSON.stringify({
        active: true,
        activityName,
        tabSwitches,
        copyAttempts,
        hadBrowserExit,
        updatedAt: Date.now()
      }));
    } catch {}
  }, [isFinished, tabSwitches, copyAttempts, hadBrowserExit, activityName, isTeacher, sessionKey]);

  // Передаём актуальные метрики родителю для отправки в /api/submissions
  useEffect(() => {
    if (onMetricsChange) {
      onMetricsChange({ tabSwitches, copyAttempts, hadBrowserExit });
    }
  }, [tabSwitches, copyAttempts, hadBrowserExit]);

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

  const enterFullscreen = async () => {
    sounds.click();
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
      // Блокируем клавишу Escape в поддерживаемых браузерах (Chrome/Edge)
      if (navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock(['Escape']).catch(() => {});
      }
      wasFullscreenRef.current = true;
      setIsFullscreen(true);
    } catch {
      // На iPhone Safari requestFullscreen может быть недоступен — разрешаем продолжить под жестким blur/pagehide контролем
    }
    setNeedsFullscreenStart(false);
  };

  const handleTakePause = () => {
    if (pausesRemaining <= 0 || isPaused || isFinished) return;
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

  const triggerViolation = (type, detailText, useBeacon = false) => {
    if (isTeacher || isPausedRef.current || isFinishedRef.current) return;

    const now = Date.now();
    // Защита от двойного срабатывания blur + visibilitychange за одно переключение
    if (type !== 'COPY_ATTEMPT' && type !== 'BROWSER_EXIT' && now - lastViolationAtRef.current < 800) {
      return;
    }
    if (type !== 'COPY_ATTEMPT') {
      lastViolationAtRef.current = now;
    }

    sounds.wrong();
    if (sounds.vibrate) sounds.vibrate([80, 40, 80]);

    if (type === 'COPY_ATTEMPT' || type === 'CONTEXT_MENU' || type === 'HOTKEY_ATTEMPT') {
      setCopyAttempts(c => {
        const next = c + 1;
        if (reportAntiCheat) {
          reportAntiCheat(type, `${activityName}: ${detailText} (#${next})`, useBeacon);
        }
        return next;
      });
      setWarningMsg(`🚫 ЗАПРЕЩЁННОЕ ДЕЙСТВИЕ: ${detailText}. Попытка отправлена учителю!`);
      setShowWarningModal(true);
      return;
    }

    if (type === 'BROWSER_EXIT' || type === 'PAGE_HIDE') {
      setHadBrowserExit(true);
    }

    setTabSwitches(prev => {
      const next = prev + 1;
      if (reportAntiCheat) {
        reportAntiCheat(type, `${activityName}: ${detailText} (нарушение #${next} из 3)`, useBeacon);
      }

      setWarningMsg(
        `🚨 ВНИМАНИЕ: ${detailText}! (Нарушение #${next} из 3). Событие мгновенно записано в базу данных учителя!`
      );
      setShowWarningModal(true);

      if (next >= 3) {
        setIsLocked(true);
        if (onFlagged) onFlagged();
      }
      return next;
    });
  };

  // Все слушатели: уход с вкладки, потеря фокуса, выход из полноэкранного режима, попытка закрыть браузер, разделение экрана
  useEffect(() => {
    if (isTeacher || isPaused || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !needsFsRef.current) {
        triggerViolation('TAB_BLUR', 'Переключение вкладки или сворачивание браузера', true);
      }
    };

    const handleWindowBlur = () => {
      if (!needsFsRef.current) {
        triggerViolation('WINDOW_BLUR', 'Уход из окна браузера / открытие сторонней программы');
      }
    };

    const handleBeforeUnload = (e) => {
      // Предупреждаем браузер при попытке закрытия/обновления + шлём Beacon учителю
      if (reportAntiCheat) {
        reportAntiCheat('BROWSER_EXIT', `${activityName}: Попытка закрыть вкладку или обновить браузер`, true);
      }
      setHadBrowserExit(true);
      e.preventDefault();
      e.returnValue = 'Выход из браузера во время теста будет зафиксирован античитом!';
      return e.returnValue;
    };

    const handlePageHide = () => {
      triggerViolation('BROWSER_EXIT', 'Выход или закрытие браузера во время задания', true);
    };

    const handleFullscreenChange = () => {
      const fsNow = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(fsNow);
      if (!fsNow && wasFullscreenRef.current && !isFinishedRef.current && !isPausedRef.current) {
        triggerViolation('FULLSCREEN_EXIT', 'Выход из полноэкранного защищённого режима');
      }
    };

    const handleResize = () => {
      // Игнорируем уменьшение высоты, когда открыта экранная клавиатура в input/textarea
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      const wDrop = window.innerWidth < initialSizeRef.current.w * 0.62;
      if (wDrop && !needsFsRef.current) {
        triggerViolation('SPLIT_SCREEN', 'Попытка включить разделение экрана или сжать окно браузера');
      }
    };

    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'u', 's', 'a', 'p', 'w', 't', 'n'].includes(k)) ||
        (e.metaKey && ['c', 'v', 'x', 'u', 's', 'a', 'p', 'w', 't', 'n'].includes(k)) ||
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 's'].includes(k)) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        triggerViolation('HOTKEY_ATTEMPT', `Запрещённая комбинация клавиш (${e.ctrlKey ? 'Ctrl+' : ''}${e.key})`);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard?.writeText('Скриншот запрещён правилами РусЛёрн'); } catch {}
        triggerViolation('SCREENSHOT_ATTEMPT', 'Нажата клавиша PrintScreen (попытка скриншота)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [user, isTeacher, isPaused, isFinished, activityName]);

  const handleCopy = (e) => {
    if (isPaused || isTeacher || isFinished) return;
    e.preventDefault();
    triggerViolation('COPY_ATTEMPT', 'Попытка копирования/вставки текста');
  };

  const handleContextMenu = (e) => {
    if (isPaused || isTeacher || isFinished) return;
    e.preventDefault();
    triggerViolation('CONTEXT_MENU', 'Попытка открыть контекстное меню');
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
      onDragStart={(e) => { if (!isTeacher && !isFinished) e.preventDefault(); }}
      onContextMenu={handleContextMenu}
      className="relative select-none"
      style={isTeacher || isFinished ? {} : { userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {!isFinished && !isTeacher && <AntiCheatWatermark user={user} />}

      {/* Статус-панель Античита 2.0 */}
      {!isTeacher && !isFinished && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-950/50 border border-purple-500/35 text-xs mb-4">
          <div className="flex items-center gap-2 font-bold text-purple-200">
            <span className={isPaused ? 'text-amber-400' : 'animate-pulse'}>
              {isPaused ? '⏸️' : '🛡️'}
            </span>
            <span>
              {isPaused
                ? 'Официальный перерыв'
                : isFullscreen
                  ? 'Полноэкранная защита активна'
                  : 'Античит РусЛёрн (Контроль выхода из браузера)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
            {!isFullscreen && (
              <button
                type="button"
                onClick={enterFullscreen}
                className="px-2.5 py-1 rounded-lg bg-purple-600/40 text-purple-200 border border-purple-400/40 font-bold hover:bg-purple-600/60"
              >
                ⛶ Полный экран
              </button>
            )}

            {pausesRemaining > 0 && !isPaused && (
              <button
                type="button"
                onClick={handleTakePause}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/30 flex items-center gap-1"
              >
                <span>🥪 Пауза</span>
                <span className="opacity-80">({pausesRemaining})</span>
              </button>
            )}

            <span className={tabSwitches > 0 ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              Выходов: <strong className="text-white">{tabSwitches}</strong> / 3
            </span>
            <span className={copyAttempts > 0 ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              Копий: <strong className="text-white">{copyAttempts}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Стартовый экран входа в защищённый режим */}
      {needsFullscreenStart && !isFinished && !isTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border-2 border-purple-500/60 bg-[#121224] shadow-2xl">
            <div className="text-5xl">🔒</div>
            <h3 className="text-xl font-black text-white">Защищённый режим тестирования</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              При старте включится <strong>полноэкранный режим</strong> и блокировка выхода из браузера. Любая попытка свернуть окно, закрыть вкладку или переключиться в другое приложение <strong>моментально передаётся учителю</strong>.
            </p>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 text-left space-y-1">
              <div>• Для отдыха используйте кнопку <strong>«🥪 Пауза»</strong> сверху (до 2 раз на работу).</div>
              <div>• При 3 нарушениях тест автоматически блокируется со статусом «Списывание».</div>
            </div>
            <button
              type="button"
              onClick={enterFullscreen}
              className="btn-primary w-full py-3.5 text-sm font-black shadow-lg"
            >
              🛡️ Включить защиту и начать решение ➜
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно ОФИЦИАЛЬНОЙ ПАУЗЫ */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="card max-w-md w-full p-6 text-center space-y-5 border-2 border-amber-500/60 bg-amber-950/40 shadow-2xl">
            <div className="text-5xl animate-bounce">🥪</div>
            <div>
              <h3 className="text-xl font-black text-amber-300">ОФИЦИАЛЬНЫЙ ПЕРЕРЫВ</h3>
              <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                Таймер и античит на паузе. Задания скрыты, чтобы нельзя было списать во время перерыва.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">Осталось времени перерыва:</div>
              <div className="text-3xl font-mono font-black text-white">⏱️ {formatPauseTime(pauseSeconds)}</div>
              <div className="text-[11px] text-gray-400">Осталось доступных пауз: <strong>{pausesRemaining}</strong></div>
            </div>

            <button
              type="button"
              onClick={handleResume}
              className="btn-primary w-full py-3.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500"
            >
              ▶️ Вернуться к решению ➜
            </button>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className={(!isFinished && (isLocked || isPaused || needsFullscreenStart)) ? 'blur-md pointer-events-none opacity-30 transition-all' : ''}>
        {children}
      </div>

      {/* Модальное окно предупреждения / блокировки */}
      {showWarningModal && !isPaused && !isFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border-2 border-red-500 bg-red-950/70 shadow-2xl">
            <div className="text-5xl animate-bounce">🚨</div>
            <h3 className="text-xl font-black text-white">
              {tabSwitches >= 3 ? 'ТЕСТИРОВАНИЕ ЗАБЛОКИРОВАНО!' : 'ОБНАРУЖЕН ВЫХОД / НАРУШЕНИЕ!'}
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              {warningMsg}
            </p>

            {tabSwitches >= 3 ? (
              <div className="p-3 rounded-xl bg-black/70 border border-red-500 text-xs text-red-200 font-bold">
                Лимит нарушений исчерпан ({tabSwitches} / 3). Отчёт со статусом 🔴 СПИСЫВАНИЕ отправлен в журнал учителя.
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  sounds.click();
                  setShowWarningModal(false);
                  if (strictFullscreen && !document.fullscreenElement) {
                    try { await document.documentElement.requestFullscreen(); } catch {}
                  }
                }}
                className="btn-primary w-full py-3 text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 to-rose-600"
              >
                ⛶ Вернуться в защищённый экран ➜
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
