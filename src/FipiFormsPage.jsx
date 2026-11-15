import React, { useState } from 'react';
import { sounds } from './sounds';
import { EGE_FULL_VARIANT } from './egeData';

export function FipiFormsPage({ store, setPage }) {
  const [activeTab, setActiveTab] = useState('blank1'); // 'blank1' | 'blank2' | 'keys'
  const [variantNumber, setVariantNumber] = useState(1);

  const handlePrint = () => {
    sounds.click();
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Top Bar (No Print) */}
      <div className="no-print flex items-center justify-between">
        <button
          onClick={() => { sounds.click(); setPage('home'); }}
          className="text-xs text-purple-400 font-bold flex items-center gap-1 p-2 rounded-xl bg-white/5"
        >
          ◀ На главную
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/40"
          >
            <span>🖨️</span> Распечатать / Сохранить в PDF (A4)
          </button>
        </div>
      </div>

      {/* Header Banner (No Print) */}
      <div className="no-print card p-6 border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
              <span>📄</span> Официальный стандарт ФИПИ • Формат А4
            </div>
            <h1 className="text-2xl font-black text-white">
              Генератор официальных бланков ЕГЭ (№1 и №2)
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Распечатайте аутентичные бланки ответов с QR-кодами, сетками клеток и ключами для проведения пробного экзамена в классе.
            </p>
          </div>

          {/* Form Tabs */}
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => { sounds.click(); setActiveTab('blank1'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'blank1' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Бланк №1 (1–26)
            </button>
            <button
              onClick={() => { sounds.click(); setActiveTab('blank2'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'blank2' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Бланк №2 (Сочинение)
            </button>
            <button
              onClick={() => { sounds.click(); setActiveTab('keys'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'keys' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Ключи учителя
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE AREA (A4 SHEET STYLES) */}
      {/* ========================================================================= */}
      <div className="printable-area bg-white text-black p-6 sm:p-10 rounded-2xl shadow-2xl border border-black/10 font-sans">
        
        {/* ================= БЛАНК № 1 ================= */}
        {activeTab === 'blank1' && (
          <div className="space-y-4">
            {/* Top Bar of Form */}
            <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Государственная итоговая аттестация • Единый государственный экзамен
                </div>
                <h2 className="text-xl font-black tracking-tight text-black">
                  БЛАНК ОТВЕТОВ № 1 (Русский язык)
                </h2>
                <div className="text-xs font-semibold text-gray-800">
                  Предмет: <strong>Русский язык (01)</strong> • Вариант № {variantNumber} • Код региона: <strong>[7][7]</strong>
                </div>
              </div>

              {/* QR and Barcode Mockup */}
              <div className="text-right flex flex-col items-end">
                <div className="w-16 h-16 border-2 border-black p-1 flex items-center justify-center font-mono text-[9px] font-bold">
                  [ QR-CODE ]
                </div>
                <span className="font-mono text-[9px] font-bold mt-1">7701-2026-9941</span>
              </div>
            </div>

            {/* Instruction sample block */}
            <div className="border border-black p-2 bg-gray-50 text-[10px] space-y-1">
              <div className="font-bold uppercase">
                Образцы написания букв и цифр (заполнять только черной гелевой ручкой):
              </div>
              <div className="font-mono font-bold tracking-[0.25em] text-xs">
                0 1 2 3 4 5 6 7 8 9 А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я
              </div>
            </div>

            {/* Main Answers Grid (Tasks 1–26) */}
            <div className="space-y-1 pt-1">
              <div className="text-xs font-bold uppercase tracking-wider border-b border-black pb-1">
                Результаты выполнения заданий с кратким ответом (Часть 1):
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2">
                {Array.from({ length: 26 }).map((_, i) => {
                  const taskNum = i + 1;
                  return (
                    <div key={taskNum} className="flex items-center gap-2 py-0.5 text-xs">
                      <span className="w-6 font-bold text-right shrink-0">{taskNum}.</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 14 }).map((_, c) => (
                          <div
                            key={c}
                            className="w-4 h-5 border border-black flex items-center justify-center font-mono text-[10px]"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Replacement of Wrong Answers Block */}
            <div className="mt-4 pt-3 border-t-2 border-black space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider">
                Замена ошибочных ответов на задания с кратким ответом:
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-gray-600">Задание №:</span>
                    <div className="w-6 h-5 border border-black flex items-center justify-center font-mono text-[10px]" />
                    <span className="text-[10px] text-gray-600 ml-1">Ответ:</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, c) => (
                        <div
                          key={c}
                          className="w-4 h-5 border border-black flex items-center justify-center font-mono text-[10px]"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Block */}
            <div className="mt-6 pt-4 border-t border-black flex justify-between items-center text-[10px] text-gray-700">
              <div>Подпись участника экзамена: ____________________</div>
              <div>Бланк проверен системой РусЛёрн 2026/2027</div>
            </div>
          </div>
        )}

        {/* ================= БЛАНК № 2 ================= */}
        {activeTab === 'blank2' && (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Государственная итоговая аттестация • Единый государственный экзамен
                </div>
                <h2 className="text-xl font-black tracking-tight text-black">
                  БЛАНК ОТВЕТОВ № 2 (Лист 1)
                </h2>
                <div className="text-xs font-semibold text-gray-800">
                  Задание с развёрнутым ответом (Задание 27 — Сочинение)
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="w-16 h-16 border-2 border-black p-1 flex items-center justify-center font-mono text-[9px] font-bold">
                  [ QR-CODE ]
                </div>
                <span className="font-mono text-[9px] font-bold mt-1">7702-2026-9941</span>
              </div>
            </div>

            <div className="p-2 border border-black text-[10px] text-gray-800 bg-gray-50">
              Пишите чётко и разборчиво, соблюдая поля бланка. Минимальный объём сочинения — 150 слов. Обязательно выделите 7 абзацев ФИПИ.
            </div>

            {/* Lined Notebook Simulation */}
            <div className="pt-2 space-y-5">
              {Array.from({ length: 28 }).map((_, lineIdx) => (
                <div
                  key={lineIdx}
                  className="w-full border-b border-gray-400 h-6 flex items-end justify-between px-2 text-[9px] text-gray-300 select-none"
                >
                  <span>{lineIdx + 1}</span>
                  <span>{lineIdx + 1}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-black flex justify-between items-center text-[10px] text-gray-700">
              <div>Страница 1 из 1</div>
              <div>Следующий лист бланка № 2 выдаётся по требованию</div>
            </div>
          </div>
        )}

        {/* ================= КЛЮЧИ УЧИТЕЛЯ ================= */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-3">
              <h2 className="text-xl font-black text-black">
                КЛЮЧИ И КРИТЕРИИ ПРОВЕРКИ (Для эксперта / учителя)
              </h2>
              <div className="text-xs text-gray-700">
                Вариант № {variantNumber} • Официальная спецификация 2026/2027
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2">
                1. Эталонные ответы к заданиям 1–26 (Часть 1):
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {EGE_FULL_VARIANT.tasks.slice(0, 20).map(t => (
                  <div key={t.num} className="p-2 border border-black/30 rounded flex justify-between">
                    <span className="font-bold">№{t.num}:</span>
                    <span className="font-mono font-bold text-purple-900">{t.correctAnswer}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-black/20">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2">
                2. Критерии оценивания сочинения (Задание 27, макс. 21 балл):
              </h3>
              <table className="w-full text-left text-xs border-collapse border border-black/30">
                <thead>
                  <tr className="bg-gray-100 border-b border-black/30">
                    <th className="p-2 border border-black/30">Критерий</th>
                    <th className="p-2 border border-black/30">Содержание</th>
                    <th className="p-2 border border-black/30 text-right">Макс.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="p-2 border border-black/30 font-bold">К1</td><td className="p-2 border border-black/30">Формулировка проблемы исходного текста</td><td className="p-2 border border-black/30 text-right font-bold">1</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К2</td><td className="p-2 border border-black/30">Комментарий к проблеме (2 примера + смысловая связь)</td><td className="p-2 border border-black/30 text-right font-bold">3</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К3</td><td className="p-2 border border-black/30">Отражение позиции автора</td><td className="p-2 border border-black/30 text-right font-bold">1</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К4</td><td className="p-2 border border-black/30">Отношение к позиции автора + обоснование</td><td className="p-2 border border-black/30 text-right font-bold">1</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К5</td><td className="p-2 border border-black/30">Смысловая цельность и композиция (7 абзацев)</td><td className="p-2 border border-black/30 text-right font-bold">2</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К7-К8</td><td className="p-2 border border-black/30">Орфография (3 б.) и пунктуация (3 б.)</td><td className="p-2 border border-black/30 text-right font-bold">6</td></tr>
                  <tr><td className="p-2 border border-black/30 font-bold">К9-К12</td><td className="p-2 border border-black/30">Грамматика, речь, этика и факты</td><td className="p-2 border border-black/30 text-right font-bold">7</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
