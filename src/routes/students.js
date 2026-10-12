const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 学生列表
router.get('/', (req, res) => {
  const { q = '', grade = '' } = req.query;
  let sql = 'SELECT * FROM students WHERE user_id = ?';
  const params = [req.user.id];
  if (grade) { sql += ' AND grade = ?'; params.push(grade); }
  if (q) { sql += ' AND (name LIKE ? OR contact LIKE ? OR school LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  ok(res, rows);
});

// 学生详情（含学习记录和关联课程）
router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!student) return fail(res, '学生不存在', 404);
  const records = db.prepare(
    'SELECT * FROM learning_records WHERE student_id = ? AND user_id = ? ORDER BY record_date DESC, id DESC'
  ).all(req.params.id, req.user.id);
  const courses = db.prepare(
    `SELECT c.* FROM courses c JOIN course_students cs ON c.id = cs.course_id WHERE cs.student_id = ? AND c.user_id = ?`
  ).all(req.params.id, req.user.id);
  student.learning_records = records;
  student.courses = courses;
  ok(res, student);
});

// 创建学生
router.post('/', (req, res) => {
  const { name, contact = '', grade = '', school = '', remark = '' } = req.body;
  if (!name) return fail(res, '姓名不能为空');
  const info = db.prepare(
    `INSERT INTO students (name, contact, grade, school, remark, user_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(name, contact, grade, school, remark, req.user.id);
  const row = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
  ok(res, row, '创建成功');
});

// 更新学生
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '学生不存在', 404);
  const { name, contact, grade, school, remark } = req.body;
  db.prepare(
    `UPDATE students SET name=?, contact=?, grade=?, school=?, remark=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    name ?? existing.name,
    contact ?? existing.contact,
    grade ?? existing.grade,
    school ?? existing.school,
    remark ?? existing.remark,
    req.params.id,
    req.user.id
  );
  ok(res, null, '更新成功');
});

// 删除学生
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM students WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '学生不存在', 404);
  ok(res, null, '删除成功');
});

// 学习记录：列表
router.get('/:id/records', (req, res) => {
  const student = db.prepare('SELECT id FROM students WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!student) return fail(res, '学生不存在', 404);
  const rows = db.prepare(
    'SELECT * FROM learning_records WHERE student_id = ? AND user_id = ? ORDER BY record_date DESC, id DESC'
  ).all(req.params.id, req.user.id);
  ok(res, rows);
});

// 学习记录：创建
router.post('/:id/records', (req, res) => {
  const student = db.prepare('SELECT id FROM students WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!student) return fail(res, '学生不存在', 404);
  const { record_date, content = '', performance = '', next_plan = '' } = req.body;
  if (!record_date) return fail(res, '日期不能为空');
  const info = db.prepare(
    `INSERT INTO learning_records (student_id, record_date, content, performance, next_plan, user_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(req.params.id, record_date, content, performance, next_plan, req.user.id);
  const row = db.prepare('SELECT * FROM learning_records WHERE id = ?').get(info.lastInsertRowid);
  ok(res, row, '创建成功');
});

// 学习记录：更新
router.put('/records/:recordId', (req, res) => {
  const existing = db.prepare('SELECT * FROM learning_records WHERE id = ? AND user_id = ?').get(req.params.recordId, req.user.id);
  if (!existing) return fail(res, '记录不存在', 404);
  const { record_date, content, performance, next_plan } = req.body;
  db.prepare(
    `UPDATE learning_records SET record_date=?, content=?, performance=?, next_plan=? WHERE id=? AND user_id=?`
  ).run(
    record_date ?? existing.record_date,
    content ?? existing.content,
    performance ?? existing.performance,
    next_plan ?? existing.next_plan,
    req.params.recordId,
    req.user.id
  );
  ok(res, null, '更新成功');
});

// 学习记录：删除
router.delete('/records/:recordId', (req, res) => {
  const info = db.prepare('DELETE FROM learning_records WHERE id = ? AND user_id = ?').run(req.params.recordId, req.user.id);
  if (info.changes === 0) return fail(res, '记录不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
