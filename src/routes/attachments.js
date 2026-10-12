const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { ok, fail } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 上传附件（需指定 entity_type 和 entity_id）
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return fail(res, '未上传文件');
  const { entity_type, entity_id } = req.body;
  if (!entity_type || !entity_id) return fail(res, '请指定 entity_type 和 entity_id');
  const info = db.prepare(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, mimetype, size, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(entity_type, entity_id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id);
  const row = db.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
  ok(res, row, '上传成功');
});

// 获取某实体的附件列表
router.get('/', (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) return fail(res, '请指定 entity_type 和 entity_id');
  const rows = db.prepare('SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? AND user_id = ? ORDER BY created_at DESC').all(entity_type, entity_id, req.user.id);
  ok(res, rows);
});

// 下载附件
router.get('/:id/download', (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!att) return fail(res, '附件不存在', 404);
  const filePath = path.join(UPLOAD_DIR, att.filename);
  if (!fs.existsSync(filePath)) return fail(res, '文件已丢失', 404);
  res.download(filePath, att.original_name);
});

// 删除附件
router.delete('/:id', (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!att) return fail(res, '附件不存在', 404);
  const filePath = path.join(UPLOAD_DIR, att.filename);
  db.prepare('DELETE FROM attachments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  ok(res, null, '删除成功');
});

module.exports = router;
