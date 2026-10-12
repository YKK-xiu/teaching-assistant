// 通用 API 响应工具
function ok(res, data, message = 'success') {
  res.json({ code: 0, message, data });
}

function fail(res, message = '操作失败', status = 400) {
  res.status(status).json({ code: 1, message, data: null });
}

module.exports = { ok, fail };
