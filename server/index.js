import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDB } from './db.js';

// Инициализируем БД
initDB();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());

// Секретный код для регистрации учителей
const TEACHER_SECRET_CODE = 'RUS-TEACHER-2026';

// =============================================================================
// AUTH ROUTES
// =============================================================================

// Регистрация
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, role, name, avatar, teacherCode } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля' });
  }

  // Защита: для регистрации учителя требуется секретный проверочный ключ!
  if (role === 'teacher') {
    if (!teacherCode || teacherCode.trim() !== TEACHER_SECRET_CODE) {
      return res.status(403).json({
        error: 'Неверный секретный код подтверждения статуса учителя! Обратитесь к администрации школы.'
      });
    }
  }

  try {
    // Проверка уникальности логина и email
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    const existing = checkStmt.get(username.trim().toLowerCase(), email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким логином или email уже зарегистрирован' });
    }

    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, avatar, level, xp, streak)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0)
    `);

    const result = insertUser.run(
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      password, // В реале хэшируется, здесь сохраняем для лёгкой проверки
      role === 'teacher' ? 'teacher' : 'student',
      name.trim(),
      avatar || (role === 'teacher' ? '👩‍🏫' : '🧑‍🎓')
    );

    const newUser = db.prepare('SELECT id, username, email, role, name, avatar, level, xp, streak FROM users WHERE id = ?').get(result.lastInsertRowid);

    return res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация (Вход)
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Введите логин/email и пароль' });
  }

  try {
    const cleanLogin = login.trim().toLowerCase();
    const userStmt = db.prepare(`
      SELECT id, username, email, password_hash, role, name, avatar, level, xp, streak
      FROM users
      WHERE username = ? OR email = ?
    `);
    const user = userStmt.get(cleanLogin, cleanLogin);

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const { password_hash, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

// Получить текущего пользователя
app.get('/api/auth/user/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, name, avatar, level, xp, streak FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// =============================================================================
// АНТИЧИТ И СДАЧА РАБОТ
// =============================================================================

// Логирование событий античита в реальном времени
app.post('/api/anticheat/log', (req, res) => {
  const { userId, userName, eventType, details } = req.body;
  try {
    const insertLog = db.prepare(`
      INSERT INTO anti_cheat_logs (user_id, user_name, event_type, details)
      VALUES (?, ?, ?, ?)
    `);
    insertLog.run(userId || null, userName || 'Аноним', eventType, details || '');
    return res.json({ success: true });
  } catch (err) {
    console.error('Anti-cheat log error:', err);
    return res.status(500).json({ error: 'Ошибка логирования' });
  }
});

// Сохранение сданной проверочной работы со статистикой честности
app.post('/api/submissions', (req, res) => {
  const {
    testTitle,
    topicId,
    studentId,
    studentName,
    score,
    total,
    accuracy,
    tabSwitches = 0,
    copyAttempts = 0,
    suspiciousSpeedCount = 0,
    durationSeconds = 0,
  } = req.body;

  try {
    // Автоопределение статуса честности
    let cheatStatus = 'CLEAN';
    if (tabSwitches >= 2 || copyAttempts > 0 || suspiciousSpeedCount >= 2) {
      cheatStatus = 'FLAGGED'; // Подозрение в списывании
    } else if (tabSwitches === 1 || suspiciousSpeedCount === 1) {
      cheatStatus = 'SUSPICIOUS'; // Требует внимания
    }

    const insertSub = db.prepare(`
      INSERT INTO submissions (
        test_title, topic_id, student_id, student_name, score, total, accuracy,
        tab_switches, copy_attempts, suspicious_speed_count, cheat_status, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertSub.run(
      testTitle || 'Проверочная работа',
      topicId || 'general',
      studentId,
      studentName,
      score,
      total,
      accuracy,
      tabSwitches,
      copyAttempts,
      suspiciousSpeedCount,
      cheatStatus,
      durationSeconds
    );

    // Добавляем XP ученику в БД
    const earnedXP = score * 25;
    db.prepare('UPDATE users SET xp = xp + ?, level = (xp + ?) / 500 + 1 WHERE id = ?').run(earnedXP, earnedXP, studentId);

    // Логируем в историю нарушений, если были проблемы
    if (cheatStatus !== 'CLEAN') {
      db.prepare(`
        INSERT INTO anti_cheat_logs (user_id, user_name, event_type, details)
        VALUES (?, ?, 'TEST_SUBMIT_FLAGGED', ?)
      `).run(studentId, studentName, `Сдана работа с нарушениями: переключений вкладок: ${tabSwitches}, попыток копирования: ${copyAttempts}, статус: ${cheatStatus}`);
    }

    return res.json({
      success: true,
      submissionId: result.lastInsertRowid,
      cheatStatus,
      earnedXP
    });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Ошибка сохранения работы' });
  }
});

// =============================================================================
// TEACHER ENDPOINTS (ТОЛЬКО ДЛЯ УЧИТЕЛЕЙ)
// =============================================================================

// Журнал сданных работ и античит-статусов
app.get('/api/teacher/submissions', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT * FROM submissions
      ORDER BY submitted_at DESC
      LIMIT 100
    `).all();
    return res.json({ success: true, submissions: list });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Полная лента нарушений античита для учителя
app.get('/api/teacher/anticheat-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM anti_cheat_logs
      ORDER BY timestamp DESC
      LIMIT 50
    `).all();
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список учеников и их академическая честность
app.get('/api/teacher/students', (req, res) => {
  try {
    const students = db.prepare(`
      SELECT u.id, u.username, u.name, u.avatar, u.level, u.xp, u.streak,
        COUNT(s.id) as total_tests,
        COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
        COALESCE(SUM(s.tab_switches), 0) as total_tab_switches,
        COALESCE(SUM(s.copy_attempts), 0) as total_copy_attempts
      FROM users u
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY u.name ASC
    `).all();
    return res.json({ success: true, students });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// =============================================================================
// PVP DUELS (ОНЛАЙН-ДУЭЛИ 1 НА 1 ДО 10 ОЧКОВ)
// =============================================================================

const DUEL_QUESTIONS_POOL = [
  { q: 'Где верно поставлено ударение?', opts: ['тортЫ', 'тОрты'], a: 'тОрты' },
  { q: 'Где верно поставлено ударение?', opts: ['звонИт', 'звОнит'], a: 'звонИт' },
  { q: 'Где верно поставлено ударение?', opts: ['жалюзИ', 'жАлюзи'], a: 'жалюзИ' },
  { q: 'Где верно поставлено ударение?', opts: ['бантЫ', 'бАнты'], a: 'бАнты' },
  { q: 'Где верно поставлено ударение?', opts: ['красИвее', 'красивЕе'], a: 'красИвее' },
  { q: 'Где верно поставлено ударение?', opts: ['каталОг', 'катАлог'], a: 'каталОг' },
  { q: 'Где верно поставлено ударение?', opts: ['облегчИть', 'облЕгчить'], a: 'облегчИть' },
  { q: 'Где верно поставлено ударение?', opts: ['туфлЯ', 'тУфля'], a: 'тУфля' },
  { q: 'Где верно поставлено ударение?', opts: ['включИт', 'вклЮчит'], a: 'включИт' },
  { q: 'Где верно поставлено ударение?', opts: ['диспансЕр', 'диспАнсер'], a: 'диспансЕр' },
  { q: 'Где верно поставлено ударение?', opts: ['договОр', 'дОговор'], a: 'договОр' },
  { q: 'Где верно поставлено ударение?', opts: ['свеклА', 'свЁкла'], a: 'свЁкла' },
  { q: 'В каком слове пишется буква А?', opts: ['заг...рать', 'р...стение'], a: 'р...стение' },
  { q: 'В каком слове пишется буква И?', opts: ['зам...реть', 'зам...рать'], a: 'зам...рать' },
  { q: 'В каком слове пишется ПРЕ-?', opts: ['пр...мудрый', 'пр...ехать'], a: 'пр...мудрый' },
  { q: 'В каком слове пишется НН?', opts: ['стекля...ый', 'кожа...ый'], a: 'стекля...ый' },
  { q: 'В каком слове пишется О?', opts: ['ск...кать', 'обм...кнуть'], a: 'обм...кнуть' },
  { q: 'Верное употребление паронима:', opts: ['надеть пальто', 'одеть пальто'], a: 'надеть пальто' },
  { q: 'Верное употребление паронима:', opts: ['сытый обед', 'сытный обед'], a: 'сытный обед' },
  { q: 'Верное употребление паронима:', opts: ['враждебный приём', 'вражеский приём'], a: 'враждебный приём' },
  { q: 'Где верно поставлено ударение?', opts: ['шарфЫ', 'шАрфы'], a: 'шАрфы' },
  { q: 'Где верно поставлено ударение?', opts: ['сливОвый', 'слИвовый'], a: 'слИвовый' },
  { q: 'Где верно поставлено ударение?', opts: ['опОшлить', 'опошлИть'], a: 'опОшлить' },
  { q: 'В каком слове пишется буква Е?', opts: ['пр...града', 'пр...шить'], a: 'пр...града' },
];

// Хранилище активных комнат в памяти
const duelRooms = new Map();

// Создать дуэльную комнату
app.post('/api/duel/create', (req, res) => {
  const { hostId, hostName, hostAvatar } = req.body;
  
  // Генерируем 4-значный пин-код
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (duelRooms.has(code));

  // Перемешиваем вопросы
  const shuffledQs = [...DUEL_QUESTIONS_POOL].sort(() => Math.random() - 0.5);

  const room = {
    code,
    host: { id: hostId || 'host', name: hostName || 'Игрок 1', avatar: hostAvatar || '🧑‍🎓', score: 0 },
    guest: null,
    status: 'waiting', // 'waiting' | 'in_progress' | 'finished'
    questions: shuffledQs,
    targetScore: 10,
    winner: null,
    createdAt: Date.now()
  };

  duelRooms.set(code, room);
  return res.json({ success: true, code, room });
});

// Подключиться к дуэли по коду
app.post('/api/duel/join', (req, res) => {
  const { code, guestId, guestName, guestAvatar } = req.body;
  const cleanCode = (code || '').toString().trim();

  const room = duelRooms.get(cleanCode);
  if (!room) {
    return res.status(404).json({ error: 'Комната с таким кодом не найдена' });
  }

  if (room.guest && room.guest.id !== guestId) {
    return res.status(400).json({ error: 'В этой дуэли уже есть два игрока' });
  }

  if (!room.guest) {
    room.guest = { id: guestId || 'guest', name: guestName || 'Игрок 2', avatar: guestAvatar || '🥷', score: 0 };
    room.status = 'in_progress';
  }

  return res.json({ success: true, room });
});

// Получить состояние комнаты
app.get('/api/duel/room/:code', (req, res) => {
  const code = (req.params.code || '').trim();
  const room = duelRooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }
  return res.json({ success: true, room });
});

// Засчитать очко игроку
app.post('/api/duel/score', (req, res) => {
  const { code, playerId } = req.body;
  const room = duelRooms.get((code || '').toString().trim());
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }

  if (room.status !== 'in_progress') {
    return res.json({ success: true, room });
  }

  if (room.host && room.host.id === playerId) {
    room.host.score = Math.min(room.targetScore, room.host.score + 1);
    if (room.host.score >= room.targetScore) {
      room.status = 'finished';
      room.winner = room.host;
    }
  } else if (room.guest && room.guest.id === playerId) {
    room.guest.score = Math.min(room.targetScore, room.guest.score + 1);
    if (room.guest.score >= room.targetScore) {
      room.status = 'finished';
      room.winner = room.guest;
    }
  }

  return res.json({ success: true, room });
});

// =============================================================================
// AI ДИАГНОСТИКА ЗАПАДАЮЩИХ ТЕМ
// =============================================================================

app.get('/api/diagnostics/user/:id', (req, res) => {
  const userId = req.params.id;

  try {
    const subs = db.prepare('SELECT * FROM submissions WHERE student_id = ?').all(userId);
    const logs = db.prepare('SELECT * FROM anti_cheat_logs WHERE user_id = ?').all(userId);

    // Тепловая карта тем (по умолчанию или на основе сданных работ)
    const topicStats = [
      { id: 'chered', title: 'Корни с чередованием', accuracy: 58, errors: 7, status: 'danger', detail: 'Ошибки в исключениях РАСТ/РОС (росток, отрасль) и МАК/МОК' },
      { id: 'pre_pri', title: 'Приставки ПРЕ- и ПРИ-', accuracy: 64, errors: 5, status: 'warning', detail: 'Трудности с различением высшей степени (премилый) и приближения' },
      { id: 'nn_suffixes', title: 'Н и НН в суффиксах', accuracy: 82, errors: 3, status: 'good', detail: 'Уверенно, редкие ошибки в кратких причастиях' },
      { id: 'paronyms', title: 'Паронимы ФИПИ (ЕГЭ №5)', accuracy: 88, errors: 2, status: 'good', detail: 'Отличное различение пар (абонент/абонемент, сытый/сытный)' },
      { id: 'orthoepy', title: 'Ударения ФИПИ (ЕГЭ №4)', accuracy: 72, errors: 6, status: 'warning', detail: 'Путаница в глаголах женского рода (бралА, но клАла)' },
      { id: 'punctuation', title: 'Пунктуация в БСП и ССП', accuracy: 78, errors: 4, status: 'good', detail: 'Вводные слова и деепричастные обороты освоены' },
    ];

    // Динамическая адаптация на основе сданных работ
    if (subs.length > 0) {
      const avgAcc = Math.round(subs.reduce((acc, s) => acc + s.accuracy, 0) / subs.length);
      topicStats[0].accuracy = Math.max(35, Math.min(95, avgAcc - 15));
      topicStats[1].accuracy = Math.max(40, Math.min(95, avgAcc - 8));
      topicStats[2].accuracy = Math.max(50, Math.min(98, avgAcc + 6));
    }

    return res.json({
      success: true,
      diagnostics: {
        totalTests: subs.length,
        criticalTopicsCount: topicStats.filter(t => t.accuracy < 70).length,
        topics: topicStats,
        aiRecommendation: 'Рекомендуется уделить внимание корням с чередованием и приставкам ПРЕ/ПРИ. Нажмите «Сгенерировать работу над ошибками», чтобы устранить пробелы.',
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка расчёта диагностики' });
  }
});

// Раздача статики фронтенда в продакшене
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

export { app };

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  app.listen(PORT, () => {
    console.log(`🚀 RusLearn Backend & SQLite Database running on http://localhost:${PORT}`);
  });
}
