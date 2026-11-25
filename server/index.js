import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDB, normalizeClassInfo, DB_LOCATION } from './db.js';

// Инициализируем БД и миграции
initDB();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: 'text/plain', limit: '2mb' }));

// Секретный код для регистрации учителей (можно переопределить через ENV)
const TEACHER_SECRET_CODE = process.env.TEACHER_SECRET_CODE || 'RUS-TEACHER-2026';

// =============================================================================
// ФИЛЬТР НЕЦЕНЗУРНЫХ И НЕКОРРЕКТНЫХ НИКНЕЙМОВ
// =============================================================================
const BAD_NICK_PATTERNS = [
  /х[уy][йяюеёи]/i,
  /п[ие]зд/i,
  /бл[яе][тд]?/i,
  /[её]б[ауоыи]/i,
  /с[уy]ч?[кч]/i,
  /п[ие]д[оа]?р/i,
  /м[уy]д[ао]/i,
  /г[ао]нд[оа]н/i,
  /шл[юу]х/i,
  /ж[оа]п/i,
  /д[еи]б[ие]л/i,
  /fuck|shit|bitch|dick|pussy|whore|slut|cunt|nigg|penis|porno|sex69/i,
  /^(admin|админ|тест|test|user\d*|qwerty|asdf|12345)$/i,
];

function validateNickname(username, name) {
  const cleanUser = (username || '').trim();
  const cleanName = (name || '').trim();

  if (cleanName.length < 2 || cleanUser.length < 3) {
    return 'Имя должно содержать минимум 2 символа, логин — минимум 3 символа.';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
    return 'Логин может содержать только латинские буквы, цифры и символы _ . -';
  }
  const partsToCheck = [cleanUser, cleanName, ...cleanName.split(/\s+/)];
  for (const part of partsToCheck) {
    for (const rx of BAD_NICK_PATTERNS) {
      if (rx.test(part)) {
        return 'Никнейм нарушает правила платформы! Укажите реальные Фамилию и Имя (за фейковые ники выдаётся бан).';
      }
    }
  }
  return null;
}

function getSafeUserWithWarnings(userId) {
  const user = db.prepare(`
    SELECT id, username, email, role, name, class_name, grade_num, avatar, level, xp, streak,
           is_banned, ban_reason, warnings_count, last_active, created_at
    FROM users WHERE id = ?
  `).get(userId);
  if (!user) return null;

  const warnings = db.prepare(`
    SELECT id, teacher_name, reason, is_read, created_at
    FROM warnings
    WHERE user_id = ? AND is_read = 0
    ORDER BY created_at DESC
  `).all(userId);

  return { ...user, warnings };
}

// Healthcheck для облака без VPN (Amvera / Timeweb / Docker)
app.get('/api/health', (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    res.json({ ok: true, dbPath: DB_LOCATION, users: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// AUTH & SECURITY ROUTES
// =============================================================================

// Список классов школы
app.get('/api/classes', (req, res) => {
  try {
    const classes = db.prepare(`
      SELECT c.id, c.name, c.grade_num, c.code,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'student' AND u.class_name = c.name AND u.is_banned = 0) as student_count,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'student' AND u.class_name = c.name AND u.is_banned = 1) as banned_count
      FROM classes c
      ORDER BY c.grade_num ASC, c.name ASC
    `).all();
    return res.json({ success: true, classes });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки классов' });
  }
});

// Регистрация
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, role, name, className, avatar, teacherCode } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Заполните Имя/Фамилию, логин и пароль' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 4 символов' });
  }

  const nickError = validateNickname(username, name);
  if (nickError) {
    return res.status(400).json({ error: nickError });
  }

  const targetRole = role === 'teacher' ? 'teacher' : 'student';

  if (targetRole === 'teacher') {
    if (!teacherCode || teacherCode.trim() !== TEACHER_SECRET_CODE) {
      return res.status(403).json({
        error: 'Неверный секретный код учителя! Запросите ключ у руководителя школы.'
      });
    }
  } else if (!className || !className.trim()) {
    return res.status(400).json({ error: 'Выберите или укажите свой класс (например: 9Б)' });
  }

  try {
    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = (email && email.trim() ? email.trim().toLowerCase() : `${cleanUser}@school.ruslearn`);

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUser, cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Этот логин или email уже занят' });
    }

    const clsInfo = targetRole === 'teacher'
      ? { className: 'Учитель', gradeNum: 0 }
      : normalizeClassInfo(className);

    // Если ученик ввёл новый класс (например 9Г), автоматически добавляем его в таблицу classes
    if (targetRole === 'student' && clsInfo.className) {
      db.prepare('INSERT OR IGNORE INTO classes (name, grade_num, code, teacher_id) VALUES (?, ?, ?, 1)')
        .run(clsInfo.className, clsInfo.gradeNum, `CLS-${clsInfo.className}`);
    }

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, class_name, grade_num, avatar, level, xp, streak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)
    `).run(
      cleanUser,
      cleanEmail,
      password,
      targetRole,
      name.trim(),
      clsInfo.className,
      clsInfo.gradeNum,
      avatar || (targetRole === 'teacher' ? '👩‍🏫' : '🧑‍🎓')
    );

    const newUser = getSafeUserWithWarnings(result.lastInsertRowid);
    return res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Введите логин (или email) и пароль' });
  }

  try {
    const cleanLogin = login.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, password_hash, is_banned, ban_reason
      FROM users
      WHERE username = ? OR email = ?
    `).get(cleanLogin, cleanLogin);

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (user.is_banned) {
      return res.status(403).json({
        banned: true,
        reason: user.ban_reason || 'Нарушение правил платформы',
        error: `Аккаунт заблокирован учителем. Причина: ${user.ban_reason || 'Нарушение правил'}`
      });
    }

    db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const fullUser = getSafeUserWithWarnings(user.id);
    return res.json({ success: true, user: fullUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Обновление профиля/статуса (проверка бана и новых предупреждений в реальном времени)
app.get('/api/auth/user/:id', (req, res) => {
  try {
    const user = getSafeUserWithWarnings(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден', deleted: true });
    db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Смена пароля (учитель/ученик)
app.post('/api/auth/change-password', (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !oldPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Новый пароль должен быть минимум 4 символа' });
  }
  try {
    const u = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId);
    if (!u || u.password_hash !== oldPassword) {
      return res.status(403).json({ error: 'Текущий пароль указан неверно' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPassword, userId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

// Подтвердить прочтение предупреждения
app.post('/api/warnings/:id/ack', (req, res) => {
  try {
    db.prepare('UPDATE warnings SET is_read = 1 WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// =============================================================================
// АНТИЧИТ И СДАЧА РАБОТ (ПОДДЕРЖКА SEND_BEACON ПРИ ВЫХОДЕ ИЗ БРАУЗЕРА)
// =============================================================================

app.post('/api/anticheat/log', (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { userId, userName, className, eventType, details } = body || {};
  if (!eventType) return res.json({ success: false });

  try {
    let resolvedClass = className || '';
    if (userId && !resolvedClass) {
      const u = db.prepare('SELECT class_name FROM users WHERE id = ?').get(userId);
      if (u) resolvedClass = u.class_name || '';
    }

    db.prepare(`
      INSERT INTO anti_cheat_logs (user_id, user_name, class_name, event_type, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId || null, userName || 'Аноним', resolvedClass, eventType, details || '');

    return res.json({ success: true });
  } catch (err) {
    console.error('Anti-cheat log error:', err);
    return res.status(500).json({ error: 'Ошибка логирования' });
  }
});

app.post('/api/submissions', (req, res) => {
  const {
    testTitle,
    topicId,
    studentId,
    studentName,
    className,
    assignmentId,
    variantId,
    score,
    total,
    accuracy,
    tabSwitches = 0,
    copyAttempts = 0,
    suspiciousSpeedCount = 0,
    durationSeconds = 0,
    hadBrowserExit = false,
  } = req.body;

  try {
    let resolvedClass = className || '';
    if (studentId && !resolvedClass) {
      const u = db.prepare('SELECT class_name FROM users WHERE id = ?').get(studentId);
      if (u) resolvedClass = u.class_name || '';
    }

    let cheatStatus = 'CLEAN';
    if (hadBrowserExit || tabSwitches >= 2 || copyAttempts > 0 || suspiciousSpeedCount >= 2) {
      cheatStatus = 'FLAGGED';
    } else if (tabSwitches === 1 || suspiciousSpeedCount === 1) {
      cheatStatus = 'SUSPICIOUS';
    }

    const result = db.prepare(`
      INSERT INTO submissions (
        test_title, topic_id, student_id, student_name, class_name, assignment_id, variant_id,
        score, total, accuracy, tab_switches, copy_attempts, suspicious_speed_count, cheat_status, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testTitle || 'Проверочная работа',
      topicId || 'general',
      studentId,
      studentName,
      resolvedClass,
      assignmentId || null,
      variantId ? String(variantId) : null,
      score,
      total,
      accuracy,
      tabSwitches,
      copyAttempts,
      suspiciousSpeedCount,
      cheatStatus,
      durationSeconds
    );

    const earnedXP = Math.max(5, score * 20);
    if (studentId) {
      const u = db.prepare('SELECT xp FROM users WHERE id = ?').get(studentId);
      const nextXp = (u?.xp || 0) + earnedXP;
      const nextLvl = Math.floor(nextXp / 500) + 1;
      db.prepare('UPDATE users SET xp = ?, level = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
        .run(nextXp, nextLvl, studentId);
    }

    if (assignmentId && studentId) {
      db.prepare(`
        INSERT INTO assignment_completions (assignment_id, student_id, submission_id, score, total, accuracy, cheat_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(assignmentId, studentId, result.lastInsertRowid, score, total, accuracy, cheatStatus);
    }

    if (cheatStatus !== 'CLEAN') {
      db.prepare(`
        INSERT INTO anti_cheat_logs (user_id, user_name, class_name, event_type, details)
        VALUES (?, ?, ?, 'TEST_SUBMIT_FLAGGED', ?)
      `).run(
        studentId,
        studentName,
        resolvedClass,
        `Работа «${testTitle}»: выходов/переключений: ${tabSwitches}, копирований: ${copyAttempts}${hadBrowserExit ? ', был выход из браузера' : ''}, статус: ${cheatStatus}`
      );
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

// Прогресс по банку заданий (Решу ОГЭ/ЕГЭ) + Избранное
app.get('/api/user/:id/task-progress', (req, res) => {
  try {
    const rows = db.prepare('SELECT task_key, is_solved, is_correct, is_favorite FROM user_task_progress WHERE user_id = ?').all(req.params.id);
    const map = {};
    rows.forEach(r => { map[r.task_key] = r; });
    return res.json({ success: true, progress: map });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки прогресса' });
  }
});

app.post('/api/user/:id/task-progress', (req, res) => {
  const userId = req.params.id;
  const { taskKey, isSolved, isCorrect, isFavorite } = req.body;
  if (!taskKey) return res.status(400).json({ error: 'taskKey обязателен' });

  try {
    const cur = db.prepare('SELECT * FROM user_task_progress WHERE user_id = ? AND task_key = ?').get(userId, taskKey);
    const nextSolved = isSolved !== undefined ? (isSolved ? 1 : 0) : (cur?.is_solved || 0);
    const nextCorrect = isCorrect !== undefined ? (isCorrect ? 1 : 0) : (cur?.is_correct || 0);
    const nextFav = isFavorite !== undefined ? (isFavorite ? 1 : 0) : (cur?.is_favorite || 0);

    db.prepare(`
      INSERT INTO user_task_progress (user_id, task_key, is_solved, is_correct, is_favorite, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, task_key) DO UPDATE SET
        is_solved = excluded.is_solved,
        is_correct = excluded.is_correct,
        is_favorite = excluded.is_favorite,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, taskKey, nextSolved, nextCorrect, nextFav);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сохранения прогресса задания' });
  }
});

// Мои последние сдачи (для ученика)
app.get('/api/student/:id/submissions', (req, res) => {
  try {
    const submissions = db.prepare(`
      SELECT * FROM submissions WHERE student_id = ? ORDER BY submitted_at DESC LIMIT 50
    `).all(req.params.id);
    return res.json({ success: true, submissions });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки сдач' });
  }
});

// =============================================================================
// ПАНЕЛЬ УЧИТЕЛЯ: КЛАССЫ, СОРТИРОВКА, БАН, ПРЕДУПРЕЖДЕНИЯ, ЧИСТКА
// =============================================================================

// Добавить новый класс
app.post('/api/teacher/classes', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите название класса' });
  const cls = normalizeClassInfo(name);
  try {
    db.prepare('INSERT OR IGNORE INTO classes (name, grade_num, code, teacher_id) VALUES (?, ?, ?, 1)')
      .run(cls.className, cls.gradeNum, `CLS-${cls.className}`);
    return res.json({ success: true, classInfo: cls });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка создания класса' });
  }
});

// Удалить класс
app.delete('/api/teacher/classes/:name', (req, res) => {
  try {
    db.prepare('DELETE FROM classes WHERE name = ?').run(req.params.name);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка удаления класса' });
  }
});

// Список учеников с фильтрацией по классам, поиском и гибкой сортировкой
app.get('/api/teacher/students', (req, res) => {
  const { className = 'all', sortBy = 'grade', search = '', status = 'all' } = req.query;

  try {
    let where = ["u.role = 'student'"];
    const params = [];

    if (className && className !== 'all') {
      where.push('u.class_name = ?');
      params.push(className);
    }
    if (status === 'banned') {
      where.push('u.is_banned = 1');
    } else if (status === 'active') {
      where.push('u.is_banned = 0');
    }
    if (search && search.trim()) {
      where.push('(LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.class_name) LIKE ?)');
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s, s);
    }

    let orderClause = 'u.grade_num ASC, u.class_name ASC, u.name ASC';
    if (sortBy === 'name') orderClause = 'u.name ASC';
    else if (sortBy === 'accuracy') orderClause = 'avg_accuracy DESC, total_tests DESC';
    else if (sortBy === 'xp') orderClause = 'u.xp DESC';
    else if (sortBy === 'violations') orderClause = 'total_tab_switches DESC, total_copy_attempts DESC';
    else if (sortBy === 'tests') orderClause = 'total_tests DESC';
    else if (sortBy === 'recent') orderClause = 'u.created_at DESC';

    const sql = `
      SELECT u.id, u.username, u.email, u.name, u.class_name, u.grade_num, u.avatar, u.level, u.xp, u.streak,
        u.is_banned, u.ban_reason, u.warnings_count, u.last_active, u.created_at,
        COUNT(DISTINCT s.id) as total_tests,
        COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
        COALESCE(SUM(s.tab_switches), 0) as total_tab_switches,
        COALESCE(SUM(s.copy_attempts), 0) as total_copy_attempts
      FROM users u
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE ${where.join(' AND ')}
      GROUP BY u.id
      ORDER BY ${orderClause}
    `;

    const students = db.prepare(sql).all(...params);
    return res.json({ success: true, students });
  } catch (err) {
    console.error('Students list error:', err);
    return res.status(500).json({ error: 'Ошибка загрузки учеников' });
  }
});

// Изменить имя/ник или класс ученика
app.patch('/api/teacher/students/:id', (req, res) => {
  const { name, className, username } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(req.params.id, 'student');
    if (!existing) return res.status(404).json({ error: 'Ученик не найден' });

    const nextName = name && name.trim() ? name.trim() : existing.name;
    const nextUser = username && username.trim() ? username.trim().toLowerCase() : existing.username;
    const cls = className ? normalizeClassInfo(className) : { className: existing.class_name, gradeNum: existing.grade_num };

    if (cls.className) {
      db.prepare('INSERT OR IGNORE INTO classes (name, grade_num, code, teacher_id) VALUES (?, ?, ?, 1)')
        .run(cls.className, cls.gradeNum, `CLS-${cls.className}`);
    }

    db.prepare(`
      UPDATE users SET name = ?, username = ?, class_name = ?, grade_num = ? WHERE id = ?
    `).run(nextName, nextUser, cls.className, cls.gradeNum, req.params.id);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка редактирования (возможно логин уже занят)' });
  }
});

// Забанить ученика (за никнейм, списывание, дисциплину)
app.post('/api/teacher/students/:id/ban', (req, res) => {
  const { reason = 'Некорректный никнейм / нарушение правил', teacherName = 'Учитель' } = req.body || {};
  try {
    const u = db.prepare("SELECT id, name, class_name FROM users WHERE id = ? AND role = 'student'").get(req.params.id);
    if (!u) return res.status(404).json({ error: 'Ученик не найден' });

    db.prepare(`
      UPDATE users SET is_banned = 1, ban_reason = ?, banned_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(reason, req.params.id);

    db.prepare(`
      INSERT INTO anti_cheat_logs (user_id, user_name, class_name, event_type, details)
      VALUES (?, ?, ?, 'USER_BANNED', ?)
    `).run(u.id, u.name, u.class_name || '', `Забанен (${teacherName}): ${reason}`);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка блокировки ученика' });
  }
});

// Разбанить ученика
app.post('/api/teacher/students/:id/unban', (req, res) => {
  try {
    db.prepare("UPDATE users SET is_banned = 0, ban_reason = '', banned_at = NULL WHERE id = ? AND role = 'student'")
      .run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка разблокировки' });
  }
});

// Выдать предупреждение ученику
app.post('/api/teacher/students/:id/warn', (req, res) => {
  const { reason, teacherId = 1, teacherName = 'Лебедева Ольга Вячеславовна' } = req.body || {};
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Укажите причину предупреждения' });
  }
  try {
    const u = db.prepare("SELECT id, name, class_name FROM users WHERE id = ? AND role = 'student'").get(req.params.id);
    if (!u) return res.status(404).json({ error: 'Ученик не найден' });

    db.prepare(`
      INSERT INTO warnings (user_id, teacher_id, teacher_name, reason) VALUES (?, ?, ?, ?)
    `).run(u.id, teacherId, teacherName, reason.trim());

    db.prepare('UPDATE users SET warnings_count = warnings_count + 1 WHERE id = ?').run(u.id);

    db.prepare(`
      INSERT INTO anti_cheat_logs (user_id, user_name, class_name, event_type, details)
      VALUES (?, ?, ?, 'TEACHER_WARNING', ?)
    `).run(u.id, u.name, u.class_name || '', `Предупреждение от учителя: ${reason.trim()}`);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка выдачи предупреждения' });
  }
});

// Удалить конкретного ученика полностью
app.delete('/api/teacher/students/:id', (req, res) => {
  const sid = req.params.id;
  try {
    const u = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").get(sid);
    if (!u) return res.status(404).json({ error: 'Ученик не найден' });

    db.prepare('DELETE FROM submissions WHERE student_id = ?').run(sid);
    db.prepare('DELETE FROM anti_cheat_logs WHERE user_id = ?').run(sid);
    db.prepare('DELETE FROM warnings WHERE user_id = ?').run(sid);
    db.prepare('DELETE FROM assignment_completions WHERE student_id = ?').run(sid);
    db.prepare('DELETE FROM user_task_progress WHERE user_id = ?').run(sid);
    db.prepare('DELETE FROM assignments WHERE target_student_id = ?').run(sid);
    db.prepare('DELETE FROM users WHERE id = ?').run(sid);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка удаления ученика' });
  }
});

// Массовая чистка учеников / банов / логов
app.post('/api/teacher/cleanup', (req, res) => {
  const { target, className } = req.body || {};
  try {
    let removed = 0;

    if (target === 'banned') {
      const banned = db.prepare("SELECT id FROM users WHERE role = 'student' AND is_banned = 1").all();
      banned.forEach(({ id }) => {
        db.prepare('DELETE FROM submissions WHERE student_id = ?').run(id);
        db.prepare('DELETE FROM anti_cheat_logs WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM warnings WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM assignment_completions WHERE student_id = ?').run(id);
        db.prepare('DELETE FROM user_task_progress WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        removed++;
      });
    } else if (target === 'class' && className) {
      const clsStudents = db.prepare("SELECT id FROM users WHERE role = 'student' AND class_name = ?").all(className);
      clsStudents.forEach(({ id }) => {
        db.prepare('DELETE FROM submissions WHERE student_id = ?').run(id);
        db.prepare('DELETE FROM anti_cheat_logs WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM warnings WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM assignment_completions WHERE student_id = ?').run(id);
        db.prepare('DELETE FROM user_task_progress WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        removed++;
      });
    } else if (target === 'all_students') {
      const all = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
      removed = all.length;
      db.prepare("DELETE FROM submissions").run();
      db.prepare("DELETE FROM anti_cheat_logs").run();
      db.prepare("DELETE FROM warnings").run();
      db.prepare("DELETE FROM assignment_completions").run();
      db.prepare("DELETE FROM user_task_progress").run();
      db.prepare("DELETE FROM users WHERE role = 'student'").run();
    } else if (target === 'logs') {
      const c = db.prepare('SELECT COUNT(*) as cnt FROM anti_cheat_logs').get().cnt;
      db.prepare('DELETE FROM anti_cheat_logs').run();
      removed = c;
    } else if (target === 'submissions') {
      const c = db.prepare('SELECT COUNT(*) as cnt FROM submissions').get().cnt;
      db.prepare('DELETE FROM submissions').run();
      db.prepare('DELETE FROM assignment_completions').run();
      removed = c;
    }

    return res.json({ success: true, removed });
  } catch (err) {
    console.error('Cleanup error:', err);
    return res.status(500).json({ error: 'Ошибка очистки данных' });
  }
});

// Журнал сданных работ с фильтром по классу
app.get('/api/teacher/submissions', (req, res) => {
  const { className = 'all' } = req.query;
  try {
    const list = className && className !== 'all'
      ? db.prepare('SELECT * FROM submissions WHERE class_name = ? ORDER BY submitted_at DESC LIMIT 150').all(className)
      : db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC LIMIT 150').all();
    return res.json({ success: true, submissions: list });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Лента нарушений античита
app.get('/api/teacher/anticheat-logs', (req, res) => {
  const { className = 'all' } = req.query;
  try {
    const logs = className && className !== 'all'
      ? db.prepare('SELECT * FROM anti_cheat_logs WHERE class_name = ? ORDER BY timestamp DESC LIMIT 100').all(className)
      : db.prepare('SELECT * FROM anti_cheat_logs ORDER BY timestamp DESC LIMIT 100').all();
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// =============================================================================
// ИНДИВИДУАЛЬНЫЕ ЗАДАНИЯ И ЗАДАНИЯ ДЛЯ КЛАССОВ
// =============================================================================

app.post('/api/teacher/assignments', (req, res) => {
  const {
    title,
    description = '',
    targetType = 'class',
    targetStudentId = null,
    targetClass = '',
    mode = 'reshu_oge',
    taskConfig = {},
    questionCount = 5,
    strictAnticheat = true,
    dueDate = '',
    createdBy = 1,
    createdByName = 'Лебедева Ольга Вячеславовна',
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Укажите название задания' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO assignments (
        title, description, target_type, target_student_id, target_class,
        mode, task_config, question_count, strict_anticheat, due_date, created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description.trim(),
      targetType,
      targetStudentId || null,
      targetClass || '',
      mode,
      typeof taskConfig === 'string' ? taskConfig : JSON.stringify(taskConfig),
      questionCount,
      strictAnticheat ? 1 : 0,
      dueDate || '',
      createdBy,
      createdByName
    );

    return res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Create assignment error:', err);
    return res.status(500).json({ error: 'Ошибка создания задания' });
  }
});

app.get('/api/teacher/assignments', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT a.*, u.name as target_student_name, u.class_name as target_student_class
      FROM assignments a
      LEFT JOIN users u ON u.id = a.target_student_id
      ORDER BY a.created_at DESC
    `).all();

    const enriched = list.map(a => {
      const completions = db.prepare(`
        SELECT c.*, u.name as student_name, u.class_name
        FROM assignment_completions c
        JOIN users u ON u.id = c.student_id
        WHERE c.assignment_id = ?
        ORDER BY c.completed_at DESC
      `).all(a.id);

      let taskConfigParsed = {};
      try { taskConfigParsed = JSON.parse(a.task_config || '{}'); } catch {}

      return { ...a, taskConfig: taskConfigParsed, completions };
    });

    return res.json({ success: true, assignments: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки заданий' });
  }
});

app.delete('/api/teacher/assignments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM assignment_completions WHERE assignment_id = ?').run(req.params.id);
    db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка удаления задания' });
  }
});

// Получить задания, назначенные конкретному ученику или его классу
app.get('/api/student/:studentId/assignments', (req, res) => {
  try {
    const student = db.prepare('SELECT id, class_name FROM users WHERE id = ?').get(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Ученик не найден' });

    const list = db.prepare(`
      SELECT * FROM assignments
      WHERE target_type = 'all'
         OR (target_type = 'class' AND target_class = ?)
         OR (target_type = 'student' AND target_student_id = ?)
      ORDER BY created_at DESC
    `).all(student.class_name || '', student.id);

    const enriched = list.map(a => {
      const comp = db.prepare(`
        SELECT * FROM assignment_completions
        WHERE assignment_id = ? AND student_id = ?
        ORDER BY completed_at DESC LIMIT 1
      `).get(a.id, student.id);

      let taskConfigParsed = {};
      try { taskConfigParsed = JSON.parse(a.task_config || '{}'); } catch {}

      return { ...a, taskConfig: taskConfigParsed, completion: comp || null };
    });

    return res.json({ success: true, assignments: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки заданий' });
  }
});

// =============================================================================
// РЕАЛЬНЫЙ РЕЙТИНГ КЛАССА И ШКОЛЫ (БЕЗ ФЕЙКОВЫХ АККАУНТОВ)
// =============================================================================
app.get('/api/leaderboard', (req, res) => {
  const { className = 'all' } = req.query;
  try {
    let sql = `
      SELECT u.id, u.name, u.class_name, u.avatar, u.level, u.xp, u.streak,
        COUNT(s.id) as total_tests,
        COALESCE(AVG(s.accuracy), 0) as avg_accuracy,
        COALESCE(SUM(s.tab_switches), 0) as violations
      FROM users u
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.role = 'student' AND u.is_banned = 0
    `;
    const params = [];
    if (className && className !== 'all') {
      sql += ' AND u.class_name = ?';
      params.push(className);
    }
    sql += ' GROUP BY u.id ORDER BY u.xp DESC, avg_accuracy DESC LIMIT 50';

    const leaders = db.prepare(sql).all(...params);
    return res.json({ success: true, leaders });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка загрузки рейтинга' });
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

const duelRooms = new Map();

app.post('/api/duel/create', (req, res) => {
  const { hostId, hostName, hostAvatar } = req.body;
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (duelRooms.has(code));

  const shuffledQs = [...DUEL_QUESTIONS_POOL].sort(() => Math.random() - 0.5);
  const room = {
    code,
    host: { id: hostId || 'host', name: hostName || 'Игрок 1', avatar: hostAvatar || '🧑‍🎓', score: 0 },
    guest: null,
    status: 'waiting',
    questions: shuffledQs,
    targetScore: 10,
    winner: null,
    createdAt: Date.now()
  };

  duelRooms.set(code, room);
  return res.json({ success: true, code, room });
});

app.post('/api/duel/join', (req, res) => {
  const { code, guestId, guestName, guestAvatar } = req.body;
  const cleanCode = (code || '').toString().trim();
  const room = duelRooms.get(cleanCode);
  if (!room) return res.status(404).json({ error: 'Комната с таким кодом не найдена' });
  if (room.guest && room.guest.id !== guestId) {
    return res.status(400).json({ error: 'В этой дуэли уже есть два игрока' });
  }
  if (!room.guest) {
    room.guest = { id: guestId || 'guest', name: guestName || 'Игрок 2', avatar: guestAvatar || '🥷', score: 0 };
    room.status = 'in_progress';
  }
  return res.json({ success: true, room });
});

app.get('/api/duel/room/:code', (req, res) => {
  const code = (req.params.code || '').trim();
  const room = duelRooms.get(code);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  return res.json({ success: true, room });
});

app.post('/api/duel/score', (req, res) => {
  const { code, playerId } = req.body;
  const room = duelRooms.get((code || '').toString().trim());
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  if (room.status !== 'in_progress') return res.json({ success: true, room });

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
// ДИАГНОСТИКА ЗАПАДАЮЩИХ ТЕМ НА ОСНОВЕ РЕАЛЬНЫХ СДАЧ УЧЕНИКА
// =============================================================================
app.get('/api/diagnostics/user/:id', (req, res) => {
  const userId = req.params.id;
  try {
    const subs = db.prepare('SELECT * FROM submissions WHERE student_id = ? ORDER BY submitted_at DESC').all(userId);

    const calcTopic = (id, title, detail) => {
      const matching = subs.filter(s =>
        s.topic_id === id ||
        (s.test_title || '').toLowerCase().includes(id)
      );
      if (matching.length === 0) {
        return { id, title, accuracy: null, errors: 0, status: 'untested', detail };
      }
      const avg = Math.round(matching.reduce((a, b) => a + b.accuracy, 0) / matching.length);
      const errCount = matching.reduce((a, b) => a + Math.max(0, b.total - b.score), 0);
      const status = avg < 65 ? 'danger' : avg < 80 ? 'warning' : 'good';
      return { id, title, accuracy: avg, errors: errCount, status, detail };
    };

    const topicStats = [
      calcTopic('chered', 'Корни с чередованием', 'Ошибки в исключениях РАСТ/РОС (росток, отрасль), МАК/МОК и ГОР/ГАР'),
      calcTopic('pristavki', 'Приставки ПРЕ-/ПРИ- и З/С', 'Различение высшей степени (премилый), приближения и глухих согласных'),
      calcTopic('n_nn', 'Н и НН в суффиксах', 'Краткие причастия, отглагольные прилагательные и исключения'),
      calcTopic('paronyms', 'Паронимы ФИПИ (ЕГЭ №5)', 'Различение пар (абонент/абонемент, сытый/сытный, надеть/одеть)'),
      calcTopic('orfoepia', 'Ударения ФИПИ (ЕГЭ №4)', 'Глаголы женского рода (бралА, но клАла), красИвее, звонИт'),
      calcTopic('punktuacia', 'Пунктуация ОГЭ/ЕГЭ (№3–5, 16–21)', 'Запятые в ССП, СПП, БСП и при обособленных оборотах'),
    ];

    const weakTopics = topicStats.filter(t => t.accuracy !== null && t.accuracy < 75);
    const aiRecommendation = subs.length === 0
      ? 'Вы ещё не сдали ни одной работы. Откройте «Решу ОГЭ / ЕГЭ» или «Тестирование» — диагностика автоматически построит вашу карту пробелов по реальным ошибкам!'
      : weakTopics.length > 0
        ? `Выявлены пробелы в темах: ${weakTopics.map(t => t.title).join(', ')}. Нажмите «Отработать западающие темы», чтобы закрыть ошибки.`
        : 'Отличная точность по сданным темам! Попробуйте полный вариант ОГЭ/ЕГЭ для проверки выносливости.';

    return res.json({
      success: true,
      diagnostics: {
        totalTests: subs.length,
        criticalTopicsCount: weakTopics.length,
        topics: topicStats,
        aiRecommendation,
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
