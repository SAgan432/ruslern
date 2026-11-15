import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'ruslearn.db');
export const db = new DatabaseSync(dbPath);

// Инициализация структуры таблиц базы данных
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '🧑‍🎓',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS class_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_title TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
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
      event_type TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      correct INTEGER DEFAULT 0,
      percent INTEGER DEFAULT 0,
      last_done DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Проверка и создание демо-пользователей
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = countStmt.get().count;

  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, avatar, level, xp, streak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Учитель (логин: teacher / пароль: teacher123)
    insertUser.run(
      'teacher',
      'teacher@ruslearn.ru',
      'teacher123',
      'teacher',
      'Лебедева Ольга Вячеславовна (Учитель)',
      '👩‍🏫',
      8,
      4200,
      14
    );

    // 2. Ученик (логин: ivan / пароль: student123)
    insertUser.run(
      'ivan',
      'ivan@ruslearn.ru',
      'student123',
      'student',
      'Иван Иванов',
      '🧑‍🎓',
      2,
      680,
      3
    );

    // 3. Другие ученики для журнала учителя
    insertUser.run(
      'smirnova',
      'smirnova@ruslearn.ru',
      'student123',
      'student',
      'Мария Смирнова',
      '👩‍🎓',
      6,
      2800,
      12
    );

    insertUser.run(
      'kuznetsov',
      'kuznetsov@ruslearn.ru',
      'student123',
      'student',
      'Дмитрий Кузнецов',
      '👨‍🎓',
      3,
      1150,
      1
    );

    // Демо-класс
    const insertClass = db.prepare('INSERT INTO classes (name, code, teacher_id) VALUES (?, ?, ?)');
    insertClass.run('9 «А» класс', 'RUS-9A', 1);

    // Демо-сдачи с античит-статусами
    const insertSub = db.prepare(`
      INSERT INTO submissions (test_title, topic_id, student_id, student_name, score, total, accuracy, tab_switches, copy_attempts, suspicious_speed_count, cheat_status, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSub.run('Контрольный срез: Корни с чередованием', 'chered', 3, 'Мария Смирнова', 10, 10, 100, 0, 0, 0, 'CLEAN', 245);
    insertSub.run('Тест: Морфологические нормы (ЕГЭ №7)', 'ege_norms_7', 2, 'Иван Иванов', 5, 6, 83, 1, 0, 0, 'SUSPICIOUS', 180);
    insertSub.run('Экспресс-тест: Ударения (ЕГЭ №4)', 'orfoepia', 4, 'Дмитрий Кузнецов', 3, 6, 50, 4, 2, 2, 'FLAGGED', 45);

    // Демо-логи нарушений античита
    const insertLog = db.prepare(`
      INSERT INTO anti_cheat_logs (user_id, user_name, event_type, details)
      VALUES (?, ?, ?, ?)
    `);

    insertLog.run(4, 'Дмитрий Кузнецов', 'TAB_BLUR', 'Уход с вкладки тестирования на сторонний сайт/браузер');
    insertLog.run(4, 'Дмитрий Кузнецов', 'COPY_ATTEMPT', 'Попытка скопировать формулировку задания в буфер обмена');
    insertLog.run(4, 'Дмитрий Кузнецов', 'FAST_ANSWER', 'Подозрительно быстрый ответ (0.8 сек) на сложное задание');
    insertLog.run(2, 'Иван Иванов', 'TAB_BLUR', 'Кратковременный уход с вкладки тестирования (3 сек)');

    console.log('✅ SQLite Database initialized with default tables and demo users!');
  }
}
