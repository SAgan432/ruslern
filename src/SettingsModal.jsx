import React, { useState, useEffect } from 'react';
import { sounds } from './sounds';

export function SettingsModal({ isOpen, onClose, currentTheme, onSelectTheme, store }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(sounds.voiceUri || '');
  const [rate, setRate] = useState(sounds.voiceRate || 0.95);
  const [pitch, setPitch] = useState(sounds.voicePitch || 1.0);
  const [soundPreset, setSoundPreset] = useState(sounds.soundPreset || 'cyberpunk');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    const list = sounds.getAvailableVoices();
    setVoices(list);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (e) => {
    const uri = e.target.value;
    setSelectedVoice(uri);
    sounds.setVoice(uri);
  };

  const handleRateChange = (r) => {
    setRate(r);
    sounds.setRate(r);
  };

  const handlePitchChange = (p) => {
    setPitch(p);
    sounds.setPitch(p);
  };

  const handlePresetChange = (preset) => {
    setSoundPreset(preset);
    sounds.setSoundPreset(preset);
    sounds.correct();
  };

  const handleTestVoice = () => {
    sounds.speak('Привет! Это проверка голоса в системе РусЛёрн. Ударение в слове звонИт падает на букву И.');
  };

  const themes = [
    { id: 'cyberpunk', name: 'Киберпанк Неон', icon: '🟣', desc: 'Тёмно-фиолетовая с неоновыми акцентами' },
    { id: 'oled', name: 'OLED Ультра-чёрный', icon: '🌑', desc: 'Чистый чёрный фон для экономии батареи' },
    { id: 'emerald', name: 'Изумрудная Матрица', icon: '🌲', desc: 'Тёмно-зелёный хакерский дизайн' },
    { id: 'school', name: 'Школьная классика', icon: '☀️', desc: 'Чистая светлая тема школьной тетради' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border-purple-500/50 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-black text-white">Настройки темы и озвучки</h2>
              <p className="text-xs text-gray-400">Персонализируй визуал и голос диктора под себя</p>
            </div>
          </div>
          <button
            onClick={() => { sounds.click(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Смена темы оформления */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider">
            🎨 Выбор темы оформления:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  sounds.click();
                  onSelectTheme(t.id);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  currentTheme === t.id
                    ? 'border-purple-500 bg-purple-950/60 shadow-lg ring-1 ring-purple-400'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[10px] text-gray-400 line-clamp-1">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Выбор голоса диктора */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider">
              🎙️ Выбор голоса диктора:
            </label>
            <button
              onClick={handleTestVoice}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline flex items-center gap-1"
            >
              <span>🔊</span> Прослушать
            </button>
          </div>

          <select
            value={selectedVoice}
            onChange={handleVoiceChange}
            className="input-field py-2 text-xs bg-slate-900 border-white/15"
          >
            {voices.length > 0 ? (
              voices.map((v, i) => (
                <option key={i} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))
            ) : (
              <option value="">Стандартный голос системы (русский)</option>
            )}
          </select>

          {/* Скорость и тон речи */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-gray-400">
                <span>Скорость речи:</span>
                <span className="font-bold text-white">{rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={rate}
                onChange={e => handleRateChange(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-gray-400">
                <span>Высота тона:</span>
                <span className="font-bold text-white">{pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.1"
                value={pitch}
                onChange={e => handlePitchChange(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Пресет звуковых эффектов */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider">
            🔔 Стиль звуковых эффектов (клики, успех, ошибки):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'cyberpunk', name: 'Неон 8-bit' },
              { id: 'arcade', name: 'Аркада 👾' },
              { id: 'bell', name: 'Дзен 🔔' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => handlePresetChange(s.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  soundPreset === s.id
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Смена пароля */}
        {store?.state?.user && (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider">
              🔐 Безопасность (смена пароля для {store.state.user.username}):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                placeholder="Старый пароль"
                className="input-field py-2 text-xs"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
              />
              <input
                type="password"
                placeholder="Новый пароль"
                className="input-field py-2 text-xs"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-emerald-300">{pwdMsg}</span>
              <button
                type="button"
                onClick={async () => {
                  setPwdMsg('');
                  try {
                    const res = await fetch('/api/auth/change-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: store.state.user.id, oldPassword: oldPwd, newPassword: newPwd })
                    });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.error);
                    setOldPwd('');
                    setNewPwd('');
                    setPwdMsg('✅ Пароль успешно обновлён');
                  } catch (err) {
                    setPwdMsg(`❌ ${err.message}`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
              >
                Обновить пароль
              </button>
            </div>
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={() => { sounds.click(); onClose(); }}
          className="btn-primary w-full py-3 text-xs font-bold"
        >
          Сохранить и закрыть ✓
        </button>
      </div>
    </div>
  );
}
