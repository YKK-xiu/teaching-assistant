const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 教研列表
router.get('/', (req, res) => {
  const { q = '', tag = '' } = req.query;
  let sql = 'SELECT * FROM research_notes WHERE user_id = ?';
  const params = [req.user.id];
  if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
  if (q) { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY note_date DESC, id DESC';
  const rows = db.prepare(sql).all(...params);
  ok(res, rows);
});

// 获取所有标签
router.get('/tags/list', (req, res) => {
  const rows = db.prepare('SELECT tags FROM research_notes WHERE user_id = ? AND tags != \'\'').all(req.user.id);
  const tagSet = new Set();
  rows.forEach(r => {
    r.tags.split(',').forEach(t => { if (t.trim()) tagSet.add(t.trim()); });
  });
  ok(res, Array.from(tagSet).sort());
});

// 教研详情
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM research_notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return fail(res, '教研笔记不存在', 404);
  const kps = db.prepare(
    `SELECT kp.id, kp.title FROM knowledge_points kp JOIN research_knowledge rk ON kp.id = rk.knowledge_point_id WHERE rk.research_id = ? AND kp.user_id = ?`
  ).all(row.id, req.user.id);
  row.knowledge_points = kps;
  ok(res, row);
});

// 创建教研
router.post('/', (req, res) => {
  const { title, note_date = '', content = '', tags = '', knowledge_point_ids = [] } = req.body;
  if (!title) return fail(res, '标题不能为空');
  const info = db.prepare(
    `INSERT INTO research_notes (title, note_date, content, tags, user_id) VALUES (?, ?, ?, ?, ?)`
  ).run(title, note_date, content, tags, req.user.id);
  const id = info.lastInsertRowid;
  const insertKp = db.prepare('INSERT OR IGNORE INTO research_knowledge (research_id, knowledge_point_id) VALUES (?, ?)');
  (knowledge_point_ids || []).forEach(kpid => insertKp.run(id, kpid));
  const row = db.prepare('SELECT * FROM research_notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  ok(res, row, '创建成功');
});

// 更新教研
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM research_notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '教研笔记不存在', 404);
  const { title, note_date, content, tags, knowledge_point_ids } = req.body;
  db.prepare(
    `UPDATE research_notes SET title=?, note_date=?, content=?, tags=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    title ?? existing.title,
    note_date ?? existing.note_date,
    content ?? existing.content,
    tags ?? existing.tags,
    req.params.id,
    req.user.id
  );
  if (knowledge_point_ids) {
    db.prepare('DELETE FROM research_knowledge WHERE research_id = ?').run(req.params.id);
    const insertKp = db.prepare('INSERT OR IGNORE INTO research_knowledge (research_id, knowledge_point_id) VALUES (?, ?)');
    knowledge_point_ids.forEach(kpid => insertKp.run(req.params.id, kpid));
  }
  ok(res, null, '更新成功');
});

// 删除教研
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM research_notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '教研笔记不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
