const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 试卷列表
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM papers WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  // 附加题目数量
  rows.forEach(r => {
    const count = db.prepare('SELECT COUNT(*) as c FROM paper_questions WHERE paper_id = ?').get(r.id).c;
    r.question_count = count;
  });
  ok(res, rows);
});

// 试卷详情（含题目）
router.get('/:id', (req, res) => {
  const paper = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!paper) return fail(res, '试卷不存在', 404);
  const questions = db.prepare(
    `SELECT q.*, pq.score as paper_score, pq.sort_order FROM paper_questions pq JOIN questions q ON pq.question_id = q.id WHERE pq.paper_id = ? AND q.user_id = ? ORDER BY pq.sort_order, pq.id`
  ).all(req.params.id, req.user.id);
  paper.questions = questions;
  ok(res, paper);
});

// 创建试卷
router.post('/', (req, res) => {
  const { title, description = '', duration = 0, total_score = 0, question_ids = [], questions = [] } = req.body;
  if (!title) return fail(res, '试卷标题不能为空');
  const info = db.prepare(
    `INSERT INTO papers (title, description, duration, total_score, user_id) VALUES (?, ?, ?, ?, ?)`
  ).run(title, description, duration, total_score, req.user.id);
  const pid = info.lastInsertRowid;
  // questions: [{question_id, score}]
  const items = questions.length ? questions : question_ids.map(qid => ({ question_id: qid, score: 0 }));
  const insertPq = db.prepare('INSERT INTO paper_questions (paper_id, question_id, score, sort_order) VALUES (?, ?, ?, ?)');
  items.forEach((item, idx) => {
    insertPq.run(pid, item.question_id, item.score || 0, idx);
  });
  const paper = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(pid, req.user.id);
  ok(res, paper, '创建成功');
});

// 更新试卷题目列表
router.put('/:id/questions', (req, res) => {
  const { questions = [] } = req.body;
  const paper = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!paper) return fail(res, '试卷不存在', 404);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM paper_questions WHERE paper_id = ?').run(req.params.id);
    const insertPq = db.prepare('INSERT INTO paper_questions (paper_id, question_id, score, sort_order) VALUES (?, ?, ?, ?)');
    questions.forEach((item, idx) => {
      insertPq.run(req.params.id, item.question_id, item.score || 0, idx);
    });
  });
  tx();
  ok(res, null, '更新成功');
});

// 更新试卷基本信息
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '试卷不存在', 404);
  const { title, description, duration, total_score } = req.body;
  db.prepare(
    `UPDATE papers SET title=?, description=?, duration=?, total_score=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    title ?? existing.title,
    description ?? existing.description,
    duration ?? existing.duration,
    total_score ?? existing.total_score,
    req.params.id,
    req.user.id
  );
  ok(res, null, '更新成功');
});

// 删除试卷
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM papers WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '试卷不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
