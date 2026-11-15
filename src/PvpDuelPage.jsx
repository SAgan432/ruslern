import React, { useState, useEffect, useRef } from 'react';
import { sounds } from './sounds';

export function PvpDuelPage({ store, setPage }) {
  const { state, addXP } = store;
  const user = state.user;

  const [step, setStep] = useState('lobby'); // 'lobby' | 'waiting' | 'battle' | 'victory'
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [room, setRoom] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isBotDuel, setIsBotDuel] = useState(false);
  const [botScore, setBotScore] = useState(0);

  const pollIntervalRef = useRef(null);

  // Очистка таймеров
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Создать комнату
  const handleCreateRoom = async () => {
    sounds.click();
    try {
      const res = await fetch('/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user?.id || 'host',
          hostName: user?.name || 'Игрок 1',
          hostAvatar: user?.avatar || '🧑‍🎓',
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoomCode(data.code);
        setRoom(data.room);
        setStep('waiting');
        startPolling(data.code);
      }
    } catch (e) {
      alert('Ошибка соединения с сервером дуэлей');
    }
  };

  // Начать дуэль с ИИ-ботом
  const handleStartBotDuel = () => {
    sounds.click();
    setIsBotDuel(true);
    const mockRoom = {
      code: 'BOT1',
      host: { id: user?.id || 'player', name: user?.name || 'Вы', avatar: user?.avatar || '🧑‍🎓', score: 0 },
      guest: { id: 'bot_lom', name: 'ИИ Ломоносов 🤖', avatar: '🧙‍♂️', score: 0 },
      questions: [
        { q: 'Где верно поставлено ударение?', opts: ['тОрты', 'тортЫ'], a: 'тОрты' },
        { q: 'Где верно поставлено ударение?', opts: ['звонИт', 'звОнит'], a: 'звонИт' },
        { q: 'Где верно поставлено ударение?', opts: ['жалюзИ', 'жАлюзи'], a: 'жалюзИ' },
        { q: 'Где верно поставлено ударение?', opts: ['бАнты', 'бантЫ'], a: 'бАнты' },
        { q: 'Где верно поставлено ударение?', opts: ['красИвее', 'красивЕе'], a: 'красИвее' },
        { q: 'Где верно поставлено ударение?', opts: ['каталОг', 'катАлог'], a: 'каталОг' },
        { q: 'В каком слове пишется буква А?', opts: ['р...стение', 'заг...рать'], a: 'р...стение' },
        { q: 'В каком слове пишется буква И?', opts: ['зам...рать', 'зам...реть'], a: 'зам...рать' },
        { q: 'В каком слове пишется ПРЕ-?', opts: ['пр...мудрый', 'пр...ехать'], a: 'пр...мудрый' },
        { q: 'В каком слове пишется НН?', opts: ['стекля...ый', 'кожа...ый'], a: 'стекля...ый' },
        { q: 'Где верно поставлено ударение?', opts: ['свеклА', 'свЁкла'], a: 'свЁкла' },
        { q: 'Где верно поставлено ударение?', opts: ['договОр', 'дОговор'], a: 'договОр' },
      ],
      targetScore: 10,
    };
    setRoom(mockRoom);
    setBotScore(0);
    setStep('battle');
    setCurrentQIndex(0);
    prepareQuestion(mockRoom.questions[0]);
  };

  // Присоединиться по коду
  const handleJoinRoom = async () => {
    if (!inputCode.trim()) return;
    sounds.click();
    try {
      const res = await fetch('/api/duel/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inputCode.trim(),
          guestId: user?.id || 'guest',
          guestName: user?.name || 'Игрок 2',
          guestAvatar: user?.avatar || '🥷',
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoomCode(inputCode.trim());
        setRoom(data.room);
        setStep('battle');
        startPolling(inputCode.trim());
        prepareQuestion(data.room.questions[0]);
      } else {
        alert(data.error || 'Комната не найдена');
      }
    } catch (e) {
      alert('Ошибка подключения к комнате');
    }
  };

  // Поллинг состояния комнаты
  const startPolling = (code) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/duel/room/${code}`);
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
          if (data.room.status === 'in_progress' && step === 'waiting') {
            setStep('battle');
            prepareQuestion(data.room.questions[0]);
          } else if (data.room.status === 'finished') {
            clearInterval(pollIntervalRef.current);
            sounds.levelUp();
            setStep('victory');
            if (data.room.winner?.id === user?.id && addXP) {
              addXP(150, true);
            }
          }
        }
      } catch (e) {}
    }, 1200);
  };

  const prepareQuestion = (q) => {
    if (!q) return;
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
  };

  // Бот делает ходы каждые 2.8 - 4.5 секунды
  useEffect(() => {
    if (!isBotDuel || step !== 'battle') return;
    const botTimer = setInterval(() => {
      setBotScore(b => {
        const next = b + 1;
        if (next >= 10) {
          clearInterval(botTimer);
          setStep('victory');
          sounds.wrong();
        }
        return next;
      });
    }, 3600);
    return () => clearInterval(botTimer);
  }, [isBotDuel, step]);

  // Ответ игрока
  const handleAnswer = async (choice) => {
    const q = room?.questions[currentQIndex % room.questions.length];
    if (!q) return;

    const isCorrect = choice === q.a;
    if (isCorrect) {
      sounds.correct();
      setFeedback('correct');

      if (isBotDuel) {
        setRoom(r => {
          const newScore = r.host.score + 1;
          if (newScore >= 10) {
            setStep('victory');
            sounds.levelUp();
            if (addXP) addXP(150, true);
          }
          return {
            ...r,
            host: { ...r.host, score: newScore }
          };
        });
      } else {
        // Отправляем очко на сервер
        try {
          const res = await fetch('/api/duel/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: roomCode,
              playerId: user?.id || 'player'
            })
          });
          const data = await res.json();
          if (data.room) setRoom(data.room);
        } catch (e) {}
      }
    } else {
      sounds.wrong();
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      if (room?.questions) {
        prepareQuestion(room.questions[nextIdx % room.questions.length]);
      }
    }, 250);
  };

  const myPlayer = room?.host?.id === user?.id ? room?.host : room?.guest || room?.host;
  const oppPlayer = room?.host?.id === user?.id ? (isBotDuel ? { name: 'ИИ Ломоносов 🤖', avatar: '🧙‍♂️', score: botScore } : room?.guest) : room?.host;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { sounds.click(); setPage('home'); }}
          className="text-xs text-purple-400 font-bold flex items-center gap-1 p-2 rounded-xl bg-white/5"
        >
          ◀ На главную
        </button>
        <span className="badge bg-purple-500/20 text-purple-300 font-bold">
          ⚔️ PVP Онлайн-дуэли (до 10 очков)
        </span>
      </div>

      {/* LOBBY */}
      {step === 'lobby' && (
        <div className="card p-6 sm:p-8 text-center space-y-6 border-purple-500/40">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/30">
            ⚔️
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Битва знатоков русского языка
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-md mx-auto">
              Сразись с одноклассником в реальном времени! Кто быстрее наберёт 10 правильных ответов по ударениям и орфографии?
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <button
              onClick={handleCreateRoom}
              className="btn-primary w-full py-4 text-sm font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-purple-600/40"
            >
              <span>👑</span> Создать дуэль (Получить 4-значный код)
            </button>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                Или введи 4-значный PIN друга:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Например: 4821"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center font-mono text-xl font-bold tracking-widest uppercase"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={inputCode.length !== 4}
                  className="btn-primary px-6 text-xs font-bold disabled:opacity-40"
                >
                  Войти ➜
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleStartBotDuel}
                className="w-full py-3 rounded-2xl bg-slate-900 border border-purple-500/30 text-xs font-bold text-purple-300 hover:bg-purple-950/40 transition-all flex items-center justify-center gap-2"
              >
                <span>🤖</span> Тренировочная дуэль с ИИ Ломоносовым (без напарника)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING FOR OPPONENT */}
      {step === 'waiting' && (
        <div className="card p-8 text-center space-y-6 border-purple-500/40 animate-fadeIn">
          <div className="text-4xl animate-bounce">⏳</div>
          <div>
            <h2 className="text-xl font-black text-white">Ожидание соперника...</h2>
            <p className="text-xs text-gray-400 mt-1">
              Скажи однокласснику ввести этот 4-значный код в разделе «Дуэли»:
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-black/60 border-2 border-dashed border-purple-500 max-w-xs mx-auto space-y-2">
            <span className="text-4xl sm:text-5xl font-mono font-black text-purple-300 tracking-widest">
              {roomCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                alert(`Код ${roomCode} скопирован в буфер!`);
              }}
              className="text-[11px] text-gray-400 hover:text-white block mx-auto underline pt-2"
            >
              📋 Скопировать код
            </button>
          </div>

          <p className="text-xs text-gray-500 animate-pulse">
            Дуэль начнется автоматически, как только соперник введёт код...
          </p>

          <button
            onClick={() => setStep('lobby')}
            className="text-xs text-rose-400 underline"
          >
            Отменить дуэль
          </button>
        </div>
      )}

      {/* BATTLE ARENA */}
      {step === 'battle' && room && (
        <div className="space-y-4 animate-scaleUp">
          {/* Battle Header Split Score Bar */}
          <div className="card p-4 border-purple-500/40 bg-black/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              {/* You */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{myPlayer?.avatar || '🧑‍🎓'}</span>
                <div>
                  <div className="text-white font-bold">{myPlayer?.name || 'Вы'}</div>
                  <div className="text-purple-400 font-mono text-sm">{myPlayer?.score || 0} / 10</div>
                </div>
              </div>

              {/* VS Badge */}
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-rose-600 text-white font-black text-xs shadow-md animate-pulse">
                ⚡ VS ⚡
              </div>

              {/* Opponent */}
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-white font-bold">{oppPlayer?.name || 'Соперник'}</div>
                  <div className="text-rose-400 font-mono text-sm">{oppPlayer?.score || 0} / 10</div>
                </div>
                <span className="text-2xl">{oppPlayer?.avatar || '🥷'}</span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${((myPlayer?.score || 0) / 10) * 50}%` }}
              />
              <div className="flex-1" />
              <div
                className="bg-gradient-to-l from-rose-500 to-amber-500 h-full transition-all duration-300"
                style={{ width: `${((oppPlayer?.score || 0) / 10) * 50}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          {room.questions && room.questions[currentQIndex % room.questions.length] && (
            <div className="card p-6 text-center space-y-6 border-white/10">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Раунд #{currentQIndex + 1}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {room.questions[currentQIndex % room.questions.length].q}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shuffledOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    className="p-5 rounded-2xl text-center text-lg sm:text-xl font-bold bg-white/5 border border-white/15 hover:border-purple-500 hover:bg-purple-950/40 text-white active:scale-95 transition-all shadow-lg"
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {feedback && (
                <div className="text-xs font-bold animate-fadeIn">
                  {feedback === 'correct' ? (
                    <span className="text-emerald-400">⚡ Точно в цель! +1 очко</span>
                  ) : (
                    <span className="text-rose-400">❌ Ошибка! Удар мимо цели</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VICTORY SCREEN */}
      {step === 'victory' && (
        <div className="card p-8 text-center space-y-6 border-purple-500/40 animate-scaleUp">
          <div className="text-6xl animate-bounce">
            {(myPlayer?.score || 0) >= 10 ? '👑' : '💔'}
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {(myPlayer?.score || 0) >= 10 ? 'ТЫ ПОБЕДИЛ В ДУЭЛИ!' : 'ПОБЕДА СОПЕРНИКА'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2">
              {(myPlayer?.score || 0) >= 10
                ? 'Невероятная скорость и безупречная грамотность! Начислено +150 XP!'
                : 'Соперник оказался быстрее на долю секунды. Попробуй отыграться!'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex justify-around items-center">
            <div>
              <div className="text-xs text-gray-400">{myPlayer?.name}</div>
              <div className="text-2xl font-black text-purple-400">{myPlayer?.score || 0} / 10</div>
            </div>
            <div className="text-xl font-bold text-gray-500">:</div>
            <div>
              <div className="text-xs text-gray-400">{oppPlayer?.name}</div>
              <div className="text-2xl font-black text-rose-400">{oppPlayer?.score || 0} / 10</div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setStep('lobby');
                setRoom(null);
                setRoomCode('');
                setInputCode('');
              }}
              className="btn-primary w-full py-3.5 text-sm font-bold rounded-2xl"
            >
              Сыграть ещё дуэль ⚔️
            </button>
            <button
              onClick={() => { sounds.click(); setPage('home'); }}
              className="btn-secondary w-full py-3 text-xs font-bold rounded-2xl"
            >
              Вернуться на главную 🏠
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
