const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const archiver = require('archiver');
const Database = require('better-sqlite3');
const db = require('../db');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// 直接拥有 user_id 字段的业务表
const USER_TABLES = [
  'knowledge_points', 'questions', 'papers', 'lesson_plans',
  'research_notes', 'students', 'learning_records', 'courses', 'attachments'
];

// 关联表（本身无 user_id，需按父资源的 user_id 过滤）
// 每个关联表通过 parentFk 关联到父表，按父表的 user_id 过滤
const LINK_TABLES = [
  { name: 'question_knowledge', parentFk: 'question_id', parentTable: 'questions' },
  { name: 'paper_questions', parentFk: 'paper_id', parentTable: 'papers' },
  { name: 'lesson_plan_knowledge', parentFk: 'lesson_plan_id', parentTable: 'lesson_plans' },
  { name: 'research_knowledge', parentFk: 'research_id', parentTable: 'research_notes' },
  { name: 'course_students', parentFk: 'course_id', parentTable: 'courses' }
];

// 导出数据（当前用户的数据库记录 + 该用户的附件）为 zip
router.get('/', (req, res) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="teaching-assistant-backup-${timestamp}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    console.error('导出失败:', err);
    if (!res.headersSent) res.status(500).json({ error: '导出失败', message: err.message });
  });
  archive.pipe(res);

  const tmpDbPath = path.join(os.tmpdir(), `export-${req.user.id}-${Date.now()}.db`);

  try {
    // 1. 复制原库结构到临时库
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL").all();
    const tmpDb = new Database(tmpDbPath);
    tmpDb.exec('PRAGMA foreign_keys = OFF');
    schema.forEach(s => {
      try { tmpDb.exec(s.sql); } catch (_) { /* 已存在则忽略 */ }
    });

    const userId = req.user.id;

    // 2. 复制带 user_id 的业务表（仅当前用户）
    USER_TABLES.forEach(table => {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      const colList = cols.join(', ');
      const placeholders = cols.map(() => '?').join(', ');
      const rows = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(userId);
      if (rows.length) {
        const insert = tmpDb.prepare(`INSERT INTO ${table} (${colList}) VALUES (${placeholders})`);
        rows.forEach(r => insert.run(...cols.map(c => r[c])));
      }
    });

    // 3. 复制关联表（通过父资源的 user_id 过滤）
    LINK_TABLES.forEach(({ name, parentFk, parentTable }) => {
      const cols = db.prepare(`PRAGMA table_info(${name})`).all().map(c => c.name);
      const colList = cols.join(', ');
      const placeholders = cols.map(() => '?').join(', ');
      const rows = db.prepare(
        `SELECT l.* FROM ${name} l JOIN ${parentTable} p ON l.${parentFk} = p.id WHERE p.user_id = ?`
      ).all(userId);
      if (rows.length) {
        const insert = tmpDb.prepare(`INSERT INTO ${name} (${colList}) VALUES (${placeholders})`);
        rows.forEach(r => insert.run(...cols.map(c => r[c])));
      }
    });

    tmpDb.close();

    // 4. 添加过滤后的数据库文件
    archive.file(tmpDbPath, { name: 'app.db' });

    // 5. 仅添加当前用户的附件文件
    const userAtts = db.prepare('SELECT filename FROM attachments WHERE user_id = ?').all(userId);
    userAtts.forEach(att => {
      const p = path.join(UPLOAD_DIR, att.filename);
      if (fs.existsSync(p)) archive.file(p, { name: `uploads/${att.filename}` });
    });

    archive.finalize();
    archive.on('end', () => {
      try { fs.unlinkSync(tmpDbPath); } catch (_) {}
    });
  } catch (err) {
    try { fs.unlinkSync(tmpDbPath); } catch (_) {}
    console.error('导出失败:', err);
    if (!res.headersSent) res.status(500).json({ error: '导出失败', message: err.message });
  }
});

module.exports = router;
