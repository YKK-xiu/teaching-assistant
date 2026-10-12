const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 备课列表
router.get('/', (req, res) => {
  const { q = '', course = '' } = req.query;
  let sql = 'SELECT * FROM lesson_plans WHERE user_id = ?';
  const params = [req.user.id];
  if (course) { sql += ' AND course_name = ?'; params.push(course); }
  if (q) { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY plan_date DESC, id DESC';
  const rows = db.prepare(sql).all(...params);
  ok(res, rows);
});

// 获取所有课程名（用于筛选）
router.get('/courses/list', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT course_name FROM lesson_plans WHERE user_id = ? AND course_name != \'\' ORDER BY course_name').all(req.user.id);
  ok(res, rows.map(r => r.course_name));
});

// 备课详情
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lesson_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return fail(res, '备课不存在', 404);
  const kps = db.prepare(
    `SELECT kp.id, kp.title FROM knowledge_points kp JOIN lesson_plan_knowledge lk ON kp.id = lk.knowledge_point_id WHERE lk.lesson_plan_id = ? AND kp.user_id = ?`
  ).all(row.id, req.user.id);
  row.knowledge_points = kps;
  ok(res, row);
});

// 创建备课
router.post('/', (req, res) => {
  const { title, course_name = '', plan_date = '', content = '', knowledge_point_ids = [] } = req.body;
  if (!title) return fail(res, '标题不能为空');
  const info = db.prepare(
    `INSERT INTO lesson_plans (title, course_name, plan_date, content, user_id) VALUES (?, ?, ?, ?, ?)`
  ).run(title, course_name, plan_date, content, req.user.id);
  const id = info.lastInsertRowid;
  const insertKp = db.prepare('INSERT OR IGNORE INTO lesson_plan_knowledge (lesson_plan_id, knowledge_point_id) VALUES (?, ?)');
  (knowledge_point_ids || []).forEach(kpid => insertKp.run(id, kpid));
  const row = db.prepare('SELECT * FROM lesson_plans WHERE id = ? AND user_id = ?').get(id, req.user.id);
  ok(res, row, '创建成功');
});

// 更新备课
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lesson_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '备课不存在', 404);
  const { title, course_name, plan_date, content, knowledge_point_ids } = req.body;
  db.prepare(
    `UPDATE lesson_plans SET title=?, course_name=?, plan_date=?, content=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    title ?? existing.title,
    course_name ?? existing.course_name,
    plan_date ?? existing.plan_date,
    content ?? existing.content,
    req.params.id,
    req.user.id
  );
  if (knowledge_point_ids) {
    db.prepare('DELETE FROM lesson_plan_knowledge WHERE lesson_plan_id = ?').run(req.params.id);
    const insertKp = db.prepare('INSERT OR IGNORE INTO lesson_plan_knowledge (lesson_plan_id, knowledge_point_id) VALUES (?, ?)');
    knowledge_point_ids.forEach(kpid => insertKp.run(req.params.id, kpid));
  }
  ok(res, null, '更新成功');
});

// 删除备课
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM lesson_plans WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '备课不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
