const db = require('../db');

// 认证中间件：从 Authorization header 解析 token，校验后挂载 req.user
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ code: 1, message: '未登录，请先登录', data: null });
  }
  const session = db.prepare(
    'SELECT s.user_id, u.username, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).get(token);
  if (!session) {
    return res.status(401).json({ code: 1, message: '登录已过期，请重新登录', data: null });
  }
  req.user = { id: session.user_id, username: session.username, display_name: session.display_name };
  next();
}

module.exports = auth;
