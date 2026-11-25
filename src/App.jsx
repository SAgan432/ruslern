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
import { ReshuOgePage } from './ReshuOgePage';
import { StudentsManagementPage, AssignmentsHubPage, LeaderboardPage } from './ModerationAndAssignments';
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
  const [regClass, setRegClass] = useState('9Б');
  const [regCustomClass, setRegCustomClass] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [teacherCode, setTeacherCode] = useState('');
  const [classesList, setClassesList] = useState(['5А', '5Б', '6А', '6Б', '7А', '7Б', '8А', '8Б', '9А', '9Б', '9В', '10А', '11А']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, banNotice, clearBanNotice } = store;

  useEffect(() => {
    fetch('/api/classes')
      .then(r => r.json())
      .then(d => {
        if (d.classes && d.classes.length > 0) {
          setClassesList(d.classes.map(c => c.name));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (clearBanNotice) clearBanNotice();
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

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (clearBanNotice) clearBanNotice();
    setLoading(true);
    sounds.click();
    try {
      const chosenClass = regClass === '__custom__' ? regCustomClass : regClass;
      await register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
        className: chosenClass,
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10 py-10">
      <Particles />

      {/* Brand Header */}
      <div className="text-center mb-6 max-w-xl">
        <div className="inline-block p-4 rounded-3xl mb-3 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))', border: '1px solid rgba(124,58,237,0.5)' }}>
          <span className="text-4xl sm:text-5xl">📚</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mb-2">
          <span className="gradient-text">РусЛёрн</span>
        </h1>
        <p className="text-gray-300 text-xs sm:text-sm">
          Официальная учебная платформа МАОУ СОШ № 40 · ОГЭ / ЕГЭ, классы и контроль честности
        </p>
      </div>

      {/* Уведомление о бане */}
      {banNotice && (
        <div className="w-full max-w-md mb-4 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-100 text-xs sm:text-sm space-y-1 shadow-xl">
          <div className="font-black text-rose-300 flex items-center gap-2">
            <span>🔨</span> АККАУНТ ЗАБЛОКИРОВАН УЧИТЕЛЕМ
          </div>
          <div>Причина: <strong>{banNotice}</strong></div>
          <div className="text-[11px] text-rose-200/80">Обратитесь к учителю для смены ника или разблокировки.</div>
        </div>
      )}

      <div className="card w-full max-w-md p-6 sm:p-8 space-y-5" style={{ background: 'rgba(22, 22, 42, 0.94)', borderColor: 'rgba(124,58,237,0.4)' }}>
        {/* Tabs: Login / Register */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => { sounds.click(); setTab('login'); setError(''); }}
            className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'login' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Войти в аккаунт
          </button>
          <button
            type="button"
            onClick={() => { sounds.click(); setTab('register'); setError(''); }}
            className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'register' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Регистрация ученика
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
                placeholder="Введите ваш логин..."
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
              className="btn-primary w-full py-3.5 text-sm font-bold text-center disabled:opacity-50"
            >
              {loading ? 'Проверка в базе...' : 'Войти в систему ➜'}
            </button>

            <p className="text-[11px] text-gray-400 text-center pt-2">
              Впервые на сайте? Нажмите вкладку <strong>«Регистрация ученика»</strong> сверху и выберите свой класс.
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Фамилия и Имя (настоящие!)</label>
              <input
                type="text"
                required
                className="input-field text-xs py-2.5"
                placeholder="Например: Петров Алексей"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
              <p className="text-[10px] text-amber-300/80 mt-1">
                ⚠️ За нецензурные или фейковые ники аккаунт блокируется учителем.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Логин (англ.)</label>
                <input
                  type="text"
                  required
                  className="input-field text-xs py-2"
                  placeholder="petrov_9b"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Пароль</label>
                <input
                  type="password"
                  required
                  className="input-field text-xs py-2"
                  placeholder="От 4 символов"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {regRole === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Твой класс</label>
                  <select
                    className="input-field text-xs py-2 bg-slate-900"
                    value={regClass}
                    onChange={e => setRegClass(e.target.value)}
                  >
                    {classesList.map(c => (
                      <option key={c} value={c}>{c} класс</option>
                    ))}
                    <option value="__custom__">Другой класс...</option>
                  </select>
                </div>
              )}

              <div className={regRole === 'teacher' ? 'col-span-2' : ''}>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email (необязат.)</label>
                <input
                  type="email"
                  className="input-field text-xs py-2"
                  placeholder="student@mail.ru"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            {regRole === 'student' && regClass === '__custom__' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Напишите класс (напр. 9Г)</label>
                <input
                  type="text"
                  required
                  className="input-field text-xs py-2"
                  placeholder="9Г"
                  value={regCustomClass}
                  onChange={e => setRegCustomClass(e.target.value)}
                />
              </div>
            )}

            {/* Role picker */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Кто вы?</label>
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

            {regRole === 'teacher' && (
              <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                  <span>🔒</span> Проверочный код школы (для учителей)
                </div>
                <input
                  type="password"
                  required
                  className="input-field text-xs py-2 border-pink-500/50"
                  placeholder="Введите секретный код учителя..."
                  value={teacherCode}
                  onChange={e => setTeacherCode(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs font-bold text-center mt-2 disabled:opacity-50"
            >
              {loading ? 'Создание профиля...' : 'Зарегистрироваться 🚀'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// NAVBAR: УДОБНОЕ ВЕРХНЕЕ МЕНЮ ДЛЯ ПК (БЕЗ ОБРЕЗАНИЯ) И ПОНЯТНЫЙ ИНТЕРФЕЙС ТЕЛЕФОНА
// =============================================================================
function Navbar({ page, setPage, store, onOpenSettings, pendingAssignmentsCount = 0 }) {
  const { state, logout, toggleSound } = store;
  const user = state.user;
  const lp = store.getLevelProgress();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreRef = useRef(null);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    const onDocClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Главные 6 вкладок на ПК — помещаются на любой экран БЕЗ горизонтальной прокрутки!
  const desktopPrimaryTabs = isTeacher ? [
    { id: 'home', label: 'Кабинет', icon: '👩‍🏫' },
    { id: 'reshu_oge', label: 'Решу ОГЭ', icon: '📘' },
    { id: 'students', label: 'Ученики', icon: '👥' },
    { id: 'assignments', label: 'Задания', icon: '📋' },
    { id: 'anticheat_monitor', label: 'Античит', icon: '🛡️' },
    { id: 'fipi_forms', label: 'Бланки А4', icon: '📄' },
  ] : [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'reshu_oge', label: 'Решу ОГЭ', icon: '📘' },
    { id: 'ege_exam', label: 'ЕГЭ 2026', icon: '🎯' },
    { id: 'assignments', label: 'Задания', icon: '📌', badge: pendingAssignmentsCount },
    { id: 'pvp_duel', label: 'Дуэли', icon: '⚔️' },
    { id: 'leaderboard', label: 'Рейтинг', icon: '🏆' },
  ];

  // Полный каталог разделов (для выпадающего меню «Ещё» на ПК и Drawer-меню на телефоне)
  const groupedSections = [
    {
      group: '📘 Экзамены и Контроль',
      items: [
        { id: 'reshu_oge', label: 'Решу ОГЭ (Задания 2–12)', icon: '📘' },
        { id: 'ege_exam', label: 'Полный вариант ЕГЭ (27)', icon: '🎯' },
        { id: 'assignments', label: isTeacher ? 'Задания классам и личные' : 'Задания от учителя', icon: '📌', badge: !isTeacher ? pendingAssignmentsCount : 0 },
        { id: 'exam_tasks', label: 'Контрольный тест (Античит)', icon: '🛡️' },
        { id: 'fipi_forms', label: 'Печать бланков ФИПИ А4', icon: '📄' },
      ]
    },
    {
      group: '⚡ Тренажёры и ИИ',
      items: [
        { id: 'ai_diagnostics', label: 'ИИ-Диагностика пробелов', icon: '🧠' },
        { id: 'formulas', label: 'Формулы без зубрёжки', icon: '⚡' },
        { id: 'blitz_sprint', label: 'Блиц-спринт (60 сек)', icon: '⏱️' },
        { id: 'orthoepy', label: 'Ударения ФИПИ', icon: '🎙️' },
        { id: 'paronyms', label: 'Словарь паронимов', icon: '🔤' },
        { id: 'dictation', label: 'Аудио-диктант', icon: '✍️' },
      ]
    },
    {
      group: '✍️ Сочинения, Рейтинг и Школа',
      items: [
        { id: 'voice_essay', label: 'Голосовое сочинение', icon: '🎤' },
        { id: 'pamyatki', label: 'База памяток (5–11 кл.)', icon: '📖' },
        { id: 'pvp_duel', label: 'PVP Дуэли 1 на 1', icon: '⚔️' },
        { id: 'leaderboard', label: 'Рейтинг класса и школы', icon: '🏆' },
        { id: 'achievements', label: 'Мои награды и трофеи', icon: '🎖️' },
        { id: 'site_map', label: 'Схема движения по сайту', icon: '🗺️' },
      ]
    },
    ...(isTeacher ? [{
      group: '👩‍🏫 Инструменты учителя',
      items: [
        { id: 'students', label: 'Ученики, классы, баны', icon: '👥' },
        { id: 'anticheat_monitor', label: 'Античит-монитор SQLite', icon: '🚨' },
        { id: 'generator', label: 'Генератор 2 вариантов А4', icon: '🎲' },
        { id: 'essay_checker', label: 'Чекер сочинений К1–К12', icon: '📑' },
      ]
    }] : [])
  ];

  // 4 понятные кнопки в нижней панели телефона (+ 5-я «Меню»)
  const mobilePrimaryTabs = isTeacher ? [
    { id: 'home', label: 'Кабинет', icon: '👩‍🏫' },
    { id: 'students', label: 'Ученики', icon: '👥' },
    { id: 'assignments', label: 'Задания', icon: '📋' },
    { id: 'anticheat_monitor', label: 'Античит', icon: '🛡️' },
  ] : [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'reshu_oge', label: 'Решу ОГЭ', icon: '📘' },
    { id: 'assignments', label: 'Задания', icon: '📌', badge: pendingAssignmentsCount },
    { id: 'leaderboard', label: 'Рейтинг', icon: '🏆' },
  ];

  const handleNavClick = (tabId) => {
    sounds.click();
    setPage(tabId);
    setDrawerOpen(false);
    setMoreMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-3 sm:px-5 flex items-center justify-between gap-2 safe-top"
        style={{
          background: 'rgba(15, 15, 26, 0.96)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
        }}>
        {/* Logo & Class Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              Р
            </div>
            <div>
              <div className="text-base font-black tracking-tight gradient-text whitespace-nowrap">РусЛёрн</div>
              <div className="text-[10px] text-gray-400 -mt-1 hidden 2xl:block whitespace-nowrap">ОГЭ / ЕГЭ · СОШ №40</div>
            </div>
          </button>

          <div
            className="px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
            style={{
              background: isTeacher ? 'rgba(236,72,153,0.18)' : 'rgba(59,130,246,0.18)',
              border: `1px solid ${isTeacher ? 'rgba(236,72,153,0.4)' : 'rgba(59,130,246,0.4)'}`,
              color: isTeacher ? '#f472b6' : '#93c5fd'
            }}
          >
            <span>{isTeacher ? '👩‍🏫 Учитель' : `🧑‍🎓 ${user?.class_name || 'Ученик'}`}</span>
          </div>
        </div>

        {/* Desktop Center Navigation: 6 главных кнопок + Мега-меню «Все разделы ▾» (в одну строку без обрезания!) */}
        <div className="hidden lg:flex items-center gap-1">
          {desktopPrimaryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all relative whitespace-nowrap shrink-0 ${
                page === tab.id
                  ? 'text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              style={page === tab.id ? {
                background: 'linear-gradient(135deg, rgba(124,58,237,0.45), rgba(236,72,153,0.3))',
                border: '1px solid rgba(124,58,237,0.6)',
              } : {}}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}

          {/* Выпадающее меню ВСЕ РАЗДЕЛЫ на ПК */}
          <div className="relative shrink-0" ref={moreRef}>
            <button
              onClick={() => { sounds.click(); setMoreMenuOpen(o => !o); }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
                moreMenuOpen
                  ? 'bg-purple-600 text-white border-purple-400'
                  : 'bg-white/5 text-purple-200 border-white/15 hover:bg-white/10'
              }`}
            >
              <span>📂 Все разделы</span>
              <span className="text-[10px]">{moreMenuOpen ? '▲' : '▼'}</span>
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-2 w-[620px] max-w-[90vw] p-5 rounded-2xl bg-[#131324] border border-purple-500/40 shadow-2xl grid grid-cols-2 gap-4 z-50 animate-fadeIn">
                {groupedSections.map(sec => (
                  <div key={sec.group} className="space-y-1.5">
                    <div className="text-[11px] font-black text-purple-300 uppercase tracking-wider px-2 pb-1 border-b border-white/10">
                      {sec.group}
                    </div>
                    {sec.items.map(it => (
                      <button
                        key={it.id}
                        onClick={() => handleNavClick(it.id)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                          page === it.id ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{it.icon}</span>
                          <span className="truncate">{it.label}</span>
                        </span>
                        {it.badge > 0 && (
                          <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black">{it.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {!isTeacher && user && (
            <button
              onClick={() => handleNavClick('achievements')}
              className="hidden xl:flex flex-col items-end hover:opacity-80"
              title="Перейти к наградам"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-purple-300">Ур. {user.level || 1}</span>
                <span className="text-gray-400">{user.xp || 0} XP</span>
              </div>
              <div className="w-20 h-1.5 rounded-full mt-0.5 overflow-hidden bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${lp.percent}%`, background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }} />
              </div>
            </button>
          )}

          <button
            onClick={() => { const en = toggleSound(); if (en) sounds.click(); }}
            className="p-2 rounded-xl text-gray-300 hover:text-white bg-white/5"
            title={state.sound ? 'Звук включен' : 'Звук выключен'}
          >
            {state.sound !== false ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => { sounds.click(); if (onOpenSettings) onOpenSettings(); }}
            className="p-2 rounded-xl text-gray-300 hover:text-white bg-white/5"
            title="Настройки темы, озвучки и пароля"
          >
            ⚙️
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span>{user?.avatar || '👤'}</span>
            <span className="font-semibold text-gray-100 hidden sm:inline max-w-[130px] truncate">{user?.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-rose-400 p-1"
              title="Выйти из аккаунта"
            >
              🚪
            </button>
          </div>
        </div>
      </nav>

      {/* Понятная мобильная нижняя панель */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around px-1 border-t border-purple-500/30 safe-bottom"
        style={{ background: 'rgba(13, 13, 24, 0.98)', backdropFilter: 'blur(20px)' }}>
        {mobilePrimaryTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleNavClick(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-bold transition-transform active:scale-90 ${
              page === tab.id && !drawerOpen ? 'text-purple-400' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
            <span className="truncate max-w-[70px]">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute top-1.5 right-3 px-1.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => { sounds.click(); setDrawerOpen(!drawerOpen); }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-bold transition-transform active:scale-90 ${
            drawerOpen ? 'text-pink-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none mb-0.5">{drawerOpen ? '✕' : '☰'}</span>
          <span>{drawerOpen ? 'Закрыть' : 'Меню'}</span>
        </button>
      </div>

      {/* Понятное выдвижное меню на телефоне (по категориям) */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-h-[86vh] overflow-y-auto bg-[#131324] border-t border-purple-500/40 rounded-t-3xl p-5 space-y-5 shadow-2xl animate-slideUp safe-bottom">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{user?.avatar || '🧑‍🎓'}</span>
                <div>
                  <div className="font-bold text-white text-sm">{user?.name}</div>
                  <div className="text-xs text-purple-300">
                    {isTeacher ? 'Учитель' : `${user?.class_name || 'Ученик'} • Ур. ${user?.level || 1} (${user?.xp || 0} XP)`}
                  </div>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-300 font-bold">✕</button>
            </div>

            {groupedSections.map(sec => (
              <div key={sec.group} className="space-y-2">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider">{sec.group}</div>
                <div className="grid grid-cols-2 gap-2">
                  {sec.items.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleNavClick(tab.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all active:scale-95 ${
                        page === tab.id ? 'bg-purple-900/50 border-purple-400 text-white font-bold' : 'bg-white/5 border-white/10 text-gray-200'
                      }`}
                    >
                      <span className="text-lg shrink-0">{tab.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={() => { if (onOpenSettings) onOpenSettings(); setDrawerOpen(false); }}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-purple-200"
              >
                ⚙️ Тема, голос и пароль
              </button>
              <button
                onClick={logout}
                className="py-3 px-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs font-bold text-rose-200"
              >
                🚪 Выйти
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
function ExamTasksPage({ store, activeTopic, initialAssignment = null, onClearAssignment }) {
  const [selectedTopic, setSelectedTopic] = useState(
    initialAssignment?.taskConfig?.topicId || activeTopic || 'chered'
  );
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState('start'); // 'start' | 'exam' | 'result'
  const [timer, setTimer] = useState(30);

  const acMetricsRef = useRef({ tabSwitches: 0, copyAttempts: 0, hadBrowserExit: false });
  const [suspiciousSpeedCount, setSuspiciousSpeedCount] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [examStartTime, setExamStartTime] = useState(null);

  const { reportAntiCheat, submitTest } = store;

  useEffect(() => {
    if (initialAssignment?.taskConfig?.topicId) {
      startExam(initialAssignment.taskConfig.topicId);
    }
  }, [initialAssignment]);

  useEffect(() => {
    if (mode !== 'exam') return;
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
    handleAnswer(null);
  }, [mode, timer]);

  const startExam = (topicOverride) => {
    sounds.click();
    const targetTopic = topicOverride || selectedTopic;
    const qs = generateQuestions(targetTopic, 'all', initialAssignment?.question_count || 6);
    const randomized = qs.map(q => {
      if (!q.options) return q;
      const opts = [...q.options].sort(() => Math.random() - 0.5);
      return { ...q, options: opts };
    });

    acMetricsRef.current = { tabSwitches: 0, copyAttempts: 0, hadBrowserExit: false };
    setQuestions(randomized);
    setCurrentIdx(0);
    setScore(0);
    setSuspiciousSpeedCount(0);
    setTimer(30);
    setQuestionStartTime(Date.now());
    setExamStartTime(Date.now());
    setMode('exam');
  };

  const handleAnswer = (ans) => {
    const elapsedSec = (Date.now() - questionStartTime) / 1000;
    let fastCount = suspiciousSpeedCount;

    if (elapsedSec < 1.0 && ans !== null) {
      fastCount += 1;
      setSuspiciousSpeedCount(fastCount);
      reportAntiCheat('FAST_ANSWER', `Подозрительно быстрый ответ (${elapsedSec.toFixed(1)} сек) на вопросе #${currentIdx + 1}`);
    }

    const currentQ = questions[currentIdx];
    const isCorrect = ans === currentQ?.answer;
    const nextScore = isCorrect ? score + 1 : score;
    setScore(nextScore);

    if (isCorrect) sounds.correct();
    else sounds.wrong();

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setTimer(30);
      setQuestionStartTime(Date.now());
    } else {
      finishExam(nextScore, questions.length, fastCount);
    }
  };

  const finishExam = async (finalScore, totalQ, fast) => {
    const duration = Math.max(1, Math.round((Date.now() - (examStartTime || Date.now())) / 1000));
    const acc = Math.round((finalScore / Math.max(1, totalQ)) * 100);
    const { tabSwitches, copyAttempts, hadBrowserExit } = acMetricsRef.current;

    await submitTest({
      testTitle: initialAssignment?.title || `Тест: ${PAMYATKI.find(p => p.id === selectedTopic)?.title || selectedTopic}`,
      topicId: selectedTopic,
      assignmentId: initialAssignment?.id || null,
      score: finalScore,
      total: totalQ,
      accuracy: acc,
      tabSwitches,
      copyAttempts,
      hadBrowserExit,
      suspiciousSpeedCount: fast,
      durationSeconds: duration,
    });

    if (onClearAssignment) onClearAssignment();
    setMode('result');
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative animate-fadeIn pb-20">
      {mode === 'start' ? (
        <div className="card p-6 sm:p-8 text-center space-y-6">
          <div className="inline-block p-4 rounded-3xl bg-purple-500/20 text-4xl mb-1">🛡️</div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Защищённое тестирование по темам</h1>
          <p className="text-gray-300 text-xs sm:text-sm max-w-lg mx-auto">
            Включена жёсткая защита: полный экран, запрет копирования и моментальный детект попытки закрыть или свернуть браузер.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">🔒 Контроль выхода</div>
              <div className="text-gray-400">Закрытие браузера и смена вкладки фиксируются сразу</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">🚫 Блок буфера</div>
              <div className="text-gray-400">Копирование и скриншот PrintScreen отключены</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-purple-300 mb-1">🥪 Пауза 10 мин</div>
              <div className="text-gray-400">Официальный перерыв по кнопке без штрафа</div>
            </div>
          </div>

          <div className="max-w-xs mx-auto space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase">Выберите тему теста:</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="input-field py-2.5 text-sm bg-slate-900"
            >
              {PAMYATKI.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
              ))}
            </select>

            <button
              onClick={() => startExam()}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-xl"
            >
              Начать тест под защитой 🛡️
            </button>
          </div>
        </div>
      ) : mode === 'exam' && currentQ ? (
        <AntiCheatShield
          store={store}
          activityName={`Тест: ${selectedTopic}`}
          isFinished={false}
          strictFullscreen={true}
          onMetricsChange={(m) => { acMetricsRef.current = m; }}
          onFlagged={() => finishExam(score, questions.length, suspiciousSpeedCount)}
        >
          <div className="card p-5 sm:p-6 space-y-5 relative">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-400">Вопрос {currentIdx + 1} из {questions.length}</span>
              <span className={timer <= 6 ? 'text-rose-400 font-mono animate-pulse text-sm' : 'text-purple-300 font-mono text-sm'}>
                ⏱️ {timer}с
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQ.q}
              </h2>
            </div>

            {currentQ.options && (
              <div className="grid sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    className="p-4 rounded-xl text-left border border-white/10 bg-white/5 hover:bg-purple-900/30 hover:border-purple-500/50 text-sm font-medium text-gray-200 transition-all flex items-center gap-3"
                  >
                    <span className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </AntiCheatShield>
      ) : mode === 'result' ? (
        <div className="card p-8 text-center space-y-6 animate-fadeIn">
          <div className="text-6xl mb-2">
            {acMetricsRef.current.tabSwitches === 0 && !acMetricsRef.current.hadBrowserExit ? '🏆' : '⚠️'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Тест сдан и записан в базу данных!</h2>
            <p className="text-gray-400 text-xs mt-1">Результат отправлен учителю</p>
          </div>

          <div className="text-5xl font-black gradient-text">
            {score} / {questions.length}
          </div>

          <div className="p-4 rounded-2xl max-w-md mx-auto space-y-2 border text-xs"
            style={{
              background: acMetricsRef.current.tabSwitches === 0 && !acMetricsRef.current.hadBrowserExit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              borderColor: acMetricsRef.current.tabSwitches === 0 && !acMetricsRef.current.hadBrowserExit ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
            }}>
            <div className="font-bold text-sm">
              {acMetricsRef.current.tabSwitches === 0 && !acMetricsRef.current.hadBrowserExit
                ? '🟢 Пройдено честно'
                : '🔴 Зафиксирован уход / выход из браузера'}
            </div>
            <div className="text-gray-300">
              Выходов/переключений: <strong>{acMetricsRef.current.tabSwitches}</strong> · Копирований: <strong>{acMetricsRef.current.copyAttempts}</strong>
            </div>
          </div>

          <button onClick={() => setMode('start')} className="btn-primary py-2.5 px-6 text-xs font-bold">
            Пройти другой тест ➜
          </button>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// АНТИЧИТ МОНИТОР ДЛЯ УЧИТЕЛЯ (С ФИЛЬТРОМ ПО КЛАССАМ И ДЕТЕКТОМ ВЫХОДА)
// =============================================================================
function TeacherAntiCheatMonitor() {
  const [submissions, setSubmissions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('all');

  const fetchData = async () => {
    try {
      const q = classFilter !== 'all' ? `?className=${encodeURIComponent(classFilter)}` : '';
      const [r1, r2, r3] = await Promise.all([
        fetch(`/api/teacher/submissions${q}`),
        fetch(`/api/teacher/anticheat-logs${q}`),
        fetch('/api/classes'),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      if (d1.submissions) setSubmissions(d1.submissions);
      if (d2.logs) setLogs(d2.logs);
      if (d3.classes) setClasses(d3.classes);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [classFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">🛡️ Монитор античита</h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Детектор выхода из браузера, переключения вкладок, копирования и фуллскрина (SQLite)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="input-field py-2 text-xs bg-slate-900"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            <option value="all">Все классы</option>
            {classes.map(c => <option key={c.name} value={c.name}>{c.name} класс</option>)}
          </select>
          <button onClick={fetchData} className="btn-secondary text-xs py-2 px-4 shrink-0">
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Сданные работы */}
      <div className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white">📋 Сданные работы ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <div className="text-xs text-gray-400 p-4 text-center">Сданных работ пока нет.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-bold">
                  <th className="pb-3 pr-3">Ученик</th>
                  <th className="pb-3 pr-3">Класс</th>
                  <th className="pb-3 pr-3">Работа</th>
                  <th className="pb-3 pr-3">Балл</th>
                  <th className="pb-3 pr-3">Выходов</th>
                  <th className="pb-3 pr-3">Статус</th>
                  <th className="pb-3">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map((sub, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-3 pr-3 font-bold text-white">{sub.student_name}</td>
                    <td className="py-3 pr-3 text-blue-300 font-bold">{sub.class_name || '—'}</td>
                    <td className="py-3 pr-3 text-gray-300 max-w-[200px] truncate">{sub.test_title}</td>
                    <td className="py-3 pr-3 font-bold text-purple-300">{sub.score}/{sub.total} ({sub.accuracy}%)</td>
                    <td className="py-3 pr-3">
                      <span className={sub.tab_switches > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                        {sub.tab_switches}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {sub.cheat_status === 'CLEAN' ? (
                        <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-500/40">🟢 Честно</span>
                      ) : sub.cheat_status === 'SUSPICIOUS' ? (
                        <span className="badge bg-amber-950 text-amber-300 border border-amber-500/40">🟡 Подозрение</span>
                      ) : (
                        <span className="badge bg-rose-950 text-rose-300 border border-rose-500/50">🔴 Списывание</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400 text-[10px]">
                      {new Date(sub.submitted_at).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Лента инцидентов */}
      <div className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-white">🚨 Лента инцидентов (включая выход из браузера)</h2>
        {logs.length === 0 ? (
          <div className="text-xs text-gray-400 p-4 text-center">Нарушений не зафиксировано.</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {logs.map((lg, i) => {
              const isCritical = ['BROWSER_EXIT', 'BROWSER_RELOAD_ESCAPE', 'FULLSCREEN_EXIT', 'USER_BANNED'].includes(lg.event_type);
              return (
                <div key={i} className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  isCritical ? 'bg-rose-950/35 border-rose-500/40' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="space-y-0.5">
                    <div className="font-bold text-rose-300 flex flex-wrap items-center gap-2">
                      <span>{isCritical ? '🚨' : '⚠️'}</span>
                      <span>{lg.user_name}</span>
                      {lg.class_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-200">{lg.class_name}</span>}
                      <span className="badge text-[10px] bg-black/50 text-gray-200">{lg.event_type}</span>
                    </div>
                    <div className="text-gray-300 text-[11px]">{lg.details}</div>
                  </div>
                  <div className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(lg.timestamp).toLocaleTimeString('ru-RU')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STUDENT HOME DASHBOARD (ПОНЯТНЫЙ НА ТЕЛЕФОНЕ И ПК)
// =============================================================================
function StudentHome({ store, setPage, pendingAssignments = [], onLaunchAssignment }) {
  const { state } = store;
  const user = state.user;
  const lp = store.getLevelProgress();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-20">
      {/* Срочный блок: Задания от учителя */}
      {pendingAssignments.length > 0 && (
        <div className="card p-5 border-2 border-amber-500/60 bg-amber-950/25 space-y-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-black text-amber-300 text-sm sm:text-base">
              <span>📌</span> Тебе назначены задания от учителя ({pendingAssignments.length})
            </div>
            <button onClick={() => setPage('assignments')} className="text-xs font-bold text-amber-200 underline">
              Все задания ➜
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {pendingAssignments.slice(0, 2).map(a => (
              <div key={a.id} className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs sm:text-sm truncate">{a.title}</div>
                  <div className="text-[11px] text-gray-300">
                    {a.target_type === 'student' ? '👤 Личное задание' : `🏫 Для ${a.target_class}`}
                    {a.due_date ? ` · ${a.due_date}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => onLaunchAssignment(a)}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shrink-0"
                >
                  Решить ➜
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(59,130,246,0.22))',
          border: '1px solid rgba(124,58,237,0.4)',
        }}>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{user?.avatar || '🧑‍🎓'}</span>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-500/25 border border-blue-400/40 text-blue-200 text-xs font-bold mb-1">
                {user?.class_name ? `${user.class_name} класс` : 'Ученик'}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Привет, {user?.name}!
              </h1>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-black/35 border border-white/10 max-w-md">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-purple-300">Уровень {user?.level || 1}</span>
              <span className="text-gray-200">{lp.current} / {lp.needed} XP до ур. {(user?.level || 1) + 1}</span>
            </div>
            <div className="progress-bar h-2.5">
              <div className="progress-fill" style={{ width: `${lp.percent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2 главных режима (Решу ОГЭ + Полный ЕГЭ) */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => { sounds.click(); setPage('reshu_oge'); }}
          className="card p-6 text-left relative overflow-hidden group hover:scale-[1.01] transition-all border-blue-500/50"
          style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.35), rgba(15, 15, 26, 0.95))' }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl">📘</span>
            <span className="badge bg-blue-500/25 text-blue-200 border border-blue-400/40 text-xs font-bold">
              Как на Решу ОГЭ!
            </span>
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors">
            Решу ОГЭ РусЛёрн (9 класс)
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
            Конструктор заданий №2–12, номера вариантов (#2026), подробные разборы ФИПИ и перевод баллов в оценку «2–5».
          </p>
          <div className="mt-4 text-xs font-bold text-blue-300">Открыть каталог заданий ➜</div>
        </button>

        <button
          onClick={() => { sounds.click(); setPage('ege_exam'); }}
          className="card p-6 text-left relative overflow-hidden group hover:scale-[1.01] transition-all border-purple-500/50"
          style={{ background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(15, 15, 26, 0.95))' }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl">🎯</span>
            <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
              27 заданий ЕГЭ
            </span>
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
            Симулятор ЕГЭ 2026/2027
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
            Полный вариант с официальным таймером, защитой AntiCheatShield, шкалой 100 баллов и проверкой сочинения.
          </p>
          <div className="mt-4 text-xs font-bold text-purple-300">Начать вариант ЕГЭ ➜</div>
        </button>
      </div>

      {/* Понятная сетка тренажёров */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> Полезные тренажёры и игры
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { title: 'Мои задания', desc: 'Домашки и контрольные от учителя', icon: '📌', page: 'assignments', grad: 'from-amber-500 to-orange-600' },
            { title: 'Рейтинг класса', desc: 'Кто на 1 месте без списаний', icon: '🏆', page: 'leaderboard', grad: 'from-yellow-500 to-amber-600' },
            { title: 'PVP Дуэли 1v1', desc: 'Сражение по PIN-коду с другом', icon: '⚔️', page: 'pvp_duel', grad: 'from-purple-600 to-rose-600' },
            { title: 'ИИ-Диагностика', desc: 'Твои слабые темы и разбор', icon: '🧠', page: 'ai_diagnostics', grad: 'from-indigo-600 to-purple-800' },
            { title: 'Формулы правил', desc: 'Понятные схемы без зубрёжки', icon: '⚡', page: 'formulas', grad: 'from-pink-600 to-rose-700' },
            { title: 'Ударения ФИПИ', desc: 'Озвучка слов для №4 ЕГЭ', icon: '🎙️', page: 'orthoepy', grad: 'from-blue-600 to-indigo-700' },
            { title: 'Паронимы', desc: 'Пары слов для №5 ЕГЭ', icon: '🔤', page: 'paronyms', grad: 'from-teal-600 to-emerald-700' },
            { title: 'Голос. сочинение', desc: 'Надиктуй сочинение по 7 абзацам', icon: '🎤', page: 'voice_essay', grad: 'from-rose-600 to-pink-700' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => { sounds.click(); setPage(item.page); }}
              className="card p-4 text-left group relative overflow-hidden transition-all hover:scale-[1.02]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.grad} opacity-15 group-hover:opacity-25 transition-opacity`} />
              <div className="relative z-10">
                <div className="text-2xl sm:text-3xl mb-1.5">{item.icon}</div>
                <div className="font-bold text-white text-sm">{item.title}</div>
                <div className="text-xs text-gray-300 mt-1 line-clamp-2">{item.desc}</div>
              </div>
            </button>
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
  const user = store.state.user;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-20">
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(124,58,237,0.25))',
          border: '1px solid rgba(236,72,153,0.4)',
        }}>
        <div className="relative z-10">
          <span className="badge bg-pink-500/20 text-pink-200 text-xs mb-2">Кабинет руководителя</span>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            {user?.name} {user?.avatar || '👩‍🏫'}
          </h1>
          <p className="text-gray-200 text-xs sm:text-sm mt-1">
            Управление классами, модерация никнеймов, предупреждения, выдача вариантов ОГЭ/ЕГЭ и монитор честности SQLite.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Ученики, классы и баны', desc: 'Сортировка по классам, предупреждения, бан за никнеймы, чистка базы и личные задания', icon: '👥', page: 'students' },
          { title: 'Задания для классов и личные', desc: 'Выдача контрольных вариантов ОГЭ конкретному ученику или всему классу + проверка сдачи', icon: '📋', page: 'assignments' },
          { title: 'Конструктор «Решу ОГЭ»', desc: 'Собирайте тесты по заданиям №2–12 или по номеру варианта и отправляйте в класс в 1 клик', icon: '📘', page: 'reshu_oge' },
          { title: 'Античит-монитор SQLite', desc: 'Лента всех выходов из браузера, переключений вкладок и статусов честности работ', icon: '🛡️', page: 'anticheat_monitor' },
          { title: 'Генератор 2 вариантов А4', desc: 'Печатные Вариант 1 + Вариант 2 с ответами для уроков', icon: '🎲', page: 'generator' },
          { title: 'Бланки ФИПИ А4 / PDF', desc: 'Аутентичные бланки ответов №1 и №2 с QR-кодами', icon: '📄', page: 'fipi_forms' },
          { title: 'Чекер сочинений ЕГЭ', desc: 'Проверка по критериям ФИПИ К1–К12 и расчёт баллов', icon: '📑', page: 'essay_checker' },
          { title: 'Тренажёр ЕГЭ 2026', desc: 'Полный экзаменационный вариант (27 заданий)', icon: '🎯', page: 'ege_exam' },
          { title: 'Рейтинг учеников школы', desc: 'Просмотр лидеров по классам и баллам', icon: '🏆', page: 'leaderboard' },
        ].map((tool, idx) => (
          <button
            key={idx}
            onClick={() => { sounds.click(); setPage(tool.page); }}
            className="card p-5 text-left hover:border-pink-500/50 hover:scale-[1.01] transition-all"
          >
            <div className="text-3xl mb-2">{tool.icon}</div>
            <h3 className="font-bold text-base text-white">{tool.title}</h3>
            <p className="text-xs text-gray-300 mt-1">{tool.desc}</p>
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
// ROOT APP COMPONENT (С ПРОВЕРКОЙ БАНОВ, ПРЕДУПРЕЖДЕНИЙ И НАЗНАЧЕННЫХ ЗАДАНИЙ)
// =============================================================================
export default function App() {
  const store = useStore();
  const { state, ackWarning } = store;
  const [page, setPage] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);

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

  // Загружаем невыполненные задания для ученика
  const refreshAssignments = () => {
    if (!state.user || state.user.role !== 'student') {
      setPendingAssignments([]);
      return;
    }
    fetch(`/api/student/${state.user.id}/assignments`)
      .then(r => r.json())
      .then(d => {
        if (d.assignments) {
          setPendingAssignments(d.assignments.filter(a => !a.completion));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshAssignments();
  }, [state.user?.id, page]);

  if (!state.user) {
    return <AuthView store={store} />;
  }

  const isTeacher = state.user.role === 'teacher';
  const activeWarning = (state.user.warnings || [])[0] || null;

  const handleLaunchAssignment = (assignment) => {
    sounds.click();
    setActiveAssignment(assignment);
    if (assignment.mode === 'topic') {
      setPage('exam_tasks');
    } else {
      setPage('reshu_oge');
    }
  };

  const renderContent = () => {
    if (isTeacher) {
      switch (page) {
        case 'home':
          return <TeacherCabinet store={store} setPage={setPage} />;
        case 'reshu_oge':
          return <ReshuOgePage store={store} setPage={setPage} />;
        case 'assignments':
          return <AssignmentsHubPage store={store} onLaunchAssignment={handleLaunchAssignment} />;
        case 'students':
          return <StudentsManagementPage store={store} onAssigned={refreshAssignments} />;
        case 'leaderboard':
          return <LeaderboardPage store={store} />;
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
        case 'pamyatki':
          return <PamyatkiPage setPage={setPage} />;
        default:
          return <TeacherCabinet store={store} setPage={setPage} />;
      }
    }

    // РОЛЬ: УЧЕНИК
    switch (page) {
      case 'home':
        return (
          <StudentHome
            store={store}
            setPage={setPage}
            pendingAssignments={pendingAssignments}
            onLaunchAssignment={handleLaunchAssignment}
          />
        );
      case 'reshu_oge':
        return (
          <ReshuOgePage
            store={store}
            setPage={setPage}
            initialAssignment={activeAssignment?.mode !== 'topic' ? activeAssignment : null}
            onClearAssignment={() => { setActiveAssignment(null); refreshAssignments(); }}
          />
        );
      case 'assignments':
        return <AssignmentsHubPage store={store} onLaunchAssignment={handleLaunchAssignment} />;
      case 'leaderboard':
        return <LeaderboardPage store={store} />;
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
        return (
          <ExamTasksPage
            store={store}
            activeTopic="chered"
            initialAssignment={activeAssignment?.mode === 'topic' ? activeAssignment : null}
            onClearAssignment={() => { setActiveAssignment(null); refreshAssignments(); }}
          />
        );
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
        return (
          <StudentHome
            store={store}
            setPage={setPage}
            pendingAssignments={pendingAssignments}
            onLaunchAssignment={handleLaunchAssignment}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ background: 'var(--color-bg)' }}>
      <Particles />
      <Navbar
        page={page}
        setPage={setPage}
        store={store}
        pendingAssignmentsCount={pendingAssignments.length}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Модальное предупреждение от учителя */}
      {activeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="card max-w-md w-full p-6 text-center space-y-4 border-2 border-amber-500 bg-[#1a1306] shadow-2xl">
            <div className="text-5xl animate-bounce">⚠️</div>
            <h3 className="text-xl font-black text-amber-300">ПРЕДУПРЕЖДЕНИЕ ОТ УЧИТЕЛЯ</h3>
            <p className="text-sm text-white leading-relaxed font-semibold">
              {activeWarning.reason}
            </p>
            <div className="text-xs text-gray-400">
              Выдал: {activeWarning.teacher_name}
            </div>
            <button
              onClick={() => { sounds.click(); ackWarning(activeWarning.id); }}
              className="btn-primary w-full py-3 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600"
            >
              Я понял(а), ознакомлен(а) ✓
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-28 w-full flex-1">
        {renderContent()}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        store={store}
      />

      <footer className="relative z-10 py-6 text-center text-xs text-gray-500 border-t border-white/5 no-print mb-16 lg:mb-0">
        РусЛёрн · МАОУ СОШ № 40 · База данных SQLite, Решу ОГЭ/ЕГЭ и AntiCheat 2.0 · 2026/2027
      </footer>
    </div>
  );
}
