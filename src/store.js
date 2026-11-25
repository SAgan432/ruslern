import { useState, useCallback, useEffect } from 'react';
import { sounds } from './sounds';

const STORAGE_KEY = 'ruslearn_session_v5';

const defaultState = {
  user: null,
  sound: true,
  achievements: [],
  taskHistory: [],
  antiCheatActive: false,
};

export function useStore() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Удаляем старую версию ключа с тестовым юзером, если она осталась
      localStorage.removeItem('ruslearn_session_v4');
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch { return defaultState; }
  });

  const [banNotice, setBanNotice] = useState(null);

  const persist = (nextState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); } catch {}
    return nextState;
  };

  // Проверка актуальности сессии, бана и новых предупреждений в реальном времени
  const refreshUser = useCallback(async () => {
    if (!state.user?.id) return null;
    try {
      const res = await fetch(`/api/auth/user/${state.user.id}`);
      const data = await res.json();
      if (res.status === 404 && data.deleted) {
        setState(persist({ ...defaultState, sound: state.sound }));
        return null;
      }
      if (res.ok && data.user) {
        if (data.user.is_banned) {
          setBanNotice(data.user.ban_reason || 'Аккаунт заблокирован учителем');
          setState(persist({ ...defaultState, sound: state.sound }));
          return null;
        }
        setState(prev => persist({ ...prev, user: data.user }));
        return data.user;
      }
    } catch {}
    return null;
  }, [state.user?.id, state.sound]);

  useEffect(() => {
    if (!state.user?.id) return;
    refreshUser();
    const timer = setInterval(refreshUser, 20000);
    return () => clearInterval(timer);
  }, [state.user?.id]);

  // Авторизация через реальную БД
  const login = useCallback(async (loginStr, password) => {
    setBanNotice(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginStr, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.banned) {
        setBanNotice(data.reason || 'Нарушение правил');
      }
      throw new Error(data.error || 'Ошибка входа');
    }

    setState(prev => persist({
      ...prev,
      user: data.user,
    }));
    sounds.levelUp();
    return { success: true, user: data.user };
  }, []);

  // Регистрация в БД
  const register = useCallback(async (form) => {
    setBanNotice(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');

    setState(prev => persist({
      ...prev,
      user: data.user,
    }));
    sounds.levelUp();
    return { success: true, user: data.user };
  }, []);

  const ackWarning = useCallback(async (warningId) => {
    try {
      await fetch(`/api/warnings/${warningId}/ack`, { method: 'POST' });
      setState(prev => {
        if (!prev.user) return prev;
        const nextWarnings = (prev.user.warnings || []).filter(w => w.id !== warningId);
        return persist({ ...prev, user: { ...prev.user, warnings: nextWarnings } });
      });
    } catch {}
  }, []);

  const logout = useCallback(() => {
    sounds.click();
    setState(prev => persist({ ...defaultState, sound: prev.sound }));
  }, []);

  const toggleSound = useCallback(() => {
    const nextVal = sounds.toggle();
    setState(prev => persist({ ...prev, sound: nextVal }));
    return nextVal;
  }, []);

  // Отправка нарушений античита на сервер (включая sendBeacon при закрытии браузера)
  const reportAntiCheat = useCallback(async (eventType, details, useBeacon = false) => {
    if (!state.user) return;
    const payload = {
      userId: state.user.id,
      userName: state.user.name,
      className: state.user.class_name || '',
      eventType,
      details
    };

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/anticheat/log', blob);
        return;
      } catch {}
    }

    try {
      await fetch('/api/anticheat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to log anti-cheat event:', e);
    }
  }, [state.user]);

  // Сдача теста с античит-данными
  const submitTest = useCallback(async (submissionData) => {
    if (!state.user) return;
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          studentId: state.user.id,
          studentName: state.user.name,
          className: state.user.class_name || '',
        }),
      });
      const result = await res.json();

      if (result.success && result.earnedXP) {
        setState(prev => {
          const nextXP = (prev.user?.xp || 0) + result.earnedXP;
          const nextLevel = Math.floor(nextXP / 500) + 1;
          return persist({
            ...prev,
            user: { ...prev.user, xp: nextXP, level: nextLevel }
          });
        });
      }
      return result;
    } catch (err) {
      console.error('Submission failed:', err);
    }
  }, [state.user]);

  const addXP = useCallback((amount, isCorrect = true) => {
    if (!state.user) return 0;
    let gained = 0;
    setState(prev => {
      if (!prev.user) return prev;
      let streak = isCorrect ? (prev.user.streak || 0) + 1 : 0;
      let mult = streak >= 7 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      gained = Math.round(amount * mult);
      const newXP = (prev.user.xp || 0) + gained;
      const oldLevel = prev.user.level || 1;
      const newLevel = Math.floor(newXP / 500) + 1;

      if (newLevel > oldLevel) sounds.levelUp();
      else if (isCorrect) sounds.correct();
      else sounds.wrong();

      return persist({
        ...prev,
        user: { ...prev.user, xp: newXP, level: newLevel, streak }
      });
    });
    return gained;
  }, [state.user]);

  const getLevelProgress = useCallback(() => {
    const currentLvl = state.user?.level || 1;
    const xpForNext = currentLvl * 500;
    const xpForCurrent = (currentLvl - 1) * 500;
    const current = (state.user?.xp || 0) - xpForCurrent;
    const needed = xpForNext - xpForCurrent;
    return { current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
  }, [state.user]);

  return {
    state,
    banNotice,
    clearBanNotice: () => setBanNotice(null),
    refreshUser,
    ackWarning,
    login,
    register,
    logout,
    toggleSound,
    addXP,
    reportAntiCheat,
    submitTest,
    getLevelProgress,
  };
}
