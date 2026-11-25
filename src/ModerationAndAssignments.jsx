import React, { useState, useEffect } from 'react';
import { sounds } from './sounds';
import { OGE_CATEGORIES, convertPercentToSchoolGrade } from './ogeData';
import { PAMYATKI } from './data';

// =============================================================================
// УПРАВЛЕНИЕ УЧЕНИКАМИ: КЛАССЫ, СОРТИРОВКА, БАН, ПРЕДУПРЕЖДЕНИЯ, ЧИСТКА
// =============================================================================
export function StudentsManagementPage({ store, onAssigned }) {
  const { state } = store;
  const teacher = state.user;

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState('grade'); // grade | name | accuracy | xp | violations | tests | recent
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | banned
  const [search, setSearch] = useState('');

  // Добавить класс
  const [newClassInput, setNewClassInput] = useState('');

  // Модалки действий
  const [warnTarget, setWarnTarget] = useState(null);
  const [warnReason, setWarnReason] = useState('Смените никнейм на реальные Фамилию и Имя!');

  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState('Недопустимый / фейковый никнейм');

  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignTitle, setAssignTitle] = useState('Индивидуальная работа над ошибками');
  const [assignMode, setAssignMode] = useState('variant'); // variant | custom_oge | topic
  const [assignVariantId, setAssignVariantId] = useState('2026');
  const [assignSelectedLines, setAssignSelectedLines] = useState([2, 3, 5, 6, 7]);
  const [assignTopicId, setAssignTopicId] = useState('chered');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignStrict, setAssignStrict] = useState(true);

  const [cleanupOpen, setCleanupOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        className: selectedClass,
        sortBy,
        status: statusFilter,
        search,
      });
      const [r1, r2] = await Promise.all([
        fetch(`/api/teacher/students?${qs.toString()}`),
        fetch('/api/classes'),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.students) setStudents(d1.students);
      if (d2.classes) setClasses(d2.classes);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, sortBy, statusFilter, search]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassInput.trim()) return;
    sounds.click();
    await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassInput }),
    });
    setNewClassInput('');
    loadData();
  };

  const handleSendWarn = async (e) => {
    e.preventDefault();
    if (!warnTarget) return;
    sounds.click();
    await fetch(`/api/teacher/students/${warnTarget.id}/warn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: warnReason,
        teacherId: teacher?.id || 1,
        teacherName: teacher?.name || 'Учитель',
      }),
    });
    setWarnTarget(null);
    loadData();
  };

  const handleBan = async (e) => {
    e.preventDefault();
    if (!banTarget) return;
    sounds.wrong();
    await fetch(`/api/teacher/students/${banTarget.id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: banReason,
        teacherName: teacher?.name || 'Учитель',
      }),
    });
    setBanTarget(null);
    loadData();
  };

  const handleUnban = async (id) => {
    sounds.click();
    await fetch(`/api/teacher/students/${id}/unban`, { method: 'POST' });
    loadData();
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    sounds.click();
    await fetch(`/api/teacher/students/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, className: editClass }),
    });
    setEditTarget(null);
    loadData();
  };

  const handleDeleteStudent = async (st) => {
    if (!confirm(`Удалить ученика «${st.name}» (${st.class_name}) и всю его статистику?`)) return;
    sounds.click();
    await fetch(`/api/teacher/students/${st.id}`, { method: 'DELETE' });
    loadData();
  };

  const handleCleanup = async (target) => {
    const msgs = {
      banned: 'Удалить всех заблокированных учеников из базы?',
      class: `Удалить ВСЕХ учеников класса «${selectedClass}» и их сдачи?`,
      logs: 'Очистить всю ленту старых античит-логов?',
      submissions: 'Очистить историю всех сданных работ?',
      all_students: 'ВНИМАНИЕ! Удалить ВСЕХ учеников, все сдачи и логи (останется только учитель)?',
    };
    if (!confirm(msgs[target] || 'Подтвердить очистку?')) return;
    if (target === 'all_students' && !confirm('Вы точно уверены? Действие необратимо!')) return;

    sounds.click();
    const res = await fetch('/api/teacher/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, className: selectedClass }),
    });
    const d = await res.json();
    alert(`Готово! Удалено записей: ${d.removed || 0}`);
    loadData();
  };

  const handleCreateIndividualAssignment = async (e) => {
    e.preventDefault();
    if (!assignTarget) return;
    sounds.levelUp();

    const taskConfig = {};
    let qCount = 11;
    let modeToSend = 'reshu_oge';

    if (assignMode === 'variant') {
      taskConfig.variantId = assignVariantId || '2026';
      qCount = 11;
    } else if (assignMode === 'custom_oge') {
      const counts = {};
      assignSelectedLines.forEach(num => { counts[num] = 1; });
      taskConfig.counts = counts;
      qCount = assignSelectedLines.length || 5;
    } else {
      modeToSend = 'topic';
      taskConfig.topicId = assignTopicId;
      qCount = 6;
    }

    await fetch('/api/teacher/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: assignTitle,
        description: `Персональное задание для ${assignTarget.name} (${assignTarget.class_name})`,
        targetType: 'student',
        targetStudentId: assignTarget.id,
        mode: modeToSend,
        taskConfig,
        questionCount: qCount,
        strictAnticheat: assignStrict,
        dueDate: assignDueDate,
        createdBy: teacher?.id || 1,
        createdByName: teacher?.name || 'Учитель',
      }),
    });

    setAssignTarget(null);
    if (onAssigned) onAssigned();
    alert(`✅ Индивидуальное задание выдано ученику ${assignTarget.name}!`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Заголовок и кнопки действий */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">👥 Ученики, классы и модерация</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Распределение по классам, сортировка, предупреждения, бан за плохие ники, чистка и личные задания
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { sounds.click(); setCleanupOpen(!cleanupOpen); }}
            className="btn-secondary text-xs py-2 px-4 border-rose-500/40 text-rose-200 hover:bg-rose-950/50"
          >
            🧹 Чистка базы
          </button>
          <button onClick={loadData} className="btn-secondary text-xs py-2 px-4">
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Панель массовой чистки */}
      {cleanupOpen && (
        <div className="card p-5 border-rose-500/50 bg-rose-950/20 space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-rose-300">🧹 Инструменты чистки базы данных</h3>
            <button onClick={() => setCleanupOpen(false)} className="text-gray-400 text-xs">Скрыть</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleCleanup('banned')} className="px-3 py-2 rounded-xl bg-rose-900/40 border border-rose-500/40 text-xs font-bold text-rose-200 hover:bg-rose-800/50">
              🗑️ Удалить всех забаненных
            </button>
            {selectedClass !== 'all' && (
              <button onClick={() => handleCleanup('class')} className="px-3 py-2 rounded-xl bg-amber-900/40 border border-amber-500/40 text-xs font-bold text-amber-200 hover:bg-amber-800/50">
                🏫 Очистить класс «{selectedClass}»
              </button>
            )}
            <button onClick={() => handleCleanup('logs')} className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-gray-200 hover:bg-white/10">
              🛡️ Очистить логи античита
            </button>
            <button onClick={() => handleCleanup('submissions')} className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-gray-200 hover:bg-white/10">
              📋 Сбросить историю сдач
            </button>
            <button onClick={() => handleCleanup('all_students')} className="px-3 py-2 rounded-xl bg-red-600/80 text-xs font-black text-white hover:bg-red-600">
              ⚠️ Удалить ВСЕХ учеников
            </button>
          </div>
        </div>
      )}

      {/* Фильтр по классам + добавление нового класса */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Распределение по классам:</span>
          <form onSubmit={handleAddClass} className="flex gap-2">
            <input
              type="text"
              className="input-field py-1.5 px-3 text-xs w-36"
              placeholder="Новый класс (9Г)..."
              value={newClassInput}
              onChange={e => setNewClassInput(e.target.value)}
            />
            <button type="submit" className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500">
              + Класс
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { sounds.click(); setSelectedClass('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              selectedClass === 'all'
                ? 'bg-purple-600 border-purple-400 text-white shadow'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            Все классы
          </button>
          {classes.map(c => (
            <button
              key={c.name}
              onClick={() => { sounds.click(); setSelectedClass(c.name); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedClass === c.name
                  ? 'bg-blue-600 border-blue-400 text-white shadow'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              {c.name} <span className="opacity-70">({c.student_count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Панель поиска, сортировки и статуса */}
      <div className="grid sm:grid-cols-3 gap-3">
        <input
          type="text"
          className="input-field py-2.5 text-xs"
          placeholder="🔍 Поиск по имени, нику, классу..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="input-field py-2.5 text-xs bg-slate-900"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="grade">↕️ Сортировка: По классу (5 ➔ 11)</option>
          <option value="name">↕️ Сортировка: По имени (А ➔ Я)</option>
          <option value="accuracy">↕️ Сортировка: По успеваемости (% ↓)</option>
          <option value="violations">↕️ Сортировка: По нарушениям античита ↓</option>
          <option value="xp">↕️ Сортировка: По опыту XP ↓</option>
          <option value="tests">↕️ Сортировка: По кол-ву тестов ↓</option>
          <option value="recent">↕️ Сортировка: Новые регистрации ↓</option>
        </select>

        <select
          className="input-field py-2.5 text-xs bg-slate-900"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">👤 Все статусы</option>
          <option value="active">🟢 Только активные</option>
          <option value="banned">🔨 Только забаненные</option>
        </select>
      </div>

      {/* Список учеников */}
      {loading ? (
        <div className="card p-8 text-center text-gray-400 text-sm">Загрузка списка учеников...</div>
      ) : students.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <div className="text-4xl">🎓</div>
          <div className="font-bold text-white text-base">Учеников пока нет</div>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Тестовые аккаунты удалены. Как только ученики зарегистрируются и выберут свой класс, они появятся здесь для контроля и выдачи заданий!
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {students.map(st => (
            <div
              key={st.id}
              className={`card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border ${
                st.is_banned ? 'border-rose-500/50 bg-rose-950/20' : 'border-white/10'
              }`}
            >
              {/* Инфо ученика */}
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="text-3xl shrink-0">{st.avatar || '🧑‍🎓'}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-white text-sm sm:text-base truncate">{st.name}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600/25 border border-blue-400/30 text-blue-200 text-[11px] font-bold">
                      {st.class_name || 'Без класса'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">@{st.username}</span>

                    {st.is_banned ? (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black">
                        🔨 БАН: {st.ban_reason}
                      </span>
                    ) : null}

                    {st.warnings_count > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        ⚠️ Предупреждений: {st.warnings_count}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>Ур. <strong className="text-purple-300">{st.level}</strong> ({st.xp} XP)</span>
                    <span>Тестов: <strong className="text-white">{st.total_tests || 0}</strong></span>
                    <span>Точность: <strong className="text-emerald-400">{Math.round(st.avg_accuracy || 0)}%</strong></span>
                    <span className={st.total_tab_switches > 0 ? 'text-rose-400 font-bold' : ''}>
                      Выходов/вкладок: <strong>{st.total_tab_switches || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Кнопки модерации и личного задания */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    sounds.click();
                    setAssignTarget(st);
                    setAssignTitle(`Задание для ${st.name}`);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-bold transition-all"
                  title="Выдать индивидуальное задание"
                >
                  📝 Задание
                </button>

                <button
                  onClick={() => { sounds.click(); setWarnTarget(st); }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-600 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold transition-all"
                  title="Выдать предупреждение"
                >
                  ⚠️ Пред
                </button>

                <button
                  onClick={() => {
                    sounds.click();
                    setEditTarget(st);
                    setEditName(st.name);
                    setEditClass(st.class_name || '');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200 text-xs font-bold"
                  title="Изменить никнейм или перевести в другой класс"
                >
                  ✏️
                </button>

                {st.is_banned ? (
                  <button
                    onClick={() => handleUnban(st.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white text-xs font-bold"
                  >
                    ✅ Разбан
                  </button>
                ) : (
                  <button
                    onClick={() => { sounds.click(); setBanTarget(st); }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold"
                    title="Забанить за никнейм или списывание"
                  >
                    🔨 Бан
                  </button>
                )}

                <button
                  onClick={() => handleDeleteStudent(st)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-rose-700 border border-white/10 text-gray-400 hover:text-white text-xs font-bold"
                  title="Удалить ученика из базы"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛКА ПРЕДУПРЕЖДЕНИЯ */}
      {warnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleSendWarn} className="card max-w-md w-full p-6 space-y-4 border-amber-500/50 bg-[#141428]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-amber-300">⚠️ Предупреждение: {warnTarget.name}</h3>
              <button type="button" onClick={() => setWarnTarget(null)} className="text-gray-400">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Смените никнейм на реальные Фамилию и Имя!',
                'Предупреждение за переключение вкладок на контрольной.',
                'Выполните назначенные задания до конца недели.',
              ].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setWarnReason(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-200 hover:bg-amber-900/60"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              className="input-field text-xs"
              value={warnReason}
              onChange={e => setWarnReason(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600">
              ⚠️ Отправить предупреждение ученику
            </button>
          </form>
        </div>
      )}

      {/* МОДАЛКА БАНА */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleBan} className="card max-w-md w-full p-6 space-y-4 border-rose-500/60 bg-[#141428]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-rose-400">🔨 Забанить: {banTarget.name}</h3>
              <button type="button" onClick={() => setBanTarget(null)} className="text-gray-400">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Недопустимый / нецензурный никнейм',
                'Фейковый аккаунт / чужое имя',
                'Систематическое списывание и обход античита',
              ].map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBanReason(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-200 hover:bg-rose-900/60"
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              className="input-field text-xs"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-black bg-gradient-to-r from-red-600 to-rose-700">
              🔨 Заблокировать вход в аккаунт
            </button>
          </form>
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ КЛАССА / ИМЕНИ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleEditSave} className="card max-w-sm w-full p-6 space-y-4 border-purple-500/50 bg-[#141428]">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-white">✏️ Редактировать профиль</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="text-gray-400">✕</button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ФИО ученика</label>
              <input type="text" required className="input-field text-xs py-2" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Класс (например: 9Б)</label>
              <input type="text" required className="input-field text-xs py-2" value={editClass} onChange={e => setEditClass(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-bold">Сохранить изменения</button>
          </form>
        </div>
      )}

      {/* МОДАЛКА ИНДИВИДУАЛЬНОГО ЗАДАНИЯ */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleCreateIndividualAssignment} className="card max-w-lg w-full p-6 space-y-4 border-emerald-500/50 bg-[#141428]">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-emerald-300">
                📝 Индивидуальное задание: {assignTarget.name} ({assignTarget.class_name})
              </h3>
              <button type="button" onClick={() => setAssignTarget(null)} className="text-gray-400">✕</button>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Название задания</label>
              <input type="text" required className="input-field text-xs py-2" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'variant', label: 'Вариант №' },
                { id: 'custom_oge', label: 'Номера ОГЭ' },
                { id: 'topic', label: 'Тема правил' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAssignMode(m.id)}
                  className={`py-2 rounded-xl text-xs font-bold border ${assignMode === m.id ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {assignMode === 'variant' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Номер варианта ОГЭ (как на Решу ОГЭ)</label>
                <input type="number" className="input-field text-xs py-2" value={assignVariantId} onChange={e => setAssignVariantId(e.target.value)} />
              </div>
            )}

            {assignMode === 'custom_oge' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Выберите номера заданий ОГЭ (2–12):</label>
                <div className="flex flex-wrap gap-1.5">
                  {OGE_CATEGORIES.map(c => {
                    const active = assignSelectedLines.includes(c.num);
                    return (
                      <button
                        key={c.num}
                        type="button"
                        onClick={() => setAssignSelectedLines(prev =>
                          prev.includes(c.num) ? prev.filter(x => x !== c.num) : [...prev, c.num].sort((a, b) => a - b)
                        )}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                      >
                        №{c.num}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {assignMode === 'topic' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Тема тренажёра:</label>
                <select className="input-field text-xs py-2 bg-slate-900" value={assignTopicId} onChange={e => setAssignTopicId(e.target.value)}>
                  {PAMYATKI.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Срок сдачи (опционально)</label>
              <input type="text" className="input-field text-xs py-2" placeholder="Например: До 30 ноября" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <input type="checkbox" checked={assignStrict} onChange={e => setAssignStrict(e.target.checked)} className="accent-purple-500 w-4 h-4" />
              <span>🛡️ Строгий античит (полный экран + детект выхода)</span>
            </label>

            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-black">
              📤 Назначить ученику
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ЦЕНТР ЗАДАНИЙ (ДЛЯ УЧИТЕЛЯ И ДЛЯ УЧЕНИКА)
// =============================================================================
export function AssignmentsHubPage({ store, onLaunchAssignment }) {
  const { state } = store;
  const user = state.user;
  const isTeacher = user?.role === 'teacher';

  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Форма создания (для учителя)
  const [title, setTitle] = useState('Контрольный вариант ОГЭ');
  const [targetType, setTargetType] = useState('class'); // class | student | all
  const [targetClass, setTargetClass] = useState('9Б');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [variantId, setVariantId] = useState('2026');
  const [dueDate, setDueDate] = useState('');
  const [strictAnticheat, setStrictAnticheat] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const [r1, r2, r3] = await Promise.all([
          fetch('/api/teacher/assignments'),
          fetch('/api/classes'),
          fetch('/api/teacher/students?status=active'),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        const d3 = await r3.json();
        if (d1.assignments) setAssignments(d1.assignments);
        if (d2.classes) setClasses(d2.classes);
        if (d3.students) {
          setStudents(d3.students);
          if (d3.students[0] && !targetStudentId) setTargetStudentId(String(d3.students[0].id));
        }
      } else if (user?.id) {
        const res = await fetch(`/api/student/${user.id}/assignments`);
        const d = await res.json();
        if (d.assignments) setAssignments(d.assignments);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [user?.id, isTeacher]);

  const handleCreate = async (e) => {
    e.preventDefault();
    sounds.levelUp();
    await fetch('/api/teacher/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: `Вариант #${variantId} в стиле Решу ОГЭ`,
        targetType,
        targetClass: targetType === 'class' ? targetClass : '',
        targetStudentId: targetType === 'student' ? Number(targetStudentId) : null,
        mode: 'reshu_oge',
        taskConfig: { variantId },
        questionCount: 11,
        strictAnticheat,
        dueDate,
        createdBy: user?.id || 1,
        createdByName: user?.name || 'Учитель',
      }),
    });
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить это задание?')) return;
    sounds.click();
    await fetch(`/api/teacher/assignments/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {isTeacher ? '📋 Управление заданиями (Классы и личные)' : '📌 Мои задания от учителя'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          {isTeacher
            ? 'Создавайте варианты ОГЭ для целых классов или конкретных учеников и отслеживайте их честность'
            : 'Обязательные работы, назначенные вашим учителем'}
        </p>
      </div>

      {/* Конструктор выдачи задания (Учитель) */}
      {isTeacher && (
        <form onSubmit={handleCreate} className="card p-5 sm:p-6 space-y-4 border-emerald-500/35">
          <h2 className="text-base font-black text-emerald-300">➕ Выдать новое задание</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              required
              className="input-field py-2 text-xs"
              placeholder="Название (например, Срез 9Б)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <select
              className="input-field py-2 text-xs bg-slate-900"
              value={targetType}
              onChange={e => setTargetType(e.target.value)}
            >
              <option value="class">🏫 Классу целиком</option>
              <option value="student">👤 Лично ученику</option>
              <option value="all">🌍 Всей школе</option>
            </select>

            {targetType === 'class' ? (
              <select
                className="input-field py-2 text-xs bg-slate-900"
                value={targetClass}
                onChange={e => setTargetClass(e.target.value)}
              >
                {classes.map(c => <option key={c.name} value={c.name}>{c.name} ({c.student_count} уч.)</option>)}
              </select>
            ) : targetType === 'student' ? (
              <select
                className="input-field py-2 text-xs bg-slate-900"
                value={targetStudentId}
                onChange={e => setTargetStudentId(e.target.value)}
              >
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>)}
              </select>
            ) : (
              <div className="input-field py-2 text-xs text-gray-400">Для всех классов</div>
            )}

            <input
              type="number"
              className="input-field py-2 text-xs"
              placeholder="№ Варианта ОГЭ"
              value={variantId}
              onChange={e => setVariantId(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                className="input-field py-1.5 text-xs w-48"
                placeholder="Дедлайн (до 30.11)"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                <input type="checkbox" checked={strictAnticheat} onChange={e => setStrictAnticheat(e.target.checked)} className="accent-purple-500 w-4 h-4" />
                <span>🛡️ Строгий античит (полный экран + детект выхода)</span>
              </label>
            </div>
            <button type="submit" className="btn-primary text-xs py-2.5 px-5 font-black">
              📤 Выдать задание
            </button>
          </div>
        </form>
      )}

      {/* Список заданий */}
      {loading ? (
        <div className="card p-8 text-center text-gray-400 text-sm">Загрузка заданий...</div>
      ) : assignments.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          {isTeacher ? 'Заданий ещё не создано.' : 'У вас пока нет активных заданий от учителя — можно свободно решать Решу ОГЭ! 🎉'}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const comp = a.completion;
            const grade = comp ? convertPercentToSchoolGrade(comp.accuracy) : null;
            return (
              <div key={a.id} className="card p-5 space-y-3 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-white text-base">{a.title}</h3>
                      {a.target_type === 'student' ? (
                        <span className="badge bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[11px]">
                          👤 Личное {a.target_student_name ? `(${a.target_student_name})` : ''}
                        </span>
                      ) : a.target_type === 'class' ? (
                        <span className="badge bg-blue-600/30 text-blue-200 border border-blue-500/40 text-[11px]">
                          🏫 Класс {a.target_class}
                        </span>
                      ) : (
                        <span className="badge bg-emerald-600/30 text-emerald-200 text-[11px]">🌍 Все классы</span>
                      )}

                      {a.strict_anticheat ? (
                        <span className="badge bg-rose-950/60 text-rose-300 border border-rose-500/30 text-[10px]">
                          🛡️ Полный экран + Античит
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-400">
                      Вопросов: {a.question_count}
                      {a.due_date ? ` • Срок: ${a.due_date}` : ''}
                      {a.created_by_name ? ` • Выдал: ${a.created_by_name}` : ''}
                    </div>
                  </div>

                  {isTeacher ? (
                    <button onClick={() => handleDelete(a.id)} className="btn-secondary text-xs py-1.5 px-3 text-rose-300 border-rose-500/30 self-start">
                      🗑️ Удалить
                    </button>
                  ) : (
                    <div className="shrink-0">
                      {comp ? (
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-xl border text-xs font-black ${grade.bg} ${grade.color}`}>
                            ✅ Выполнено: {comp.score}/{comp.total} ({comp.accuracy}%) · {grade.text}
                          </span>
                          <button
                            onClick={() => onLaunchAssignment(a)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            Пересдать
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onLaunchAssignment(a)}
                          className="btn-primary text-xs py-2.5 px-5 font-black"
                        >
                          🚀 Решить сейчас ➜
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Таблица выполнений для учителя */}
                {isTeacher && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs font-bold text-gray-400 mb-2">
                      Сдали: {(a.completions || []).length} чел.
                    </div>
                    {(a.completions || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.completions.map((c, ci) => (
                          <div key={ci} className="px-3 py-1.5 rounded-xl bg-black/35 border border-white/10 text-xs flex items-center gap-2">
                            <span className="font-bold text-white">{c.student_name}</span>
                            <span className="text-gray-400">({c.class_name})</span>
                            <span className="font-mono text-emerald-400 font-bold">{c.score}/{c.total} ({c.accuracy}%)</span>
                            <span>{c.cheat_status === 'CLEAN' ? '🟢' : '🔴'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ЖИВОЙ РЕЙТИНГ КЛАССА И ШКОЛЫ
// =============================================================================
export function LeaderboardPage({ store }) {
  const user = store.state.user;
  const [leaders, setLeaders] = useState([]);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState(user?.class_name || 'all');

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => { if (d.classes) setClasses(d.classes); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/leaderboard?className=${encodeURIComponent(className)}`)
      .then(r => r.json())
      .then(d => { if (d.leaders) setLeaders(d.leaders); })
      .catch(() => {});
  }, [className]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">🏆 Рейтинг класса и школы</h1>
          <p className="text-xs sm:text-sm text-gray-400">Только реальные ученики без заблокированных и фейковых аккаунтов</p>
        </div>

        <select
          className="input-field py-2 text-xs bg-slate-900 max-w-[200px]"
          value={className}
          onChange={e => setClassName(e.target.value)}
        >
          <option value="all">🌍 Вся школа</option>
          {classes.map(c => <option key={c.name} value={c.name}>🏫 Класс {c.name}</option>)}
        </select>
      </div>

      {leaders.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          В этом классе пока нет зарегистрированных учеников. Будь первым! 🚀
        </div>
      ) : (
        <div className="space-y-2.5">
          {leaders.map((l, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            const isMe = l.id === user?.id;
            return (
              <div
                key={l.id}
                className={`card p-4 flex items-center justify-between gap-3 ${
                  isMe ? 'border-purple-500 bg-purple-950/30' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 text-center font-black text-lg shrink-0">{medal}</div>
                  <div className="text-2xl shrink-0">{l.avatar || '🧑‍🎓'}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                      <span>{l.name}</span>
                      {l.class_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/30 text-blue-200">{l.class_name}</span>
                      )}
                      {l.violations === 0 && l.total_tests > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          🛡️ Честный
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Ур. {l.level} · Тестов: {l.total_tests} · Ср. точность: {Math.round(l.avg_accuracy || 0)}%
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-purple-300 text-sm">{l.xp} XP</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
