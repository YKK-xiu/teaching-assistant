const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 题目列表（支持筛选和搜索）
router.get('/', (req, res) => {
  const { q = '', type = '', difficulty = '', knowledge_point_id = '' } = req.query;
  let sql = `SELECT DISTINCT q.* FROM questions q`;
  const params = [];
  const conditions = ['q.user_id = ?'];
  params.push(req.user.id);
  if (knowledge_point_id) {
    sql += ` LEFT JOIN question_knowledge qk ON q.id = qk.question_id`;
    conditions.push('qk.knowledge_point_id = ?');
    params.push(knowledge_point_id);
  }
  if (type) { conditions.push('q.question_type = ?'); params.push(type); }
  if (difficulty) { conditions.push('q.difficulty = ?'); params.push(difficulty); }
  if (q) { conditions.push('(q.stem LIKE ? OR q.answer LIKE ? OR q.analysis LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY q.id DESC';
  const rows = db.prepare(sql).all(...params);
  // 附带关联的知识点
  rows.forEach(r => {
    const kps = db.prepare(
      `SELECT kp.id, kp.title FROM knowledge_points kp JOIN question_knowledge qk ON kp.id = qk.knowledge_point_id WHERE qk.question_id = ? AND kp.user_id = ?`
    ).all(r.id, req.user.id);
    r.knowledge_points = kps;
  });
  ok(res, rows);
});

// 获取单个题目
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return fail(res, '题目不存在', 404);
  const kps = db.prepare(
    `SELECT kp.id, kp.title FROM knowledge_points kp JOIN question_knowledge qk ON kp.id = qk.knowledge_point_id WHERE qk.question_id = ? AND kp.user_id = ?`
  ).all(row.id, req.user.id);
  row.knowledge_points = kps;
  ok(res, row);
});

// 创建题目
router.post('/', (req, res) => {
  const { stem, question_type = 'other', answer = '', analysis = '', difficulty = 2, score = 0, tags = '', knowledge_point_ids = [] } = req.body;
  if (!stem) return fail(res, '题干不能为空');
  const info = db.prepare(
    `INSERT INTO questions (stem, question_type, answer, analysis, difficulty, score, tags, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(stem, question_type, answer, analysis, difficulty, score, tags, req.user.id);
  const qid = info.lastInsertRowid;
  const insertKp = db.prepare('INSERT OR IGNORE INTO question_knowledge (question_id, knowledge_point_id) VALUES (?, ?)');
  (knowledge_point_ids || []).forEach(kpid => insertKp.run(qid, kpid));
  const row = db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(qid, req.user.id);
  ok(res, row, '创建成功');
});

// 更新题目
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '题目不存在', 404);
  const { stem, question_type, answer, analysis, difficulty, score, tags, knowledge_point_ids } = req.body;
  db.prepare(
    `UPDATE questions SET stem=?, question_type=?, answer=?, analysis=?, difficulty=?, score=?, tags=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    stem ?? existing.stem,
    question_type ?? existing.question_type,
    answer ?? existing.answer,
    analysis ?? existing.analysis,
    difficulty ?? existing.difficulty,
    score ?? existing.score,
    tags ?? existing.tags,
    req.params.id,
    req.user.id
  );
  if (knowledge_point_ids) {
    db.prepare('DELETE FROM question_knowledge WHERE question_id = ?').run(req.params.id);
    const insertKp = db.prepare('INSERT OR IGNORE INTO question_knowledge (question_id, knowledge_point_id) VALUES (?, ?)');
    knowledge_point_ids.forEach(kpid => insertKp.run(req.params.id, kpid));
  }
  const row = db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  ok(res, row, '更新成功');
});

// 删除题目
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM questions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '题目不存在', 404);
  ok(res, null, '删除成功');
});

// 按知识点/难度筛选题目（用于组卷）
router.get('/filter/for-paper', (req, res) => {
  const { knowledge_point_id = '', difficulty = '', limit = '' } = req.query;
  let sql = `SELECT DISTINCT q.* FROM questions q LEFT JOIN question_knowledge qk ON q.id = qk.question_id WHERE q.user_id = ?`;
  const params = [req.user.id];
  if (knowledge_point_id) { sql += ' AND qk.knowledge_point_id = ?'; params.push(knowledge_point_id); }
  if (difficulty) { sql += ' AND q.difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY RANDOM()';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  const rows = db.prepare(sql).all(...params);
  ok(res, rows);
});

module.exports = router;
