import React, { useState } from 'react';
import { sounds } from './sounds';

export function SiteMapPage({ store, setPage }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'student' | 'teacher'
  const user = store?.state?.user;

  const playClick = () => {
    try {
      sounds.click();
    } catch (e) {}
  };

  const steps = [
    {
      step: '01',
      id: 'onboarding',
      role: 'all',
      title: 'Вход и ролевая дифференциация',
      subtitle: 'Аутентификация в SQLite 3',
      desc: 'Выбор роли (Ученик / Учитель). Загрузка персонального профиля, уровня XP, серии занятий и привязка к классу (9 «Б»).',
      tech: ['React SPA', 'SQLite 3 Auth', 'Role Guard'],
      targetPage: 'home',
      btnText: 'В личный кабинет',
      icon: '🔐',
      color: 'from-blue-600 to-cyan-500',
    },
    {
      step: '02',
      id: 'diagnostics',
      role: 'student',
      title: 'Диагностика знаний и выявление дефицитов',
      subtitle: 'ИИ-анализ успеваемости',
      desc: 'Входной срез по темам ОГЭ/ЕГЭ. Автоматическое построение тепловой карты пробелов (зоны < 70%). Формирование персонализированной работы над ошибками в 1 клик.',
      tech: ['AI Gap Diagnostics', 'Heatmap Matrix', 'Error-Targeting'],
      targetPage: 'ai_diagnostics',
      btnText: 'Открыть ИИ-диагностику',
      icon: '🧠',
      color: 'from-purple-600 to-pink-500',
    },
    {
      step: '03',
      id: 'practice',
      role: 'student',
      title: 'Интерактивный дидактический блок',
      subtitle: 'Теория и тренажёры',
      desc: 'Отработка проблемных тем: тренажёр орфоэпии, паронимы с рандомизацией позиций (защита от заучивания), авторские формулы правил (ИНФОГРАФИКА) и блиц-спринты на 60 сек.',
      tech: ['Sound FX', 'Randomizer Engine', 'Cheat-Proof Choice'],
      targetPage: 'formulas',
      btnText: 'Перейти к формулам',
      icon: '⚡',
      color: 'from-amber-500 to-orange-500',
    },
    {
      step: '04',
      id: 'control',
      role: 'all',
      title: 'Контрольный контур AntiCheatShield',
      subtitle: 'Академическая честность 2.0',
      desc: 'Сдача тренировочных вариантов ЕГЭ/ОГЭ (27 заданий). Запуск диагонального водяного знака деанонимизации, блокировка буфера (Ctrl+C/V), фиксация ухода с вкладки в SQLite и регламентированные паузы (10 мин).',
      tech: ['AntiCheat 2.0', 'Watermark Matrix', 'Pause Timer (10m)'],
      targetPage: 'ege_exam',
      btnText: 'Запустить экзамен с защитой',
      icon: '🛡️',
      color: 'from-rose-600 to-red-500',
    },
    {
      step: '05',
      id: 'competition',
      role: 'student',
      title: 'Соревновательный и творческий блок',
      subtitle: 'Дуэли, Сочинения и Бланки А4',
      desc: 'Онлайн PVP-дуэли 1 на 1 по 4-значному PIN-коду или с ИИ-ботом «Ломоносов». Голосовая диктовка сочинений Web Speech API со структурированием по 7 абзацам ФИПИ и генератор официальных бланков А4 с QR.',
      tech: ['Web Speech API', 'PVP PIN-Room', 'FIPI A4 Generator'],
      targetPage: 'pvp_duel',
      btnText: 'Перейти к дуэлям',
      icon: '⚔️',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      step: '06',
      id: 'analytics',
      role: 'teacher',
      title: 'Учительский мониторинг и аналитика',
      subtitle: 'Кабинет Ольги Вячеславовны',
      desc: 'Сводная ведомость 9 «Б» класса, журнал академической честности со статусами (CLEAN, SUSPICIOUS, FLAGGED), детальные логи нарушений и выгрузка отчётов для педсовета.',
      tech: ['Teacher Dashboard', 'SQLite Logs', 'Class Analytics'],
      targetPage: 'students',
      btnText: 'Журнал класса 9 «Б»',
      icon: '👩‍🏫',
      color: 'from-indigo-600 to-purple-600',
    },
  ];

  const filteredSteps = steps.filter((s) => {
    if (filter === 'student') return s.role === 'student' || s.role === 'all';
    if (filter === 'teacher') return s.role === 'teacher' || s.role === 'all';
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="card-glass p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <span>🗺️ Навигационная архитектура</span>
            <span>•</span>
            <span>User Flow v2.0</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Схема движения по платформе <span className="text-gradient">«РусЛёрн»</span>
          </h1>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Наглядная траектория движения пользователя: от ролевой авторизации и автоматической
            ИИ-диагностики пробелов до защищённого контроля академической честности и аналитики для учителя.
          </p>

          {/* НАУЧНЫЙ РУКОВОДИТЕЛЬ И АВТОР */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <span className="text-base">👩‍🏫</span>
              <div className="text-left">
                <div className="text-gray-400 font-medium">Научный руководитель:</div>
                <div className="text-white font-bold">Лебедева Ольга Вячеславовна</div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <span className="text-base">👨‍🎓</span>
              <div className="text-left">
                <div className="text-gray-400 font-medium">Автор проекта:</div>
                <div className="text-white font-bold">Скородумов Сергей Михайлович (9 «Б» класс)</div>
              </div>
            </div>
          </div>

          {/* ФИЛЬТРЫ ТРАЕКТОРИЙ */}
          <div className="pt-4 flex justify-center gap-2">
            <button
              onClick={() => { playClick(); setFilter('all'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              🌐 Полная архитектура
            </button>
            <button
              onClick={() => { playClick(); setFilter('student'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'student'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              🎒 Маршрут ученика
            </button>
            <button
              onClick={() => { playClick(); setFilter('teacher'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              👩‍🏫 Маршрут учителя
            </button>
          </div>
        </div>
      </div>

      {/* STEP-BY-STEP USER FLOW */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📍 Пошаговый маршрут движения</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300">
              {filteredSteps.length} этапов
            </span>
          </h2>
          <span className="text-xs text-gray-400 hidden sm:inline">
            Кликните на кнопку этапа для мгновенного перехода в раздел
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSteps.map((step, idx) => (
            <div
              key={step.id}
              className="card-glass p-6 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden hover:shadow-xl hover:shadow-purple-500/10"
            >
              {/* Фоновый градиент карточки */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />

              <div>
                {/* Шапка карточки */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10">
                      {step.icon}
                    </span>
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">
                        ЭТАП {step.step}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-purple-400/90 mb-2">
                  {step.subtitle}
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  {step.desc}
                </p>

                {/* Технологические теги */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {step.tech.map((t, ti) => (
                    <span
                      key={ti}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Кнопка быстрого перехода */}
              <button
                onClick={() => {
                  playClick();
                  setPage(step.targetPage);
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r ${step.color} text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group-hover:scale-[1.02]`}
              >
                <span>{step.btnText}</span>
                <span>➔</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* АРХИТЕКТУРНАЯ СХЕМА ПЕРЕХОДОВ (ИНФОГРАФИКА) */}
      <div className="card-glass p-8 rounded-2xl border border-white/10 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🔄 Матрица переходов и связанность компонентов</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-2xl">1️⃣ Входной уровень</div>
            <div className="text-xs font-bold text-white">Авторизация и роли</div>
            <div className="text-[11px] text-gray-400">
              Разделение прав доступа, инициализация сессии в СУБД SQLite 3
            </div>
            <div className="text-purple-400 text-sm font-bold">⬇️ переход</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-2xl">2️⃣ Диагностика</div>
            <div className="text-xs font-bold text-white">Тепловая карта пробелов</div>
            <div className="text-[11px] text-gray-400">
              Выявление тем &lt;70%, расчёт персонального дефицита знаний
            </div>
            <div className="text-blue-400 text-sm font-bold">⬇️ переход</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-2xl">3️⃣ Практика + Контроль</div>
            <div className="text-xs font-bold text-white">AntiCheatShield + Тренажёры</div>
            <div className="text-[11px] text-gray-400">
              Сдача заданий ЕГЭ с детекцией вкладок, блокировкой копирования и паузой
            </div>
            <div className="text-emerald-400 text-sm font-bold">⬇️ переход</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-2xl">4️⃣ Результат</div>
            <div className="text-xs font-bold text-white">Журнал & Аналитика</div>
            <div className="text-[11px] text-gray-400">
              Сводная ведомость 9 «Б», рейтинг, выдача наград и отчёт учителю
            </div>
            <div className="text-teal-400 text-sm font-bold">✅ Завершено</div>
          </div>
        </div>
      </div>
    </div>
  );
}
