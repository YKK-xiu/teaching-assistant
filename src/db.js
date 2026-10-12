const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'uploads'))) {
  fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建用户与会话表
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// 给已有业务表补充 user_id 字段（幂等：只在缺失时添加）
const tablesToAlter = [
  'knowledge_points', 'questions', 'papers', 'lesson_plans',
  'research_notes', 'students', 'learning_records', 'courses', 'attachments'
];
tablesToAlter.forEach(table => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === 'user_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`);
  }
});

// 创建所有业务表（含 user_id 字段，用于全新部署）
db.exec(`
CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  parent_id INTEGER DEFAULT NULL,
  level INTEGER DEFAULT 1,
  tags TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (parent_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stem TEXT NOT NULL,
  question_type TEXT DEFAULT 'other',
  answer TEXT DEFAULT '',
  analysis TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 2,
  score REAL DEFAULT 0,
  tags TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS question_knowledge (
  question_id INTEGER NOT NULL,
  knowledge_point_id INTEGER NOT NULL,
  PRIMARY KEY (question_id, knowledge_point_id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration INTEGER DEFAULT 0,
  total_score REAL DEFAULT 0,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS paper_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  score REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  course_name TEXT DEFAULT '',
  plan_date TEXT DEFAULT '',
  content TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS lesson_plan_knowledge (
  lesson_plan_id INTEGER NOT NULL,
  knowledge_point_id INTEGER NOT NULL,
  PRIMARY KEY (lesson_plan_id, knowledge_point_id),
  FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  note_date TEXT DEFAULT '',
  content TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS research_knowledge (
  research_id INTEGER NOT NULL,
  knowledge_point_id INTEGER NOT NULL,
  PRIMARY KEY (research_id, knowledge_point_id),
  FOREIGN KEY (research_id) REFERENCES research_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  school TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  record_date TEXT NOT NULL,
  content TEXT DEFAULT '',
  performance TEXT DEFAULT '',
  next_plan TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  day_of_week INTEGER DEFAULT 0,
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS course_students (
  course_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  PRIMARY KEY (course_id, student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mimetype TEXT DEFAULT '',
  size INTEGER DEFAULT 0,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_kp_parent ON knowledge_points(parent_id);
CREATE INDEX IF NOT EXISTS idx_kp_user ON knowledge_points(user_id);
CREATE INDEX IF NOT EXISTS idx_q_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_q_user ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_lr_student ON learning_records(student_id);
CREATE INDEX IF NOT EXISTS idx_course_dow ON courses(day_of_week);
CREATE INDEX IF NOT EXISTS idx_course_user ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_att_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(user_id);
`);

module.exports = db;
