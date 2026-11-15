import { useState, useCallback, useEffect } from 'react';
import { ACHIEVEMENTS } from './data';
import { sounds } from './sounds';

const STORAGE_KEY = 'ruslearn_session_v4';

const defaultState = {
  user: null, // { id, username, email, role: 'student' | 'teacher', name, avatar, level, xp, streak }
  sound: true,
  achievements: [],
  taskHistory: [],
  antiCheatActive: false,
};

export function useStore() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch { return defaultState; }
  });

  const persist = (nextState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); } catch {}
    return nextState;
  };

  // Авторизация через реальную БД
  const login = useCallback(async (loginStr, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка входа');

      setState(prev => persist({
        ...prev,
        user: data.user,
      }));
      sounds.levelUp();
      return { success: true, user: data.user };
    } catch (err) {
      // Fallback если сервер временно недоступен
      console.warn('Backend login fallback:', err.message);
      throw err;
    }
  }, []);

  // Регистрация в БД
  const register = useCallback(async (form) => {
    try {
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
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    sounds.click();
    setState(persist(defaultState));
  }, []);

  const toggleSound = useCallback(() => {
    const nextVal = sounds.toggle();
    setState(prev => persist({ ...prev, sound: nextVal }));
    return nextVal;
  }, []);

  // Отправка нарушений античита на сервер
  const reportAntiCheat = useCallback(async (eventType, details) => {
    if (!state.user) return;
    try {
      await fetch('/api/anticheat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user.id,
          userName: state.user.name,
          eventType,
          details
        }),
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
        }),
      });
      const result = await res.json();

      if (result.success && result.earnedXP) {
        // Обновляем локально XP
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
