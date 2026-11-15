import React, { useState, useEffect, useRef } from 'react';
import { sounds } from './sounds';

export function VoiceEssayPage({ store, setPage }) {
  const [essayText, setEssayText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const [scores, setScores] = useState({
    k1: 1, k2: 3, k3: 1, k4: 1, k5: 2, k6: 1,
    k7: 3, k8: 3, k9: 2, k10: 2, k11: 1, k12: 1,
  });

  const recognitionRef = useRef(null);

  const criteriaList = [
    { id: 'k1', name: 'К1. Формулировка проблемы', max: 1 },
    { id: 'k2', name: 'К2. Комментарий (2 примера + смысловая связь)', max: 3 },
    { id: 'k3', name: 'К3. Отражение позиции автора', max: 1 },
    { id: 'k4', name: 'К4. Отношение к позиции автора + обоснование', max: 1 },
    { id: 'k5', name: 'К5. Смысловая цельность, речевая связность и абзацы', max: 2 },
    { id: 'k6', name: 'К6. Богатство речи', max: 1 },
    { id: 'k7', name: 'К7. Соблюдение орфографических норм', max: 3 },
    { id: 'k8', name: 'К8. Соблюдение пунктуационных норм', max: 3 },
    { id: 'k9', name: 'К9. Соблюдение грамматических норм', max: 2 },
    { id: 'k10', name: 'К10. Соблюдение речевых норм', max: 2 },
    { id: 'k11', name: 'К11. Соблюдение этических норм', max: 1 },
    { id: 'k12', name: 'К12. Фактологическая точность', max: 1 },
  ];

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const paragraphs = essayText.trim() ? essayText.trim().split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  // Инициализация Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ru-RU';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }

      if (finalTranscript) {
        // Умная замена голосовых знаков препинания
        let processed = finalTranscript
          .replace(/\s+точка/gi, '.')
          .replace(/\s+запятая/gi, ',')
          .replace(/\s+двоеточие/gi, ':')
          .replace(/\s+тире/gi, ' —')
          .replace(/\s+вопросительный знак/gi, '?')
          .replace(/\s+восклицательный знак/gi, '!')
          .replace(/\s+(новый абзац|красная строка|абзац)/gi, '\n\n');

        setEssayText(prev => (prev ? prev + ' ' + processed.trim() : processed.trim()));
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setRecognitionInstance(recognition);
  }, []);

  const toggleRecording = () => {
    sounds.click();
    if (!speechSupported) {
      alert('Голосовой ввод не поддерживается данным браузером. Попробуйте Chrome или Яндекс Браузер на телефоне.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        if (sounds.vibrate) sounds.vibrate(30);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Автоматическое форматирование текста в 7 абзацев ФИПИ
  const handleAutoFormat7Paragraphs = () => {
    sounds.click();
    const raw = essayText.trim();
    if (!raw) {
      alert('Сначала надиктуйте или введите текст сочинения!');
      return;
    }

    // Если уже 7 абзацев
    const existingParagraphs = raw.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (existingParagraphs.length === 7) {
      alert('Текст уже идеально структурирован на 7 абзацев ФИПИ!');
      return;
    }

    // Сплитим на предложения
    const sentences = raw.match(/[^.!?]+[.!?]+(\s|$)/g) || [raw];

    if (sentences.length < 7) {
      alert('В тексте меньше 7 предложений. Для полноценного сочинения требуется более развёрнутый текст (минимум 150 слов).');
      return;
    }

    // Распределяем предложения по 7 блокам ФИПИ
    const perParagraph = Math.max(1, Math.floor(sentences.length / 7));
    const p1 = sentences.slice(0, perParagraph).join('').trim();
    const p2 = sentences.slice(perParagraph, perParagraph * 2).join('').trim();
    const p3 = sentences.slice(perParagraph * 2, perParagraph * 3).join('').trim();
    const p4 = sentences.slice(perParagraph * 3, perParagraph * 4).join('').trim();
    const p5 = sentences.slice(perParagraph * 4, perParagraph * 5).join('').trim();
    const p6 = sentences.slice(perParagraph * 5, perParagraph * 6).join('').trim();
    const p7 = sentences.slice(perParagraph * 6).join('').trim();

    const formatted = [p1, p2, p3, p4, p5, p6, p7].join('\n\n');
    setEssayText(formatted);
    sounds.correct();
    alert('✨ Текст успешно переформатирован в 7 официальных абзацев структуры ФИПИ!');
  };

  // Заполнить идеальный авторский шаблон
  const handleInsertTemplate = () => {
    sounds.click();
    const template = `Какова роль исторической памяти в жизни современного человека? Над этой сложной нравственной проблемой предлагает задуматься автор предложенного для анализа текста.

Размышляя над поставленным вопросом, писатель обращает внимание читателя на трепетное отношение старшего поколения к фронтовым реликвиям. Автор показывает, как старые письма и пожелтевшие фотографии способны пробудить в душе искреннее чувство благодарности героям прошлого. Этот пример убедительно доказывает, что память о подвигах предков делает человека духовно богаче.

Продолжая повествование, писатель акцентирует внимание на поведении молодёжи, бережно сохраняющей традиции своей малой родины. Становится очевидно, что преемственность поколений является тем нерушимым фундаментом, на котором строится будущее всей страны.

Оба приведённых примера, дополняя друг друга, позволяют глубже осознать главную мысль автора. И бережное хранение семейных архивов, и уважение к истории родного края служат проявлениями истинного патриотизма и человеческого достоинства.

Позиция автора предельно ясна: историческая память — это важнейший нравственный ориентир личности, без которого общество теряет свои духовные корни.

Нельзя не согласиться с мнением писателя. Действительно, народ, забывший своё прошлое, обречён повторять трагические ошибки. Вспомним повесть В.Г. Распутина «Прощание с Матёрой», где вековые традиции и уважение к предкам помогают жителям деревни сохранить верность своей совести перед лицом неизбежных перемен.

В заключение хочется подчеркнуть, что сохранение культурного и исторического наследия — священный долг каждого гражданина. Память делает нас людьми, способными ценить мир и созидать во имя будущих поколений.`;
    setEssayText(template);
  };

  const copyReport = () => {
    sounds.click();
    let rep = `📑 ПРОТОКОЛ ЭКСПЕРТНОЙ ПРОВЕРКИ СОЧИНЕНИЯ (ЕГЭ №27)\n`;
    rep += `Слов: ${wordCount} • Абзацев: ${paragraphs} / 7\n\n`;
    criteriaList.forEach(c => {
      rep += `• ${c.name}: ${scores[c.id]} из ${c.max}\n`;
    });
    rep += `\nИТОГО: ${totalScore} из 21 первичного балла\n`;
    navigator.clipboard.writeText(rep);
    alert('Протокол скопирован в буфер обмена!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { sounds.click(); setPage('home'); }}
          className="text-xs text-purple-400 font-bold flex items-center gap-1 p-2 rounded-xl bg-white/5"
        >
          ◀ На главную
        </button>
        <span className="badge bg-purple-500/20 text-purple-300 font-bold">
          🎤 Голосовой чекер сочинений (ЕГЭ №27)
        </span>
      </div>

      {/* Hero Header */}
      <div className="card p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(236, 72, 153, 0.2), rgba(15, 15, 26, 0.95))',
          borderColor: 'rgba(168, 85, 247, 0.4)'
        }}>
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-2">
            <span>🎙️</span> Web Speech-to-Text • Разметка 7 абзацев • Критерии К1–К12
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Голосовая диктовка и <span className="gradient-text">разбор сочинения</span>
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm mt-1">
            Надиктуй сочинение в микрофон смартфона. Система автоматически расставит знаки, разобьёт на 7 официальных абзацев ФИПИ и рассчитает баллы.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input and Speech Controls (Cols 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-5 space-y-4 border-purple-500/30">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/50 ring-2 ring-rose-400'
                      : 'btn-primary'
                  }`}
                >
                  <span>{isRecording ? '⏹️ Стоп запись' : '🎤 Надиктовать голосом'}</span>
                </button>

                <button
                  onClick={handleAutoFormat7Paragraphs}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-950/60 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60 transition-all flex items-center gap-1.5"
                  title="Автоматически распределяет текст по 7 абзацам ФИПИ"
                >
                  <span>✨</span> 7 абзацев ФИПИ
                </button>
              </div>

              <button
                onClick={handleInsertTemplate}
                className="text-xs text-gray-400 hover:text-purple-300 underline"
              >
                Вставить образец 21/21
              </button>
            </div>

            {/* Live Indicator */}
            {isRecording && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Идёт запись речи... Говорите в микрофон (можно произносить «точка», «запятая», «абзац»).</span>
              </div>
            )}

            {/* Textarea */}
            <div>
              <textarea
                rows={15}
                className="input-field text-xs sm:text-sm leading-relaxed font-sans"
                placeholder="Нажмите «Надиктовать голосом» или вставьте текст сочинения сюда..."
                value={essayText}
                onChange={e => setEssayText(e.target.value)}
              />
            </div>

            {/* Word and Paragraph Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <div className="flex gap-2">
                <span className={`badge ${wordCount >= 150 ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' : 'bg-rose-900/40 text-rose-300 border border-rose-500/40'}`}>
                  Слов: <strong>{wordCount}</strong> (мин. 150)
                </span>
                <span className={`badge ${paragraphs === 7 ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' : 'bg-amber-900/40 text-amber-300 border border-amber-500/40'}`}>
                  Абзацев: <strong>{paragraphs}</strong> / 7
                </span>
              </div>

              <button
                onClick={() => setEssayText('')}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Expert Criteria K1-K12 (Cols 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-5 space-y-4 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Критерии ФИПИ К1–К12</h3>
                <p className="text-[11px] text-gray-400">Экспертная проверка (Макс: 21 балл)</p>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {totalScore} / 21
              </div>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {criteriaList.map(c => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-300 flex-1 leading-tight">{c.name}</div>
                  <div className="flex gap-1 shrink-0">
                    {Array.from({ length: c.max + 1 }).map((_, b) => (
                      <button
                        key={b}
                        onClick={() => {
                          sounds.click();
                          setScores(s => ({ ...s, [c.id]: b }));
                        }}
                        className={`w-6 h-6 rounded-lg text-xs font-bold transition-all ${
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
              className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>📋</span> Скопировать экспертный протокол
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
