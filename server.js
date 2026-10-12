const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由注册
const auth = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const knowledgeRoutes = require('./src/routes/knowledge');
const questionRoutes = require('./src/routes/questions');
const paperRoutes = require('./src/routes/papers');
const lessonPlanRoutes = require('./src/routes/lessonPlans');
const researchRoutes = require('./src/routes/research');
const studentRoutes = require('./src/routes/students');
const courseRoutes = require('./src/routes/courses');
const attachmentRoutes = require('./src/routes/attachments');
const exportRoutes = require('./src/routes/export');

// 认证相关路由无需登录
app.use('/api/auth', authRoutes);

// 业务路由均需登录
app.use('/api/knowledge-points', auth, knowledgeRoutes);
app.use('/api/questions', auth, questionRoutes);
app.use('/api/papers', auth, paperRoutes);
app.use('/api/lesson-plans', auth, lessonPlanRoutes);
app.use('/api/research', auth, researchRoutes);
app.use('/api/students', auth, studentRoutes);
app.use('/api/courses', auth, courseRoutes);
app.use('/api/attachments', auth, attachmentRoutes);
app.use('/api/export', auth, exportRoutes);

// 404 处理（API）
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `路由 ${req.method} ${req.path} 不存在` });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Payload Too Large', message: '文件过大，最大支持 50MB' });
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`教学助手已启动: http://localhost:${PORT}`);
});
