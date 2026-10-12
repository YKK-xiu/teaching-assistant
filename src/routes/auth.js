const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { ok, fail } = require('../utils/response');
const auth = require('../middleware/auth');

// 密码哈希（使用 scrypt，Node 内置，无需额外依赖）
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 注册
router.post('/register', (req, res) => {
  const { username, password, display_name = '' } = req.body;
  if (!username || !password) return fail(res, '用户名和密码不能为空');
  if (username.length < 2) return fail(res, '用户名至少 2 个字符');
  if (password.length < 6) return fail(res, '密码至少 6 个字符');

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return fail(res, '该用户名已被注册');

  const info = db.prepare(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
  ).run(username, hashPassword(password), display_name || username);

  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, info.lastInsertRowid);

  ok(res, {
    token,
    user: { id: info.lastInsertRowid, username, display_name: display_name || username }
  }, '注册成功');
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return fail(res, '用户名和密码不能为空');

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return fail(res, '用户名或密码错误');

  let valid = false;
  try {
    valid = verifyPassword(password, user.password_hash);
  } catch (e) {
    valid = false;
  }
  if (!valid) return fail(res, '用户名或密码错误');

  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  ok(res, {
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name || user.username }
  }, '登录成功');
});

// 登出
router.post('/logout', auth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  ok(res, null, '已退出登录');
});

// 获取当前用户信息
router.get('/me', auth, (req, res) => {
  ok(res, req.user);
});

module.exports = router;
