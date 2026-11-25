import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// На облаке без VPN (Amvera / Timeweb / VDS / Docker) папка /data сохраняется между перезапусками
const dbPath =
  process.env.DB_PATH ||
  (fs.existsSync('/data') ? '/data/ruslearn.db' : path.join(__dirname, 'ruslearn.db'));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
export const DB_LOCATION = dbPath;

// Нормализация названия класса: "9 б" / "9 «Б»" / "9б" -> { className: "9Б", gradeNum: 9 }
export function normalizeClassInfo(rawClass) {
  const clean = (rawClass || '').toString().trim().toUpperCase().replace(/["«»'\s-]/g, '');
  const match = clean.match(/^(\d{1,2})([А-ЯA-Z]?)$/);
  if (!match) {
    return {
      className: (rawClass || '').toString().trim().slice(0, 12) || 'Без класса',
      gradeNum: 99,
    };
  }
  const num = Math.min(11, Math.max(1, parseInt(match[1], 10)));
  const letter = match[2] || '';
  return {
    className: `${num}${letter}`,
    gradeNum: num,
  };
}

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Инициализация структуры таблиц базы данных и миграции
export function initDB() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      class_name TEXT DEFAULT '',
      grade_num INTEGER DEFAULT 99,
      avatar TEXT DEFAULT '🧑‍🎓',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT DEFAULT '',
      banned_at DATETIME,
      warnings_count INTEGER DEFAULT 0,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      grade_num INTEGER DEFAULT 9,
      code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_title TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT DEFAULT '',
      assignment_id INTEGER DEFAULT NULL,
      variant_id TEXT DEFAULT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      accuracy INTEGER NOT NULL,
      tab_switches INTEGER DEFAULT 0,
      copy_attempts INTEGER DEFAULT 0,
      suspicious_speed_count INTEGER DEFAULT 0,
      cheat_status TEXT DEFAULT 'CLEAN',
      duration_seconds INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anti_cheat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      class_name TEXT DEFAULT '',
      event_type TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      teacher_id INTEGER,
      teacher_name TEXT DEFAULT 'Учитель',
      reason TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      target_type TEXT NOT NULL,
      target_student_id INTEGER,
      target_class TEXT DEFAULT '',
      mode TEXT NOT NULL,
      task_config TEXT DEFAULT '{}',
      question_count INTEGER DEFAULT 5,
      strict_anticheat INTEGER DEFAULT 1,
      due_date TEXT DEFAULT '',
      created_by INTEGER,
      created_by_name TEXT DEFAULT 'Учитель',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignment_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      submission_id INTEGER,
      score INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      accuracy INTEGER DEFAULT 0,
      cheat_status TEXT DEFAULT 'CLEAN',
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_task_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_key TEXT NOT NULL,
      is_solved INTEGER DEFAULT 0,
      is_correct INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, task_key)
    );
  `);

  // Безопасные миграции существующих таблиц
  ensureColumn('users', 'class_name', "TEXT DEFAULT ''");
  ensureColumn('users', 'grade_num', 'INTEGER DEFAULT 99');
  ensureColumn('users', 'is_banned', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'ban_reason', "TEXT DEFAULT ''");
  ensureColumn('users', 'banned_at', 'DATETIME');
  ensureColumn('users', 'warnings_count', 'INTEGER DEFAULT 0');
  ensureColumn('users', 'last_active', 'DATETIME');

  ensureColumn('submissions', 'class_name', "TEXT DEFAULT ''");
  ensureColumn('submissions', 'assignment_id', 'INTEGER');
  ensureColumn('submissions', 'variant_id', 'TEXT');

  ensureColumn('anti_cheat_logs', 'class_name', "TEXT DEFAULT ''");

  // Удаляем старые тестовые аккаунты и их фейковые сдачи/логи (боевой режим!)
  const demoUsers = db
    .prepare("SELECT id FROM users WHERE username IN ('ivan', 'smirnova', 'kuznetsov')")
    .all();
  if (demoUsers.length > 0) {
    const ids = demoUsers.map(u => u.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM submissions WHERE student_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM anti_cheat_logs WHERE user_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM warnings WHERE user_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids);
    console.log('🧹 Удалены тестовые аккаунты и их фейковая статистика');
  }

  // Также подчистим старый фейковый класс 9 «А» класс если он остался
  db.prepare("DELETE FROM classes WHERE code = 'RUS-9A'").run();

  // Создаём реальные классы школы по умолчанию, если таблица классов пуста
  const classCount = db.prepare('SELECT COUNT(*) as c FROM classes').get().c;
  if (classCount === 0) {
    const defaultClasses = [
      ['5А', 5], ['5Б', 5],
      ['6А', 6], ['6Б', 6],
      ['7А', 7], ['7Б', 7],
      ['8А', 8], ['8Б', 8],
      ['9А', 9], ['9Б', 9], ['9В', 9],
      ['10А', 10], ['11А', 11],
    ];
    const insCls = db.prepare(
      'INSERT OR IGNORE INTO classes (name, grade_num, code, teacher_id) VALUES (?, ?, ?, 1)'
    );
    defaultClasses.forEach(([name, grade]) => {
      insCls.run(name, grade, `CLS-${name}`);
    });
  }

  // Создаём учётную запись руководителя, если учителей вообще ещё нет
  const teacherCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'teacher'").get().c;
  if (teacherCount === 0) {
    const initPassword = process.env.TEACHER_INIT_PASSWORD || 'lebedeva2026';
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, class_name, grade_num, avatar, level, xp, streak)
      VALUES (?, ?, ?, 'teacher', ?, 'Учитель', 0, '👩‍🏫', 10, 5000, 0)
    `).run(
      'lebedeva',
      'lebedeva@ruslearn.ru',
      initPassword,
      'Лебедева Ольга Вячеславовна'
    );
    console.log('✅ Инициализирован аккаунт учителя (Лебедева Ольга Вячеславовна)');
  } else {
    // Обновим старый логин teacher на актуальное ФИО, если он остался
    db.prepare(
      "UPDATE users SET name = 'Лебедева Ольга Вячеславовна' WHERE role = 'teacher' AND name LIKE '%Учитель%'"
    ).run();
  }

  console.log(`✅ SQLite База данных готова: ${dbPath}`);
}
