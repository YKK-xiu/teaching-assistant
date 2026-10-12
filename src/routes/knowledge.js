const express = require('express');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');

// 获取知识点树
router.get('/tree', (req, res) => {
  const rows = db.prepare('SELECT * FROM knowledge_points WHERE user_id = ? ORDER BY sort_order, id').all(req.user.id);
  const map = new Map();
  const roots = [];
  rows.forEach(r => {
    map.set(r.id, { ...r, children: [] });
  });
  rows.forEach(r => {
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id).children.push(map.get(r.id));
    } else {
      roots.push(map.get(r.id));
    }
  });
  ok(res, roots);
});

// 搜索知识点
router.get('/search', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rows = db.prepare(
    `SELECT * FROM knowledge_points WHERE user_id = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?) ORDER BY updated_at DESC`
  ).all(req.user.id, q, q, q);
  ok(res, rows);
});

// 获取单个知识点详情
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM knowledge_points WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return fail(res, '知识点不存在', 404);
  ok(res, row);
});

// 创建知识点
router.post('/', (req, res) => {
  const { title, content = '', parent_id = null, level = 1, tags = '', sort_order = 0 } = req.body;
  if (!title) return fail(res, '标题不能为空');
  const info = db.prepare(
    `INSERT INTO knowledge_points (title, content, parent_id, level, tags, sort_order, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(title, content, parent_id, level, tags, sort_order, req.user.id);
  const row = db.prepare('SELECT * FROM knowledge_points WHERE id = ?').get(info.lastInsertRowid);
  ok(res, row, '创建成功');
});

// 更新知识点
router.put('/:id', (req, res) => {
  const { title, content, parent_id, level, tags, sort_order } = req.body;
  const existing = db.prepare('SELECT * FROM knowledge_points WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return fail(res, '知识点不存在', 404);
  db.prepare(
    `UPDATE knowledge_points SET title=?, content=?, parent_id=?, level=?, tags=?, sort_order=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?`
  ).run(
    title ?? existing.title,
    content ?? existing.content,
    parent_id ?? existing.parent_id,
    level ?? existing.level,
    tags ?? existing.tags,
    sort_order ?? existing.sort_order,
    req.params.id,
    req.user.id
  );
  const row = db.prepare('SELECT * FROM knowledge_points WHERE id = ?').get(req.params.id);
  ok(res, row, '更新成功');
});

// 删除知识点
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM knowledge_points WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return fail(res, '知识点不存在', 404);
  ok(res, null, '删除成功');
});

module.exports = router;
