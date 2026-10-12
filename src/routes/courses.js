const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 课程列表
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY day_of_week, start_time').all(req.user.id);
  rows.forEach(c => {
    const students = db.prepare(
      `SELECT s.id, s.name FROM students s JOIN course_students cs ON s.id = cs.student_id WHERE cs.course_id = ? AND s.user_id = ?`
    ).all(c.id, req.user.id);
    c.students = students;
  });
  ok(res, rows);
});

// 按周查询课程（展开重复规则）
router.get('/week', (req, res) => {
  // weekStart: YYYY-MM-DD (周一)
  const { weekStart } = req.query;
  if (!weekStart) return fail(res, '请提供 weekStart 参数');
  const start = new Date(weekStart);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const courses = db.prepare('SELECT * FROM courses WHERE user_id = ?').all(req.user.id);
  const result = [];
  courses.forEach(c => {
    const students = db.prepare(
      `SELECT s.id, s.name FROM students s JOIN course_students cs ON s.id = cs.student_id WHERE cs.course_id = ? AND s.user_id = ?`
    ).all(c.id, req.user.id);
    // day_of_week: 0=周日, 1=周一, ..., 6=周六
    // days 数组索引: 0=周一, 1=周二, ..., 6=周日
    // 转换: daysIndex = day_of_week === 0 ? 6 : day_of_week - 1
    const courseDow = parseInt(c.day_of_week);
    const daysIndex = courseDow === 0 ? 6 : courseDow - 1;
    const dateStr = days[daysIndex];
    // 检查是否在起止日期范围内
    if (!(c.start_date && dateStr < c.start_date) && !(c.end_date && dateStr > c.end_date)) {
      result.push({ ...c, students, date: dateStr });
    }
  });
  ok(res, result);
});

// 课程详情
router.get('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!course) return fail(res, '课程不存在', 404);
  const students = db.prepare(
    `SELECT s.id, s.name FROM students s JOIN course_students cs ON s.id = cs.student_id WHERE cs.course_id = ? AND s.user_id = ?`
  ).all(course.id, req.user.id);
  course.students = students;
  ok(res, course);
});

// 创建课程
router.post('/', (req, res) => {
  const { name, subject = '', location = '', remark = '', day_of_week = 1, start_time = '', end_time = '', start_date = '', end_date = '', student_ids = [] } = req.body;
  if (!name) return fail(res, '课程名称不能为空');
  const info = db.prepare(
    `INSERT INTO courses (name, subject, location, remark, day_of_week, start_time, end_time, start_date, end_date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(name, subject, location, remark, day_of_week, start_time, end_time, start_date, end_date, req.user.id);
  const id = info.lastInsertRowid;
  const insertCs = db.prepare('INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)');
  (student_ids || []).forEach(sid => insertCs.run(id, sid));
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(id, req.user.id);
  ok(res, course, '创建成功');
});

// 更新课程
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '课程不存在', 404);
  const { name, subject, location, remark, day_of_week, start_time, end_time, start_date, end_date, student_ids } = req.body;
  db.prepare(
    `UPDATE courses SET name=?, subject=?, location=?, remark=?, day_of_week=?, start_time=?, end_time=?, start_date=?, end_date=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    name ?? existing.name,
    subject ?? existing.subject,
    location ?? existing.location,
    remark ?? existing.remark,
    day_of_week ?? existing.day_of_week,
    start_time ?? existing.start_time,
    end_time ?? existing.end_time,
    start_date ?? existing.start_date,
    end_date ?? existing.end_date,
    req.params.id,
    req.user.id
  );
  if (student_ids) {
    db.prepare('DELETE FROM course_students WHERE course_id = ?').run(req.params.id);
    const insertCs = db.prepare('INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)');
    student_ids.forEach(sid => insertCs.run(req.params.id, sid));
  }
  ok(res, null, '更新成功');
});

// 删除课程
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '课程不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
