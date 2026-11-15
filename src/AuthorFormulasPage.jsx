import React, { useState } from 'react';
import { AUTHOR_ORIGINAL_FORMULAS } from './egeData';
import { AntiCheatShield } from './AntiCheatShield';
import { sounds } from './sounds';

export function AuthorFormulasPage({ store }) {
  const { addXP } = store;
  const [activeFormulaId, setActiveFormulaId] = useState(AUTHOR_ORIGINAL_FORMULAS[0].id);
  const [testedExamples, setTestedExamples] = useState({}); // { [key]: boolean }

  const currentFormula = AUTHOR_ORIGINAL_FORMULAS.find(f => f.id === activeFormulaId) || AUTHOR_ORIGINAL_FORMULAS[0];

  const handleRevealExample = (key) => {
    sounds.correct();
    setTestedExamples(prev => ({ ...prev, [key]: true }));
    if (addXP) addXP(15, true);
  };

  return (
    <AntiCheatShield store={store} activityName="Интерактивные авторские формулы">
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Hero Header */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(236, 72, 153, 0.2), rgba(15, 15, 26, 0.95))',
          borderColor: 'rgba(168, 85, 247, 0.4)'
        }}>
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-3">
            <span>🛡️</span> 100% Авторские формулы • Ноль плагиата • Без унылых правил
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Интерактивные <span className="gradient-text">формулы и блок-схемы</span> русского языка
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Вместо сухого текста из учебников — визуальные логические модели, пошаговые блок-схемы и мнемонические якоря, которые гарантируют 100 баллов на экзамене.
          </p>
        </div>
      </div>

      {/* Formula Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {AUTHOR_ORIGINAL_FORMULAS.map(formula => {
          const isSelected = formula.id === activeFormulaId;
          return (
            <button
              key={formula.id}
              onClick={() => { sounds.click(); setActiveFormulaId(formula.id); }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-purple-500 bg-purple-950/40 shadow-xl scale-[1.02]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-purple-300">
                  {formula.tag}
                </span>
                <span className="text-xs">{isSelected ? '⚡' : '📖'}</span>
              </div>
              <h3 className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {formula.title}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                {formula.summary}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Formula Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Step-by-Step Decision Tree (Cols 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-6 space-y-6 border-purple-500/30">
            <div className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase">
                <span>{currentFormula.badge}</span> • <span>{currentFormula.tag}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {currentFormula.title}
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm mt-1">
                {currentFormula.summary}
              </p>
            </div>

            {/* Steps Container */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Пошаговый алгоритм принятия решения:
              </div>

              {currentFormula.ruleSteps.map(step => (
                <div key={step.step} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-4 transition-all hover:border-purple-500/40">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                    {step.step}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{step.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Practice Cards (Cols 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-5 space-y-4 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-sm font-bold text-white">Интерактивный тренажёр</h3>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold">+15 XP</span>
            </div>
            <p className="text-xs text-gray-300">
              Нажмите на карточку, чтобы проверить, как работает формула на практике:
            </p>

            <div className="space-y-2.5">
              {currentFormula.interactiveExamples.map((item, idx) => {
                const key = `${currentFormula.id}-${idx}`;
                const isRevealed = testedExamples[key];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRevealExample(key)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                      isRevealed
                        ? 'bg-black/60 border-emerald-500/50 shadow'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {item.word}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-bold">
                        {isRevealed ? '✓ Проверено' : 'Узнать ответ ➜'}
                      </span>
                    </div>

                    {isRevealed && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs space-y-1 animate-fadeIn">
                        <div className="font-bold text-emerald-300">
                          {item.answer}
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          {item.reason}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plagiarism Shield Guarantee Card */}
          <div className="card p-5 space-y-2 border-purple-500/30 bg-black/40 text-xs">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>💎</span> Стандарт качества РусЛёрн
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Все алгоритмы созданы преподавателями-практиками и методистами ФИПИ. Формулировки оптимизированы для мгновенного визуального запоминания без шаблонного копирования.
            </p>
          </div>
        </div>
      </div>
    </div>
    </AntiCheatShield>
  );
}
