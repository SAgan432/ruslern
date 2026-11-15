import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PAMYATKI,
  ORTHOEPY_WORDS,
  PARONYMS_DATA,
  DICTATION_TEXTS,
  QUESTIONS_DB,
  ACHIEVEMENTS,
  generateQuestions
} from './data';
import { useStore } from './store';
import { sounds } from './sounds';
import { EgeExamPage } from './EgeExamPage';
import { AuthorFormulasPage } from './AuthorFormulasPage';
import { BlitzSprintPage } from './BlitzSprintPage';
import { PvpDuelPage } from './PvpDuelPage';
import { AiDiagnosticsPage } from './AiDiagnosticsPage';
import { VoiceEssayPage } from './VoiceEssayPage';
import { FipiFormsPage } from './FipiFormsPage';
import { SiteMapPage } from './SiteMapPage';
import { SettingsModal } from './SettingsModal';
import { AntiCheatShield, AntiCheatWatermark } from './AntiCheatShield';
import './index.css';

// =============================================================================
// PARTICLES BACKGROUND
// =============================================================================
function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${(i * 5.8) % 100}%`,
            animationDuration: `${7 + (i % 7) * 2}s`,
            animationDelay: `${(i * 0.7) % 6}s`,
            width: `${2 + (i % 3) * 1.5}px`,
            height: `${2 + (i % 3) * 1.5}px`,
            background: i % 3 === 0 ? 'rgba(236,72,153,0.5)' : i % 3 === 1 ? 'rgba(124,58,237,0.5)' : 'rgba(245,158,11,0.4)',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// AUTHENTICATION MODAL (РЕАЛЬНАЯ БАЗА ДАННЫХ И ПРОВЕРКА РОЛЕЙ)
// =============================================================================
function AuthView({ store }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = store;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    sounds.click();
    try {
      await login(loginInput, password);
    } catch (err) {
      setError(err.message || 'Ошибка входа');
      sounds.wrong();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (l, p) => {
    sounds.click();
    setError('');
    setLoading(true);
    try {
      await login(l, p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    sounds.click();
    try {
      await register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
        teacherCode,
        avatar: regRole === 'teacher' ? '👩‍🏫' : '🧑‍🎓',
      });
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
      sounds.wrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10 py-12">
      <Particles />

      {/* Brand Header */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-block p-4 rounded-3xl mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))', border: '1px solid rgba(124,58,237,0.5)' }}>
          <span className="text-5xl">📚</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-3">
          <span className="gradient-text">РусЛёрн</span>
        </h1>
        <p className="text-gray-300 text-sm sm:text-base">
          Платформа по русскому языку с базой данных, раздельным доступом и защитой от списывания
        </p>
      </div>

      <div className="card w-full max-w-md p-6 sm:p-8 space-y-6" style={{ background: 'rgba(26, 26, 46, 0.9)', borderColor: 'rgba(124,58,237,0.4)' }}>
        {/* Tabs: Login / Register */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => { sounds.click(); setTab('login'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Войти в аккаунт
          </button>
          <button
            type="button"
            onClick={() => { sounds.click(); setTab('register'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Логин или Email
              </label>
              <input
                type="text"
                required
                className="input-field text-sm"
                placeholder="ivan или teacher"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Пароль
              </label>
              <input
                type="password"
                required
                className="input-field text-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-bold text-center disabled:opacity-50"
            >
              {loading ? 'Проверка...' : 'Войти в систему ➜'}
            </button>

            {/* Quick Demo Logins */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-gray-400 text-center uppercase tracking-wider">
                Быстрый вход для проверки:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ivan', 'student123')}
                  className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/40 text-xs font-bold text-left"
                >
                  <div>🧑‍🎓 Ученик (Иван)</div>
                  <div className="text-[10px] text-gray-400 font-normal">пароль: student123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('teacher', 'teacher123')}
                  className="p-2.5 rounded-xl bg-pink-950/40 border border-pink-500/30 text-pink-300 hover:bg-pink-900/40 text-xs font-bold text-left"
                >
                  <div>👩‍🏫 Учитель (Анна С.)</div>
                  <div className="text-[10px] text-gray-400 font-normal">пароль: teacher123</div>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ФИО / Отображаемое имя</label>
              <input
                type="text"
                required
                className="input-field text-xs py-2"
                placeholder="Иван Иванов"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Логин</label>
                <input
                  type="text"
                  required
                  className="input-field text-xs py-2"
                  placeholder="ivan_9a"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="input-field text-xs py-2"
                  placeholder="ivan@mail.ru"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Пароль</label>
              <input
                type="password"
                required
                className="input-field text-xs py-2"
                placeholder="Придумайте пароль"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
            </div>

            {/* Role picker */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Роль аккаунта</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { sounds.click(); setRegRole('student'); }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    regRole === 'student'
                      ? 'border-purple-500 bg-purple-950/40 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  🧑‍🎓 Ученик
                </button>
                <button
                  type="button"
                  onClick={() => { sounds.click(); setRegRole('teacher'); }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    regRole === 'teacher'
                      ? 'border-pink-500 bg-pink-950/40 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  👩‍🏫 Учитель
                </button>
              </div>
            </div>

            {/* Teacher verification code protection! */}
            {regRole === 'teacher' && (
              <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/40 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                  <span>🔒</span> Секретный проверочный ключ учителя
                </div>
                <input
                  type="text"
                  required
                  className="input-field text-xs py-2 border-pink-500/50"
                  placeholder="Введи секретный ключ учителя..."
                  value={teacherCode}
                  onChange={e => setTeacherCode(e.target.value)}
                />
                <p className="text-[10px] text-pink-300/80">
                  Для защиты от учеников требуется код школы: <strong className="text-white">RUS-TEACHER-2026</strong>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-bold text-center mt-2 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Зарегистрироваться 🚀'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// NAVBAR С ЖЁСТКИМ РАЗГРАНИЧЕНИЕМ ПРАВ
// =============================================================================
function Navbar({ page, setPage, store, onOpenSettings }) {
  const { state, logout, toggleSound } = store;
  const user = state.user;
  const lp = store.getLevelProgress();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isTeacher = user?.role === 'teacher';

  const studentTabs = [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'site_map', label: 'Схема движения', icon: '🗺️' },
    { id: 'ege_exam', label: 'Решать ЕГЭ', icon: '🎯' },
    { id: 'pvp_duel', label: 'Дуэли 1v1', icon: '⚔️' },
    { id: 'ai_diagnostics', label: 'ИИ-Диагност', icon: '🧠' },
    { id: 'voice_essay', label: 'Голосовое сочинение', icon: '🎤' },
    { id: 'formulas', label: 'Формулы', icon: '⚡' },
    { id: 'blitz_sprint', label: 'Спринт 60с', icon: '⚡' },
    { id: 'fipi_forms', label: 'Бланки ФИПИ', icon: '📄' },
    { id: 'pamyatki', label: 'Памятки', icon: '📖' },
    { id: 'generator', label: 'Генератор', icon: '🎲' },
    { id: 'exam_tasks', label: 'Тестирование', icon: '🛡️' },
    { id: 'orthoepy', label: 'Ударения', icon: '🎙️' },
    { id: 'paronyms', label: 'Паронимы', icon: '👥' },
    { id: 'dictation', label: 'Диктант', icon: '✍️' },
    { id: 'achievements', label: 'Награды', icon: '🏆' },
  ];

  const teacherTabs = [
    { id: 'home', label: 'Кабинет', icon: '👩‍🏫' },
    { id: 'site_map', label: 'Схема движения', icon: '🗺️' },
    { id: 'anticheat_monitor', label: 'Античит-монитор', icon: '🛡️' },
    { id: 'ai_diagnostics', label: 'ИИ-Диагностика', icon: '🧠' },
    { id: 'fipi_forms', label: 'Бланки ФИПИ А4', icon: '📄' },
    { id: 'voice_essay', label: 'Голосовое сочинение', icon: '🎤' },
    { id: 'ege_exam', label: 'Тренажёр ЕГЭ', icon: '🎯' },
    { id: 'formulas', label: 'Формулы', icon: '⚡' },
    { id: 'generator', label: 'Генератор вариантов', icon: '🎲' },
    { id: 'essay_checker', label: 'Чекер сочинений', icon: '📑' },
    { id: 'students', label: 'Журнал класса', icon: '👥' },
    { id: 'pamyatki', label: 'Памятки', icon: '📖' },
  ];

  const currentTabs = isTeacher ? teacherTabs : studentTabs;

  // Главные 4 таба для мобильной панели (5-й - "Ещё")
  const mobilePrimaryTabs = isTeacher ? [
    { id: 'home', label: 'Кабинет', icon: '👩‍🏫' },
    { id: 'anticheat_monitor', label: 'Античит', icon: '🛡️' },
    { id: 'fipi_forms', label: 'Бланки', icon: '📄' },
    { id: 'ege_exam', label: 'ЕГЭ', icon: '🎯' },
  ] : [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'ege_exam', label: 'ЕГЭ', icon: '🎯' },
    { id: 'pvp_duel', label: 'Дуэли', icon: '⚔️' },
    { id: 'ai_diagnostics', label: 'Диагност', icon: '🧠' },
  ];

  const handleNavClick = (tabId) => {
    sounds.click();
    setPage(tabId);
    setDrawerOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-3 sm:px-4 flex items-center justify-between gap-3 safe-top"
        style={{
          background: 'rgba(15, 15, 26, 0.94)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(124, 58, 237, 0.25)',
        }}>
        {/* Logo & Role Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              Р
            </div>
            <div>
              <div className="text-base font-black tracking-tight gradient-text">РусЛёрн</div>
              <div className="text-[9px] text-gray-400 -mt-1 hidden sm:block">ЕГЭ & База данных</div>
            </div>
          </button>

          {/* Fixed Role Badge (NO CHEATING SWITCHER!) */}
          <div
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
            style={{
              background: isTeacher ? 'rgba(236,72,153,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${isTeacher ? 'rgba(236,72,153,0.4)' : 'rgba(124,58,237,0.4)'}`,
              color: isTeacher ? '#f472b6' : '#a78bfa'
            }}
          >
            <span>{isTeacher ? '👩‍🏫 Учитель' : '🧑‍🎓 Ученик'}</span>
            <span className="text-[10px] opacity-70">🔒</span>
          </div>

          {/* Quick Site Map Button */}
          <button
            onClick={() => handleNavClick('site_map')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition-all shrink-0"
            title="Интерактивная схема движения по платформе"
          >
            <span>🗺️ Схема движения</span>
          </button>
        </div>

        {/* Tabs (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-[55vw] py-1 no-scrollbar">
          {currentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 shrink-0 ${
                page === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
              style={page === tab.id ? {
                background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.25))',
                border: '1px solid rgba(124,58,237,0.5)',
              } : {}}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User Stats & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isTeacher && user && (
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-purple-300">Ур. {user.level || 1}</span>
                <span className="text-gray-400">{user.xp || 0} XP</span>
              </div>
              <div className="w-24 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${lp.percent}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #ec4899)'
                  }} />
              </div>
            </div>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => {
              const enabled = toggleSound();
              if (enabled) sounds.click();
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            title={state.sound ? 'Звук включен' : 'Звук выключен'}
          >
            {state.sound !== false ? '🔊' : '🔇'}
          </button>

          {/* Settings button */}
          <button
            onClick={() => {
              sounds.click();
              if (onOpenSettings) onOpenSettings();
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            title="Настройки темы и озвучки"
          >
            ⚙️
          </button>

          {/* User name & Logout */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span>{user?.avatar || '👤'}</span>
            <span className="font-semibold text-gray-200 hidden sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-rose-400 transition-colors ml-1 p-1"
              title="Выйти из аккаунта"
            >
              🚪
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Fixed 5 Touch Tabs) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around px-2 border-t border-purple-500/25 safe-bottom"
        style={{
          background: 'rgba(15, 15, 26, 0.96)',
          backdropFilter: 'blur(20px)',
        }}>
        {mobilePrimaryTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleNavClick(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-transform active:scale-90 ${
              page === tab.id && !drawerOpen ? 'text-purple-400' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
            <span className="truncate max-w-[64px]">{tab.label}</span>
          </button>
        ))}

        {/* 5th Tab: Mobile Drawer Button */}
        <button
          onClick={() => { sounds.click(); setDrawerOpen(!drawerOpen); }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-transform active:scale-90 ${
            drawerOpen ? 'text-pink-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none mb-0.5">{drawerOpen ? '✕' : '☰'}</span>
          <span>{drawerOpen ? 'Закрыть' : 'Ещё'}</span>
        </button>
      </div>

      {/* Mobile Slide-Up Drawer Sheet */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Sheet Body */}
          <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto bg-[#131322] border-t border-purple-500/40 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-slideUp safe-bottom">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1 mb-2" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{user?.avatar || '🧑‍🎓'}</span>
                <div>
                  <div className="font-bold text-white text-sm">{user?.name}</div>
                  <div className="text-[11px] text-purple-300">
                    {isTeacher ? 'Преподаватель' : `Ученик • Ур. ${user?.level || 1} (${user?.xp || 0} XP)`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Все разделы платформы:</div>

            <div className="grid grid-cols-2 gap-2.5">
              {currentTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleNavClick(tab.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                    page === tab.id
                      ? 'bg-purple-900/40 border-purple-500 text-white font-bold'
                      : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="text-xs font-semibold">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={() => { toggleSound(); sounds.click(); }}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 flex items-center justify-center gap-1.5"
              >
                <span>{state.sound !== false ? '🔊' : '🔇'}</span>
                <span>{state.sound !== false ? 'Звук' : 'Без звука'}</span>
              </button>

              <button
                onClick={() => { if (onOpenSettings) onOpenSettings(); setDrawerOpen(false); }}
                className="py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-purple-300 flex items-center justify-center gap-1"
              >
                <span>⚙️</span> Тема
              </button>

              <button
                onClick={logout}
                className="py-3 px-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-center gap-1"
              >
                <span>🚪</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// АНТИЧИТ ТЕСТИРОВАНИЕ ДЛЯ УЧЕНИКА (ЗАЩИТА ОТ СПИСЫВАНИЯ)
// =============================================================================
function ExamTasksPage({ store, activeTopic }) {
  const [selectedTopic, setSelectedTopic] = useState(activeTopic || 'chered');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState('start'); // 'start' | 'exam' | 'result'
  const [timer, setTimer] = useState(25);

  // Античит-метрики
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [suspiciousSpeedCount, setSuspiciousSpeedCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [cheatAlertMsg, setCheatAlertMsg] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [examStartTime, setExamStartTime] = useState(null);

  const { state, reportAntiCheat, submitTest } = store;
  const user = state.user;

  // Детектор переключения вкладок
  useEffect(() => {
    if (mode !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sounds.wrong();
        setTabSwitches(prev => {
          const next = prev + 1;
          reportAntiCheat('TAB_BLUR', `Переключение вкладки #${next} на задании #${currentIdx + 1}`);

          setCheatAlertMsg(
            `⚠️ ВНИМАНИЕ: Зафиксирован уход с вкладки тестирования! (Нарушение #${next} из 3). Попытка перехода на другой сайт зафиксирована в журнале учителя.`
          );
          setShowWarningModal(true);

          if (next >= 3) {
            // Принудительное завершение
            finishExam(score, questions.length, next, copyAttempts, suspiciousSpeedCount);
          }
          return next;
        });
      }
    };

    const handleBlur = () => {
      // Фокус окна потерян
      sounds.wrong();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, currentIdx, score, copyAttempts, suspiciousSpeedCount]);

  // Таймер вопроса
  useEffect(() => {
    if (mode === 'exam' && timer > 0 && !showWarningModal) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && mode === 'exam') {
      handleAnswer(null);
    }
  }, [mode, timer, showWarningModal]);

  const startExam = () => {
    sounds.click();
    const qs = generateQuestions(selectedTopic, 'all', 6);
    // Перемешиваем варианты для защиты от списывания букв
    const randomized = qs.map(q => {
      if (!q.options) return q;
      const opts = [...q.options].sort(() => Math.random() - 0.5);
      return { ...q, options: opts };
    });

    setQuestions(randomized);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setTabSwitches(0);
    setCopyAttempts(0);
    setSuspiciousSpeedCount(0);
    setTimer(25);
    setQuestionStartTime(Date.now());
    setExamStartTime(Date.now());
    setMode('exam');
  };

  const handleCopyAttempt = (e) => {
    e.preventDefault();
    sounds.wrong();
    setCopyAttempts(c => c + 1);
    reportAntiCheat('COPY_ATTEMPT', `Попытка копирования задания #${currentIdx + 1}`);
    alert('🚫 Копирование заданий запрещено правилами академической честности! Попытка зафиксирована в журнале учителя.');
  };

  const handleAnswer = (ans) => {
    const elapsedSec = (Date.now() - questionStartTime) / 1000;
    let fastCount = suspiciousSpeedCount;

    // Проверка подозрительно быстрых ответов (<1.2 секунды)
    if (elapsedSec < 1.2 && ans !== null) {
      fastCount += 1;
      setSuspiciousSpeedCount(fastCount);
      reportAntiCheat('FAST_ANSWER', `Слишком быстрый ответ (${elapsedSec.toFixed(1)} сек) на вопрос #${currentIdx + 1}`);
    }

    const currentQ = questions[currentIdx];
    const isCorrect = ans === currentQ?.answer;
    const nextScore = isCorrect ? score + 1 : score;
    setScore(nextScore);

    if (isCorrect) sounds.correct();
    else sounds.wrong();

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setTimer(25);
      setQuestionStartTime(Date.now());
    } else {
      finishExam(nextScore, questions.length, tabSwitches, copyAttempts, fastCount);
    }
  };

  const finishExam = async (finalScore, totalQ, tabs, copies, fast) => {
    const duration = Math.round((Date.now() - examStartTime) / 1000);
    const acc = Math.round((finalScore / totalQ) * 100);

    await submitTest({
      testTitle: `Тест: ${PAMYATKI.find(p => p.id === selectedTopic)?.title || selectedTopic}`,
      topicId: selectedTopic,
      score: finalScore,
      total: totalQ,
      accuracy: acc,
      tabSwitches: tabs,
      copyAttempts: copies,
      suspiciousSpeedCount: fast,
      durationSeconds: duration,
    });

    setMode('result');
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative animate-fadeIn select-none"
      onCopy={handleCopyAttempt}
      onCut={handleCopyAttempt}
      onContextMenu={e => { e.preventDefault(); handleCopyAttempt(e); }}
    >
      {/* Dynamic Anti-Screenshot Watermark */}
      {mode === 'exam' && <AntiCheatWatermark user={user} />}

      {/* Warning Alert Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="card max-w-md p-6 text-center space-y-4 border-rose-500 bg-rose-950/80 shadow-2xl">
            <div className="text-5xl">🚨</div>
            <h3 className="text-xl font-black text-rose-300">НАРУШЕНИЕ ДИСЦИПЛИНЫ ТЕСТИРОВАНИЯ</h3>
            <p className="text-xs text-rose-100 leading-relaxed">{cheatAlertMsg}</p>
            <button
              onClick={() => { sounds.click(); setShowWarningModal(false); }}
              className="btn-primary w-full py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700"
            >
              Я понял, возвращаюсь к тесту
            </button>
          </div>
        </div>
      )}

      {mode === 'start' ? (
        <div className="card p-8 text-center space-y-6">
          <div className="inline-block p-4 rounded-3xl bg-purple-500/20 text-4xl mb-1">🛡️</div>
          <h1 className="text-3xl font-black text-white">Режим защищённого тестирования</h1>
          <p className="text-gray-300 text-sm max-w-lg mx-auto">
            Здесь включена система защиты от списывания. Результаты с аналитикой честности передаются учителю.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">👁️ Контроль вкладок</div>
              <div className="text-gray-400">Уход с вкладки считается попыткой списывания</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">🚫 Блок буфера</div>
              <div className="text-gray-400">Копирование заданий и контекстное меню отключены</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">🔀 Анти-подглядывание</div>
              <div className="text-gray-400">Варианты ответов перемешаны, наложен водяной знак</div>
            </div>
          </div>

          <div className="max-w-xs mx-auto space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase">Выбери тему теста:</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="input-field py-2 text-sm bg-slate-900"
            >
              {PAMYATKI.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
              ))}
            </select>

            <button
              onClick={startExam}
              className="btn-primary w-full py-3 text-sm font-bold shadow-xl"
            >
              Начать тест под защитой 🛡️
            </button>
          </div>
        </div>
      ) : mode === 'exam' && currentQ ? (
        <div className="card p-6 space-y-6 relative">
          {/* Top Anti-cheat status bar */}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Вопрос {currentIdx + 1} из {questions.length}</span>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tabSwitches === 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/50'
              }`}>
                🛡️ Уходов: {tabSwitches} / 3
              </span>
              <span className={timer <= 5 ? 'text-rose-400 font-mono animate-pulse' : 'text-purple-400 font-mono'}>
                ⏱️ {timer}с
              </span>
            </div>
          </div>

          {/* Question text */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {currentQ.q}
            </h2>
          </div>

          {/* Options */}
          {currentQ.options && (
            <div className="grid sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(opt)}
                  className="p-4 rounded-xl text-left border border-white/10 bg-white/5 hover:bg-purple-900/30 hover:border-purple-500/50 text-sm font-medium text-gray-200 transition-all flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold text-purple-300">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : mode === 'result' ? (
        <div className="card p-8 text-center space-y-6 animate-fadeIn">
          <div className="text-6xl mb-2">
            {tabSwitches === 0 ? '🏆' : '⚠️'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Тест сдан и записан в базу данных!</h2>
            <p className="text-gray-400 text-xs mt-1">Данные успешно отправлены в кабинет учителя</p>
          </div>

          <div className="text-5xl font-black gradient-text">
            {score} / {questions.length}
          </div>

          {/* Anti-cheat audit badge */}
          <div className="p-4 rounded-2xl max-w-md mx-auto space-y-2 border text-xs"
            style={{
              background: tabSwitches === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              borderColor: tabSwitches === 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
            }}>
            <div className="font-bold flex items-center justify-center gap-2 text-sm">
              <span>{tabSwitches === 0 ? '🟢 Пройдено честно' : '🔴 Зафиксированы подозрительные действия'}</span>
            </div>
            <div className="text-gray-300">
              Переключений вкладок: <strong>{tabSwitches}</strong> · Попыток копирования: <strong>{copyAttempts}</strong>
            </div>
          </div>

          <button
            onClick={() => setMode('start')}
            className="btn-primary py-2.5 px-6 text-xs font-bold"
          >
            Пройти другой тест ➜
          </button>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// АНТИЧИТ МОНИТОР ДЛЯ УЧИТЕЛЯ (РЕАЛЬНЫЕ ДАННЫЕ ИЗ БАЗЫ)
// =============================================================================
function TeacherAntiCheatMonitor() {
  const [submissions, setSubmissions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res1 = await fetch('/api/teacher/submissions');
      const data1 = await res1.json();
      if (data1.submissions) setSubmissions(data1.submissions);

      const res2 = await fetch('/api/teacher/anticheat-logs');
      const data2 = await res2.json();
      if (data2.logs) setLogs(data2.logs);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // авто-обновление каждые 8 секунд
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">🛡️ Монитор защиты от списывания</h1>
          <p className="text-gray-400 text-sm">
            Аудит академической честности в реальном времени из базы данных SQLite
          </p>
        </div>

        <button
          onClick={fetchData}
          className="btn-secondary text-xs py-2 px-4 self-start flex items-center gap-1.5"
        >
          <span>🔄</span> Обновить данные
        </button>
      </div>

      {/* Submissions with cheat status */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>📋</span> Сданные работы учеников
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-bold">
                <th className="pb-3">Ученик</th>
                <th className="pb-3">Тест</th>
                <th className="pb-3">Результат</th>
                <th className="pb-3">Уходов с вкладки</th>
                <th className="pb-3">Копирований</th>
                <th className="pb-3">Статус честности</th>
                <th className="pb-3">Время сдачи</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {submissions.map((sub, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-bold text-white">{sub.student_name}</td>
                  <td className="py-3 text-gray-300">{sub.test_title}</td>
                  <td className="py-3">
                    <span className="font-bold text-purple-300">{sub.score} / {sub.total}</span>
                    <span className="text-gray-500 text-[10px] ml-1">({sub.accuracy}%)</span>
                  </td>
                  <td className="py-3">
                    <span className={sub.tab_switches > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                      {sub.tab_switches} раз
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={sub.copy_attempts > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                      {sub.copy_attempts}
                    </span>
                  </td>
                  <td className="py-3">
                    {sub.cheat_status === 'CLEAN' ? (
                      <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        🟢 Честно
                      </span>
                    ) : sub.cheat_status === 'SUSPICIOUS' ? (
                      <span className="badge bg-amber-950 text-amber-300 border border-amber-500/40">
                        🟡 Подозрение
                      </span>
                    ) : (
                      <span className="badge bg-rose-950 text-rose-300 border border-rose-500/50">
                        🔴 Списывание
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-gray-400 text-[10px]">
                    {new Date(sub.submitted_at).toLocaleTimeString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Anti-cheat logs */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>🚨</span> Лента инцидентов и нарушений
        </h2>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {logs.map((lg, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-rose-300 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{lg.user_name}</span>
                  <span className="badge text-[10px] bg-black/40 text-gray-300">{lg.event_type}</span>
                </div>
                <div className="text-gray-300 text-[11px]">{lg.details}</div>
              </div>
              <div className="text-[10px] text-gray-500 whitespace-nowrap">
                {new Date(lg.timestamp).toLocaleTimeString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STUDENT HOME DASHBOARD
// =============================================================================
function StudentHome({ store, setPage }) {
  const { state } = store;
  const user = state.user;
  const lp = store.getLevelProgress();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.25))',
          border: '1px solid rgba(124,58,237,0.4)',
        }}>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{user?.avatar || '🧑‍🎓'}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                Привет, {user?.name}!
              </h1>
              <p className="text-purple-200 text-sm">Аккаунт ученика · РусЛёрн (защита данных в SQLite)</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6 p-4 rounded-2xl bg-black/30 border border-white/10 max-w-md">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-purple-300">Уровень {user?.level || 1}</span>
              <span className="text-gray-300">{lp.current} / {lp.needed} XP до ур. {(user?.level || 1) + 1}</span>
            </div>
            <div className="progress-bar h-2.5">
              <div className="progress-fill" style={{ width: `${lp.percent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Featured EGE & Author Formulas Banners */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => { sounds.click(); setPage('ege_exam'); }}
          className="card p-6 text-left relative overflow-hidden group hover:scale-[1.01] transition-all border-purple-500/50"
          style={{ background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(15, 15, 26, 0.95))' }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl">🎯</span>
            <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold">
              27 заданий ФИПИ
            </span>
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
            Решать ЕГЭ 2026/2027 онлайн
          </h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Полный вариант с официальным таймером, мгновенной проверкой, разбором ошибок, шкалой в 100 баллов и чекером сочинения.
          </p>
          <div className="mt-4 text-xs font-bold text-purple-400 flex items-center gap-1">
            Начать решение варианта ➜
          </div>
        </button>

        <button
          onClick={() => { sounds.click(); setPage('formulas'); }}
          className="card p-6 text-left relative overflow-hidden group hover:scale-[1.01] transition-all border-pink-500/50"
          style={{ background: 'linear-gradient(135deg, rgba(157, 23, 77, 0.35), rgba(15, 15, 26, 0.95))' }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl">⚡</span>
            <span className="badge bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[11px] font-bold">
              0% Плагиата
            </span>
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-pink-300 transition-colors">
            Авторские формулы и алгоритмы
          </h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Метод «ЦелУЮ/МилАЯ», правило «ТО-НО-ТАК», матрица Н/НН и 4 закона корней. Пошаговые блок-схемы без занудных учебников.
          </p>
          <div className="mt-4 text-xs font-bold text-pink-400 flex items-center gap-1">
            Открыть интерактивные формулы ➜
          </div>
        </button>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚡</span> Быстрый запуск
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'PVP Дуэли 1 на 1',
              desc: 'Онлайн-битва с другом по 4-значному PIN-коду до 10 очков',
              icon: '⚔️',
              action: () => setPage('pvp_duel'),
              grad: 'from-purple-600 to-rose-600',
            },
            {
              title: 'ИИ-Диагностика пробелов',
              desc: 'Персональная тепловая карта и работа над ошибками в 1 клик',
              icon: '🧠',
              action: () => setPage('ai_diagnostics'),
              grad: 'from-indigo-600 to-purple-800',
            },
            {
              title: 'Голосовое сочинение',
              desc: 'Диктуй в микрофон, система разобьёт на 7 абзацев ФИПИ',
              icon: '🎤',
              action: () => setPage('voice_essay'),
              grad: 'from-pink-600 to-rose-600',
            },
            {
              title: 'Бланки ФИПИ А4',
              desc: 'Аутентичные бланки №1 и №2 с QR-кодами и ключами в PDF',
              icon: '📄',
              action: () => setPage('fipi_forms'),
              grad: 'from-blue-600 to-indigo-700',
            },
            {
              title: 'Блиц-Спринт (60 сек)',
              desc: 'Мобильный фаст-тест ударений с комбо-очками',
              icon: '⚡',
              action: () => setPage('blitz_sprint'),
              grad: 'from-amber-500 to-rose-600',
            },
            {
              title: 'Тест с античитом',
              desc: 'Контрольный срез с фиксацией честности',
              icon: '🛡️',
              action: () => setPage('exam_tasks'),
              grad: 'from-purple-600 to-indigo-700',
            },
            {
              title: 'Тренажёр ударений',
              desc: 'Орфоэпия ЕГЭ (№4) с голосовой озвучкой',
              icon: '🎙️',
              action: () => setPage('orthoepy'),
              grad: 'from-pink-600 to-rose-700',
            },
            {
              title: 'Словарь паронимов',
              desc: 'Различай сложные пары слов (№5 ЕГЭ)',
              icon: '👥',
              action: () => setPage('paronyms'),
              grad: 'from-amber-600 to-orange-700',
            },
            {
              title: 'Аудио-диктант',
              desc: 'Пиши под диктовку и проверяй орфограммы',
              icon: '✍️',
              action: () => setPage('dictation'),
              grad: 'from-emerald-600 to-teal-700',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => { sounds.click(); item.action(); }}
              className="card text-left group relative overflow-hidden transition-all hover:scale-[1.02]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.grad} opacity-15 group-hover:opacity-25 transition-opacity`} />
              <div className="relative z-10">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-bold text-white text-base">{item.title}</div>
                <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Topics preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📖</span> База памяток (5–11 классы)
          </h2>
          <button
            onClick={() => { sounds.click(); setPage('pamyatki'); }}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300"
          >
            Все памятки →
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PAMYATKI.slice(0, 6).map(p => (
            <div
              key={p.id}
              onClick={() => { sounds.click(); setPage('pamyatki'); }}
              className="card p-4 cursor-pointer hover:border-purple-500/50 hover:scale-[1.01] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{p.icon}</span>
                <span className="badge text-[10px] bg-white/10 text-gray-300">{p.grade} кл.</span>
              </div>
              <h3 className="font-bold text-sm text-white">{p.title}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.shortDesc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TEACHER CABINET
// =============================================================================
function TeacherCabinet({ store, setPage }) {
  const { state } = store;
  const user = state.user;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(124,58,237,0.25))',
          border: '1px solid rgba(236,72,153,0.4)',
        }}>
        <div className="relative z-10">
          <span className="badge bg-pink-500/20 text-pink-300 text-xs mb-2">Кабинет учителя</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {user?.name} {user?.avatar || '👩‍🏫'}
          </h1>
          <p className="text-gray-300 text-sm mt-1">
            Защищённый доступ: только для преподавателей. Генерация тестов, проверка сочинений и монитор нарушений.
          </p>
        </div>
      </div>

      {/* Quick Tools */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Тренажёр ЕГЭ 2026',
            desc: 'Полный экзаменационный вариант (27 заданий) с разборами',
            icon: '🎯',
            action: () => setPage('ege_exam'),
          },
          {
            title: 'Авторские формулы',
            desc: 'Интерактивные блок-схемы и алгоритмы ФИПИ без плагиата',
            icon: '⚡',
            action: () => setPage('formulas'),
          },
          {
            title: 'Античит-монитор',
            desc: 'Лента нарушений и журнал попыток списать из базы SQLite',
            icon: '🛡️',
            action: () => setPage('anticheat_monitor'),
          },
          {
            title: 'Генератор вариантов (А4)',
            desc: 'Формируй Вариант 1 + Вариант 2 с ключами для печати',
            icon: '🎲',
            action: () => setPage('generator'),
          },
          {
            title: 'Бланки ФИПИ (А4 / PDF)',
            desc: 'Печать официальных бланков №1 и №2 с QR-кодами и ключами',
            icon: '📄',
            action: () => setPage('fipi_forms'),
          },
          {
            title: 'Голосовое сочинение',
            desc: 'Диктовка через микрофон и авто-разметка на 7 абзацев',
            icon: '🎤',
            action: () => setPage('voice_essay'),
          },
          {
            title: 'ИИ-Диагностика класса',
            desc: 'Тепловая карта знаний и целевая ликвидация пробелов',
            icon: '🧠',
            action: () => setPage('ai_diagnostics'),
          },
          {
            title: 'Чекер сочинений ЕГЭ',
            desc: 'Критерии К1–К12, подсчёт слов, структура 7 абзацев',
            icon: '📑',
            action: () => setPage('essay_checker'),
          },
          {
            title: 'Журнал успеваемости',
            desc: 'Таблица классов, средние баллы и аудит честности',
            icon: '👥',
            action: () => setPage('students'),
          },
        ].map((tool, idx) => (
          <button
            key={idx}
            onClick={() => { sounds.click(); tool.action(); }}
            className="card p-5 text-left hover:border-pink-500/50 hover:scale-[1.02] transition-all"
          >
            <div className="text-3xl mb-2">{tool.icon}</div>
            <h3 className="font-bold text-base text-white">{tool.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{tool.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// REUSED MODULES: PAMYATKI, GENERATOR, ORTHOEPY, PARONYMS, DICTATION, ESSAY
// =============================================================================

function PamyatkiPage({ setPage }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');

  const categories = ['Все', 'Разборы', 'Орфография', 'Пунктуация', 'ЕГЭ', 'Экзамены', 'Экспертиза'];

  const filtered = PAMYATKI.filter(p => {
    const matchCat = category === 'Все' || p.category === category;
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        <button
          onClick={() => { sounds.click(); setSelected(null); }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Вернуться ко всем памяткам
        </button>

        <div className={`rounded-3xl p-8 bg-gradient-to-br ${selected.color} text-white relative overflow-hidden shadow-2xl`}>
          <div className="relative z-10">
            <span className="text-5xl block mb-3">{selected.icon}</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge bg-black/30 text-white text-xs">{selected.grade} класс</span>
              <span className="badge bg-black/30 text-white text-xs">{selected.category}</span>
            </div>
            <h1 className="text-3xl font-black mb-2">{selected.title}</h1>
            <p className="text-white/80 text-sm max-w-2xl">{selected.shortDesc}</p>
          </div>
        </div>

        {selected.rules && (
          <div className="grid sm:grid-cols-2 gap-3">
            {selected.rules.map((r, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <span className="text-xs font-semibold text-gray-200">{r.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card space-y-4 leading-relaxed">
          <div className="prose prose-invert max-w-none text-gray-200 text-sm space-y-3 whitespace-pre-line">
            {selected.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">📖 База памяток и правил</h1>
          <p className="text-gray-400 text-sm">Сквозная база знаний с 5 по 11 класс, разборы и экзаменационные блоки</p>
        </div>

        <input
          type="text"
          className="input-field py-2 text-sm md:w-72"
          placeholder="Поиск по правилам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { sounds.click(); setCategory(cat); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              category === cat ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div
            key={p.id}
            onClick={() => { sounds.click(); setSelected(p); }}
            className="card p-5 cursor-pointer hover:border-purple-500/50 hover:scale-[1.01] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{p.icon}</span>
                <span className="badge text-[10px] bg-white/10 text-gray-300">{p.grade} класс</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">{p.title}</h3>
              <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-2">{p.category}</div>
              <p className="text-xs text-gray-400 line-clamp-3">{p.shortDesc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-purple-300 font-semibold">
              <span>Открыть памятку</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratorPage({ store }) {
  const [topic, setTopic] = useState('all');
  const [taskType, setTaskType] = useState('all');
  const [count, setCount] = useState(6);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [variant2, setVariant2] = useState(null);
  const [copied, setCopied] = useState(false);
  const [schoolName, setSchoolName] = useState('Школа № ___');

  const isTeacher = store.state.user?.role === 'teacher';

  const handleGenerate = () => {
    sounds.click();
    sounds.correct();
    const q1 = generateQuestions(topic, taskType, count);
    setGeneratedQuestions(q1);

    if (isTeacher) {
      const q2 = generateQuestions(topic, taskType, count);
      setVariant2(q2);
    }
  };

  const copyText = () => {
    if (!generatedQuestions) return;
    sounds.click();
    let text = `📋 КОНТРОЛЬНОЕ ЗАДАНИЕ ПО РУССКОМУ ЯЗЫКУ\n`;
    text += `Тема: ${topic === 'all' ? 'Комплексный срез' : PAMYATKI.find(p => p.id === topic)?.title || topic}\n`;
    text += `Количество заданий: ${generatedQuestions.length}\n\n`;

    text += `--- ВАРИАНТ 1 ---\n`;
    generatedQuestions.forEach((q, i) => {
      text += `${i + 1}. ${q.q}\n`;
      if (q.options) {
        q.options.forEach((opt, idx) => {
          text += `   ${String.fromCharCode(65 + idx)}) ${opt}\n`;
        });
      }
      text += '\n';
    });

    text += `\n--- КЛЮЧИ К ОТВЕТАМ ---\n`;
    generatedQuestions.forEach((q, i) => {
      text += `${i + 1}. ${q.answer}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Printable Area */}
      {generatedQuestions && (
        <div className="printable-area hidden print:block text-black p-8 font-serif leading-relaxed">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h2 className="text-xl font-bold uppercase">{schoolName}</h2>
            <h1 className="text-2xl font-black mt-1">Проверочная работа по русскому языку</h1>
            <div className="flex justify-between text-sm mt-3 px-4">
              <span>ФИО ученика: __________________________________</span>
              <span>Класс: ______</span>
              <span>Дата: «____» _________ 202_ г.</span>
            </div>
          </div>

          <h3 className="text-lg font-bold border-b border-black pb-1 mb-4">ВАРИАНТ 1</h3>
          <div className="space-y-4">
            {generatedQuestions.map((q, i) => (
              <div key={i} className="text-sm">
                <p className="font-bold">{i + 1}. {q.q}</p>
                {q.options && (
                  <div className="grid grid-cols-2 gap-2 mt-1 ml-4">
                    {q.options.map((opt, idx) => (
                      <div key={idx}>
                        <span>{String.fromCharCode(65 + idx)}) </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-600">Ответ: _____________________</div>
              </div>
            ))}
          </div>

          {variant2 && (
            <div className="print-page-break mt-8">
              <h3 className="text-lg font-bold border-b border-black pb-1 mb-4">ВАРИАНТ 2</h3>
              <div className="space-y-4">
                {variant2.map((q, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-bold">{i + 1}. {q.q}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-2 mt-1 ml-4">
                        {q.options.map((opt, idx) => (
                          <div key={idx}>
                            <span>{String.fromCharCode(65 + idx)}) </span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-600">Ответ: _____________________</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="print-page-break mt-12 border-t-2 border-dashed border-black pt-6">
            <h3 className="text-lg font-bold text-center uppercase mb-4">КЛЮЧИ ДЛЯ УЧИТЕЛЯ</h3>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-bold mb-2">Вариант 1</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {generatedQuestions.map((q, i) => (
                    <li key={i}><strong>{q.answer}</strong></li>
                  ))}
                </ol>
              </div>
              {variant2 && (
                <div>
                  <h4 className="font-bold mb-2">Вариант 2</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    {variant2.map((q, i) => (
                      <li key={i}><strong>{q.answer}</strong></li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen interface */}
      <div className="no-print">
        <h1 className="text-3xl font-black text-white mb-6">🎲 Генератор заданий и тестов</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card p-4 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Тема</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="input-field py-2 text-sm bg-slate-900"
              >
                <option value="all">🌟 Все темы</option>
                {PAMYATKI.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
                ))}
              </select>
            </div>

            <div className="card p-4 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Формат</label>
              <select
                value={taskType}
                onChange={e => setTaskType(e.target.value)}
                className="input-field py-2 text-sm bg-slate-900"
              >
                <option value="all">🔀 Разные форматы</option>
                <option value="choose_right">☑️ Выбор варианта</option>
                <option value="insert_letters">🔤 Вставить букву</option>
                <option value="find_error">🔍 Найти ошибку</option>
                <option value="punctuation">✏️ Пунктуация</option>
              </select>
            </div>

            <div className="card p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Количество</span>
                <span className="text-purple-400 font-bold">{count}</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {isTeacher && (
              <div className="card p-4 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Шапка школы (для А4)</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className="input-field py-2 text-sm"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="btn-primary w-full py-3 text-sm font-bold shadow-xl"
            >
              🎲 Сгенерировать {isTeacher ? '2 варианта с ключами' : 'задания'}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {generatedQuestions ? (
              <div className="card p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white">Готовый вариант</h3>
                    <p className="text-xs text-gray-400">
                      {generatedQuestions.length} заданий {variant2 ? '· 2 параллельных варианта с ключами' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyText}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      {copied ? '✅ Скопировано!' : '📋 Копировать'}
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      🖨️ Печать (А4)
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {generatedQuestions.map((q, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-purple-300">#{i + 1}</span>
                      </div>
                      <p className="text-sm font-medium text-white">{q.q}</p>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-black/20 text-xs text-gray-300 flex items-center gap-2">
                              <span className="font-bold text-gray-500">{String.fromCharCode(65 + idx)})</span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-emerald-400 font-bold">
                        Ключ: {q.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
                <div className="text-5xl mb-3">🎲</div>
                <h3 className="font-bold text-lg text-white mb-1">Генератор готов к созданию заданий</h3>
                <p className="text-gray-400 text-sm max-w-sm">Выбери параметры и нажми кнопку</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrthoepyTrainer({ store }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const { addXP } = store;
  const currentItem = ORTHOEPY_WORDS[currentIndex % ORTHOEPY_WORDS.length];
  const vowels = ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я'];

  const handleVowelClick = (charIndex) => {
    if (showAnswer) return;
    setSelectedLetter(charIndex);
    setShowAnswer(true);

    const isCorrect = charIndex === currentItem.stressIndex;
    if (isCorrect) {
      setScore(s => s + 1);
      addXP(20, true);
    } else {
      addXP(0, false);
    }
    setTotal(t => t + 1);
    sounds.speak(currentItem.stress);
  };

  const handleNext = () => {
    sounds.click();
    setCurrentIndex(i => i + 1);
    setSelectedLetter(null);
    setShowAnswer(false);
  };

  return (
    <AntiCheatShield store={store} activityName="Тренажёр ударений (ЕГЭ №4)">
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 rounded-2xl bg-pink-500/20 text-3xl mb-1">🎙️</div>
          <h1 className="text-3xl font-black text-white">Тренажёр ударений (ЕГЭ №4)</h1>
          <p className="text-gray-400 text-sm">
            Нажимай на ударную гласную. Правильное произношение озвучивается диктором!
          </p>
        </div>

        <div className="card p-8 text-center space-y-6">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400">
            <span>Слово #{currentIndex + 1}</span>
            <span className="text-pink-400">Счёт: {score} из {total}</span>
          </div>

          <div className="py-6">
            <div className="flex justify-center items-center gap-1.5 flex-wrap">
              {currentItem.word.split('').map((letter, idx) => {
                const isVowel = vowels.includes(letter.toLowerCase());
                const isTargetStress = idx === currentItem.stressIndex;

                let style = 'bg-white/5 text-white hover:bg-white/15';
                if (showAnswer) {
                  if (isTargetStress) {
                    style = 'bg-emerald-500 text-white font-black scale-110 shadow-lg ring-2 ring-emerald-300';
                  } else if (idx === selectedLetter) {
                    style = 'bg-rose-500 text-white font-bold';
                  } else {
                    style = 'opacity-40 bg-white/5 text-gray-400';
                  }
                }

                if (isVowel) {
                  return (
                    <button
                      key={idx}
                      disabled={showAnswer}
                      onClick={() => handleVowelClick(idx)}
                      className={`w-12 h-14 rounded-2xl text-2xl font-bold flex items-center justify-center transition-all ${style}`}
                    >
                      {showAnswer && isTargetStress ? letter.toUpperCase() : letter}
                    </button>
                  );
                }

                return (
                  <span key={idx} className="w-8 h-14 text-2xl font-semibold flex items-center justify-center text-gray-400">
                    {letter}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => sounds.speak(currentItem.stress)}
            className="btn-secondary py-1.5 px-4 text-xs font-semibold inline-flex items-center gap-2 mx-auto"
          >
            <span>🔊</span> Послушать диктора
          </button>

          {showAnswer && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-fadeIn">
              <div className="text-lg font-black text-white">
                Норма: <span className="text-emerald-400 font-mono text-xl">{currentItem.stress}</span>
              </div>
              <p className="text-xs text-gray-300">💡 <strong>Правило:</strong> {currentItem.rule}</p>
              <div className="pt-2">
                <button
                  onClick={handleNext}
                  className="btn-primary py-2 px-8 text-xs font-bold"
                >
                  Следующее слово ➜
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AntiCheatShield>
  );
}

function ParonymsTrainer({ store }) {
  const [pairIdx, setPairIdx] = useState(0);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const { addXP } = store;
  const currentPair = PARONYMS_DATA[pairIdx % PARONYMS_DATA.length];

  // Случайный выбор целевого слова и 100% случайное расположение кнопок (лево/право)
  const { targetWord, options } = useMemo(() => {
    const tIdx = Math.floor(Math.random() * currentPair.words.length);
    const tw = currentPair.words[tIdx] || currentPair.words[0];
    const opts = [...currentPair.words].sort(() => Math.random() - 0.5);
    return { targetWord: tw, options: opts };
  }, [pairIdx, currentPair]);

  const handleSelect = (wordObj) => {
    if (showResult) return;
    setSelectedWord(wordObj);
    setShowResult(true);

    const isCorrect = wordObj.name === targetWord.name;
    if (isCorrect) {
      sounds.correct();
      addXP(20, true);
    } else {
      sounds.wrong();
      addXP(0, false);
    }
  };

  const handleNext = () => {
    sounds.click();
    setSelectedWord(null);
    setShowResult(false);
    setPairIdx(p => p + 1);
  };

  return (
    <AntiCheatShield store={store} activityName="Словарь паронимов (ЕГЭ №5)">
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 rounded-2xl bg-amber-500/20 text-3xl mb-1">👥</div>
          <h1 className="text-3xl font-black text-white">Словарь паронимов ФИПИ (ЕГЭ №5)</h1>
          <p className="text-gray-400 text-sm">Учись различать оттенки значений слов • Случайное расположение ответов</p>
        </div>

        <div className="card p-6 space-y-6">
          <div className="text-center pb-4 border-b border-white/10">
            <span className="badge text-xs bg-amber-500/20 text-amber-300 mb-2">Паронимическая пара</span>
            <h2 className="text-2xl font-black text-white">{currentPair.pair}</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {currentPair.words.map((w, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h3 className="font-bold text-base text-amber-300">{w.name}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{w.def}</p>
                <div className="text-xs text-gray-400 italic pt-2 border-t border-white/5">
                  Пример: «{w.example}»
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/30 space-y-4">
            <h4 className="font-bold text-sm text-white">В каком контексте верно употреблено слово «{targetWord.name.toUpperCase()}»?</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {options.map((w, idx) => (
                <button
                  key={idx}
                  disabled={showResult}
                  onClick={() => handleSelect(w)}
                  className={`p-3.5 rounded-xl text-left text-xs font-semibold border transition-all ${
                    showResult
                      ? w.name === targetWord.name
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : w === selectedWord
                        ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                        : 'opacity-40 border-white/5'
                      : 'bg-white/5 border-white/10 hover:border-amber-500/50 text-gray-200 active:scale-95'
                  }`}
                >
                  «{w.example}»
                </button>
              ))}
            </div>

            {showResult && (
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">
                  {selectedWord?.name === targetWord.name ? '✅ Верно! +20 XP' : '❌ Ошибка в выборе контекста'}
                </span>
                <button
                  onClick={handleNext}
                  className="btn-primary py-1.5 px-4 text-xs font-bold"
                >
                  Следующая пара ➜
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AntiCheatShield>
  );
}

function DictationPage({ store }) {
  const [selectedTextIdx, setSelectedTextIdx] = useState(0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);

  const { addXP } = store;
  const currentDict = DICTATION_TEXTS[selectedTextIdx];
  const targetSentence = currentDict.sentences[currentSentenceIdx];

  const handleCheck = () => {
    sounds.click();
    setChecked(true);
    const cleanTyped = typedText.trim().replace(/[.,!?;:—]/g, '').toLowerCase();
    const cleanTarget = targetSentence.trim().replace(/[.,!?;:—]/g, '').toLowerCase();

    if (cleanTyped === cleanTarget) {
      setScore(s => s + 1);
      addXP(30, true);
    } else {
      addXP(0, false);
    }
  };

  const handleNext = () => {
    sounds.click();
    if (currentSentenceIdx + 1 < currentDict.sentences.length) {
      setCurrentSentenceIdx(i => i + 1);
      setTypedText('');
      setChecked(false);
    } else {
      alert(`Диктант завершён! Твой счёт: ${score} из ${currentDict.sentences.length}`);
    }
  };

  return (
    <AntiCheatShield store={store} activityName="Интерактивный аудио-диктант">
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 rounded-2xl bg-emerald-500/20 text-3xl mb-1">✍️</div>
          <h1 className="text-3xl font-black text-white">Интерактивный аудио-диктант</h1>
          <p className="text-gray-400 text-sm">Слушай предложение, записывай под диктовку и проверяй написание</p>
        </div>

        <div className="flex gap-2 justify-center">
          {DICTATION_TEXTS.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => {
                sounds.click();
                setSelectedTextIdx(idx);
                setCurrentSentenceIdx(0);
                setTypedText('');
                setChecked(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedTextIdx === idx ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {d.title} ({d.grade})
            </button>
          ))}
        </div>

        <div className="card p-6 space-y-6">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400">
            <span>Предложение {currentSentenceIdx + 1} из {currentDict.sentences.length}</span>
            <span className="text-emerald-400">{currentDict.level} уровень</span>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
            <button
              onClick={() => sounds.speak(targetSentence)}
              className="btn-primary py-3 px-6 text-sm font-bold inline-flex items-center gap-2 shadow-lg"
            >
              <span>🔊</span> Прослушать предложение
            </button>
            <p className="text-xs text-gray-400">Диктор прочитает предложение</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Запиши предложение:</label>
            <textarea
              rows={3}
              className="input-field text-sm leading-relaxed"
              placeholder="Пиши здесь под диктовку..."
              value={typedText}
              onChange={e => setTypedText(e.target.value)}
              onPaste={e => {
                e.preventDefault();
                alert('🚫 Вставка из буфера обмена заблокирована системой защиты от списывания!');
              }}
              disabled={checked}
            />
          </div>

          {!checked ? (
            <button
              onClick={handleCheck}
              disabled={!typedText.trim()}
              className="btn-primary w-full py-3 text-sm font-bold disabled:opacity-40"
            >
              Проверить написание ✓
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
              <div className="p-3 rounded-xl bg-black/30 text-sm space-y-1">
                <div className="text-xs text-gray-400">Эталон:</div>
                <div className="font-semibold text-emerald-300">{targetSentence}</div>
              </div>

              <button
                onClick={handleNext}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Следующее предложение ➜
              </button>
            </div>
          )}
        </div>
      </div>
    </AntiCheatShield>
  );
}

function EssayChecker() {
  const [essayText, setEssayText] = useState('');
  const [scores, setScores] = useState({
    k1: 1, k2: 3, k3: 1, k4: 1, k5: 2, k6: 1,
    k7: 3, k8: 3, k9: 2, k10: 2, k11: 1, k12: 1,
  });

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const paragraphs = essayText.trim() ? essayText.trim().split(/\n\s*\n/).length : 0;
  const totalPrimary = Object.values(scores).reduce((a, b) => a + b, 0);

  const criteriaList = [
    { id: 'k1', name: 'К1. Формулировка проблемы', max: 1 },
    { id: 'k2', name: 'К2. Комментарий (2 примера + связь)', max: 3 },
    { id: 'k3', name: 'К3. Позиция автора', max: 1 },
    { id: 'k4', name: 'К4. Своя позиция + обоснование', max: 1 },
    { id: 'k5', name: 'К5. Смысловая цельность и абзацы', max: 2 },
    { id: 'k6', name: 'К6. Богатство речи', max: 1 },
    { id: 'k7', name: 'К7. Орфографические нормы', max: 3 },
    { id: 'k8', name: 'К8. Пунктуационные нормы', max: 3 },
    { id: 'k9', name: 'К9. Грамматические нормы', max: 2 },
    { id: 'k10', name: 'К10. Речевые нормы', max: 2 },
    { id: 'k11', name: 'К11. Этические нормы', max: 1 },
    { id: 'k12', name: 'К12. Фактологическая точность', max: 1 },
  ];

  const copyReport = () => {
    sounds.click();
    let rep = `📑 ПРОТОКОЛ ЭКСПЕРТНОЙ ПРОВЕРКИ СОЧИНЕНИЯ (ЕГЭ №27)\n`;
    rep += `Слов: ${wordCount} • Абзацев: ${paragraphs} (норма: 7)\n\n`;
    criteriaList.forEach(c => {
      rep += `• ${c.name}: ${scores[c.id]} из ${c.max}\n`;
    });
    rep += `\nИТОГО: ${totalPrimary} из 21 балла\n`;
    navigator.clipboard.writeText(rep);
    alert('Протокол скопирован в буфер!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-black text-white">📑 Экспертный чекер сочинений (Задание 27 ЕГЭ)</h1>
        <p className="text-gray-400 text-sm">Подсчёт слов, проверка структуры 7 абзацев и критерии ФИПИ К1–К12</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-400 uppercase">Текст сочинения</span>
            <div className="flex gap-2">
              <span className={`badge ${wordCount >= 150 ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'}`}>
                Слов: {wordCount} (мин. 150)
              </span>
              <span className={`badge ${paragraphs === 7 ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
                Абзацев: {paragraphs} / 7
              </span>
            </div>
          </div>

          <textarea
            rows={16}
            className="input-field text-xs leading-relaxed font-sans"
            placeholder="Вставьте текст сочинения ученика..."
            value={essayText}
            onChange={e => setEssayText(e.target.value)}
          />
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Критерии ФИПИ</h3>
              <p className="text-xs text-gray-400">Максимум: 21 первичный балл</p>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {totalPrimary} / 21
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {criteriaList.map(c => (
              <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-300 flex-1">{c.name}</div>
                <div className="flex gap-1">
                  {Array.from({ length: c.max + 1 }).map((_, b) => (
                    <button
                      key={b}
                      onClick={() => {
                        sounds.click();
                        setScores(s => ({ ...s, [c.id]: b }));
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        scores[c.id] === b ? 'bg-purple-600 text-white shadow' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={copyReport}
            className="btn-primary w-full py-2.5 text-xs font-bold"
          >
            📋 Скопировать официальный протокол
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch('/api/teacher/students')
      .then(res => res.json())
      .then(data => {
        if (data.students) setStudents(data.students);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <h1 className="text-3xl font-black text-white">👥 Журнал успеваемости класса (из БД SQLite)</h1>

      <div className="card p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-bold">
                <th className="pb-3">Ученик</th>
                <th className="pb-3">Логин</th>
                <th className="pb-3">Уровень / XP</th>
                <th className="pb-3">Тестов сдано</th>
                <th className="pb-3">Средняя точность</th>
                <th className="pb-3">Нарушений вкладок</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((st, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 flex items-center gap-2 font-bold text-white">
                    <span>{st.avatar}</span>
                    <span>{st.name}</span>
                  </td>
                  <td className="py-3 text-gray-400 font-mono">{st.username}</td>
                  <td className="py-3 text-purple-300 font-bold">Ур. {st.level} ({st.xp} XP)</td>
                  <td className="py-3 text-gray-300">{st.total_tests || 0}</td>
                  <td className="py-3">
                    <span className="font-bold text-emerald-400">
                      {Math.round(st.avg_accuracy || 0)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={st.total_tab_switches > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                      {st.total_tab_switches || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AchievementsPage({ store }) {
  const { state } = store;
  const unlocked = state.achievements || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="inline-block p-3 rounded-2xl bg-amber-500/20 text-3xl mb-1">🏆</div>
        <h1 className="text-3xl font-black text-white">Достижения и трофеи</h1>
        <p className="text-gray-400 text-sm">
          Разблокировано {unlocked.length} из {ACHIEVEMENTS.length} наград
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map(ach => {
          const isDone = unlocked.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`card p-5 border transition-all flex items-start gap-4 ${
                isDone
                  ? 'border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/30'
                  : 'border-white/5 opacity-50 bg-white/5'
              }`}
            >
              <div className="text-4xl">{isDone ? ach.icon : '🔒'}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-sm ${isDone ? 'text-amber-300' : 'text-gray-400'}`}>
                    {ach.title}
                  </h3>
                  <span className="badge text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    +{ach.xp} XP
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{ach.desc}</p>
                {isDone && (
                  <div className="text-[10px] text-emerald-400 font-bold mt-2">
                    ✓ Разблокировано
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ROOT APP COMPONENT (С ПРОВЕРКОЙ АВТОРИЗАЦИИ И СТРОГИМИ ПРАВАМИ)
// =============================================================================
export default function App() {
  const store = useStore();
  const { state } = store;
  const [page, setPage] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Смена темы оформления
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('ruslearn_theme') || 'cyberpunk';
    }
    return 'cyberpunk';
  });

  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ruslearn_theme', currentTheme);
    }
  }, [currentTheme]);

  // Если пользователь не залогинен в БД — показываем экран Входа / Регистрации!
  if (!state.user) {
    return <AuthView store={store} />;
  }

  const isTeacher = state.user.role === 'teacher';

  const renderContent = () => {
    // ЗАЩИТА: Если залогинен Учитель
    if (isTeacher) {
      switch (page) {
        case 'home':
          return <TeacherCabinet store={store} setPage={setPage} />;
        case 'site_map':
          return <SiteMapPage store={store} setPage={setPage} />;
        case 'anticheat_monitor':
          return <TeacherAntiCheatMonitor />;
        case 'ai_diagnostics':
          return <AiDiagnosticsPage store={store} setPage={setPage} />;
        case 'fipi_forms':
          return <FipiFormsPage store={store} setPage={setPage} />;
        case 'voice_essay':
          return <VoiceEssayPage store={store} setPage={setPage} />;
        case 'pvp_duel':
          return <PvpDuelPage store={store} setPage={setPage} />;
        case 'ege_exam':
          return <EgeExamPage store={store} />;
        case 'blitz_sprint':
          return <BlitzSprintPage store={store} setPage={setPage} />;
        case 'formulas':
          return <AuthorFormulasPage store={store} />;
        case 'generator':
          return <GeneratorPage store={store} />;
        case 'essay_checker':
          return <EssayChecker />;
        case 'students':
          return <StudentsPage />;
        case 'pamyatki':
          return <PamyatkiPage setPage={setPage} />;
        default:
          return <TeacherCabinet store={store} setPage={setPage} />;
      }
    }

    // ЗАЩИТА: Если залогинен Ученик
    switch (page) {
      case 'home':
        return <StudentHome store={store} setPage={setPage} />;
      case 'site_map':
        return <SiteMapPage store={store} setPage={setPage} />;
      case 'pvp_duel':
        return <PvpDuelPage store={store} setPage={setPage} />;
      case 'ai_diagnostics':
        return <AiDiagnosticsPage store={store} setPage={setPage} />;
      case 'voice_essay':
        return <VoiceEssayPage store={store} setPage={setPage} />;
      case 'fipi_forms':
        return <FipiFormsPage store={store} setPage={setPage} />;
      case 'ege_exam':
        return <EgeExamPage store={store} />;
      case 'blitz_sprint':
        return <BlitzSprintPage store={store} setPage={setPage} />;
      case 'formulas':
        return <AuthorFormulasPage store={store} />;
      case 'exam_tasks':
        return <ExamTasksPage store={store} activeTopic="chered" />;
      case 'pamyatki':
        return <PamyatkiPage setPage={setPage} />;
      case 'generator':
        return <GeneratorPage store={store} />;
      case 'orthoepy':
        return <OrthoepyTrainer store={store} />;
      case 'paronyms':
        return <ParonymsTrainer store={store} />;
      case 'dictation':
        return <DictationPage store={store} />;
      case 'achievements':
        return <AchievementsPage store={store} />;
      default:
        return <StudentHome store={store} setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ background: 'var(--color-bg)' }}>
      <Particles />
      <Navbar page={page} setPage={setPage} store={store} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-28 w-full flex-1">
        {renderContent()}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      <footer className="relative z-10 py-6 text-center text-xs text-gray-500 border-t border-white/5 no-print">
        РусЛёрн · База данных SQLite · Защита от списывания, пауза 1-2 раза, PVP Дуэли и ИИ-диагностика · 2026/2027
      </footer>
    </div>
  );
}
