// 首页 Dashboard
const DashboardPage = {
  async render() {
    document.getElementById('page-title').textContent = '首页';
    const content = document.getElementById('content');
    content.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div><p>加载中...</p></div>';

    try {
      // 并行加载各模块统计
      const [students, courses, kps, questions, papers, lessonPlans] = await Promise.all([
        API.get('/api/students').catch(() => []),
        API.get('/api/courses').catch(() => []),
        API.get('/api/knowledge-points/tree').catch(() => []),
        API.get('/api/questions').catch(() => []),
        API.get('/api/papers').catch(() => []),
        API.get('/api/lesson-plans').catch(() => [])
      ]);

      // 今日课程
      const today = new Date();
      const dow = today.getDay(); // 0=周日
      const todayCourses = courses.filter(c => parseInt(c.day_of_week) === dow);

      content.innerHTML = `
        <div class="card">
          <h2 style="margin-bottom:16px;">数据概览</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;">
            <div style="text-align:center;padding:16px;background:#e4e9ed;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#5f7689;">${students.length}</div>
              <div style="color:var(--text-muted)">学生总数</div>
            </div>
            <div style="text-align:center;padding:16px;background:#e4e9e2;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#6b8567;">${courses.length}</div>
              <div style="color:var(--text-muted)">课程数</div>
            </div>
            <div style="text-align:center;padding:16px;background:#ebe6dc;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#9a8560;">${countKp(kps)}</div>
              <div style="color:var(--text-muted)">知识点</div>
            </div>
            <div style="text-align:center;padding:16px;background:#ece2e2;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#9e6e6e;">${questions.length}</div>
              <div style="color:var(--text-muted)">题目数</div>
            </div>
            <div style="text-align:center;padding:16px;background:#e6e3ea;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#746b85;">${papers.length}</div>
              <div style="color:var(--text-muted)">试卷数</div>
            </div>
            <div style="text-align:center;padding:16px;background:#e2e9e8;border-radius:8px;">
              <div style="font-size:32px;font-weight:700;color:#5f7d79;">${lessonPlans.length}</div>
              <div style="color:var(--text-muted)">备课数</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2 style="margin-bottom:16px;">今日课程（${today.toLocaleDateString('zh-CN')}）</h2>
          ${todayCourses.length === 0 ? '<p style="color:var(--text-muted)">今天没有课程安排</p>' :
            todayCourses.map(c => `
              <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
                <strong>${escapeHtml(c.name)}</strong>
                <span class="badge">${c.start_time} - ${c.end_time}</span>
                ${c.location ? `<span style="color:var(--text-muted);margin-left:8px;">📍 ${escapeHtml(c.location)}</span>` : ''}
                ${c.students && c.students.length ? `<div style="margin-top:4px;color:var(--text-muted);font-size:13px;">学生: ${c.students.map(s => escapeHtml(s.name)).join('、')}</div>` : ''}
              </div>
            `).join('')
          }
        </div>

        <div class="card">
          <h2 style="margin-bottom:16px;">快捷入口</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <a href="#/lesson-plans" class="btn btn-secondary" style="justify-content:center;">📝 新建备课</a>
            <a href="#/knowledge" class="btn btn-secondary" style="justify-content:center;">🧠 知识点库</a>
            <a href="#/questions" class="btn btn-secondary" style="justify-content:center;">❓ 题库管理</a>
            <a href="#/students" class="btn btn-secondary" style="justify-content:center;">👨‍🎓 学生档案</a>
            <a href="#/courses" class="btn btn-secondary" style="justify-content:center;">📅 排课程表</a>
            <a href="#/papers" class="btn btn-secondary" style="justify-content:center;">📄 组卷出卷</a>
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>加载失败: ${escapeHtml(e.message)}</p></div>`;
    }
  }
};

function countKp(tree) {
  let count = 0;
  function walk(nodes) {
    nodes.forEach(n => { count++; if (n.children) walk(n.children); });
  }
  walk(tree || []);
  return count;
}
