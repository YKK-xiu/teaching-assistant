// 主应用 - 路由与导航
const routes = {
  '/': DashboardPage,
  '/lesson-plans': LessonPlansPage,
  '/research': ResearchPage,
  '/knowledge': KnowledgePage,
  '/questions': QuestionsPage,
  '/papers': PapersPage,
  '/students': StudentsPage,
  '/courses': CoursesPage,
  '/settings': SettingsPage,
  '/login': AuthPage
};

const titles = {
  '/': '首页',
  '/lesson-plans': '备课',
  '/research': '教研',
  '/knowledge': '知识点',
  '/questions': '题库',
  '/papers': '试卷',
  '/students': '学生',
  '/courses': '课程表',
  '/settings': '设置',
  '/login': '登录'
};

// 不需要登录的路由
const publicRoutes = ['/login'];

function getRoute() {
  const hash = location.hash.slice(1) || '/';
  return hash in routes ? hash : '/';
}

function updateNav() {
  const current = getRoute();
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === current);
  });
}

// 更新顶栏用户信息
function updateTopbarUser() {
  let userBox = document.getElementById('topbar-user');
  if (!userBox) {
    userBox = document.createElement('div');
    userBox.id = 'topbar-user';
    userBox.style.cssText = 'display:flex;align-items:center;gap:12px;font-size:13px;';
    document.getElementById('topbar').appendChild(userBox);
    document.getElementById('topbar').style.display = 'flex';
    document.getElementById('topbar').style.justifyContent = 'space-between';
    document.getElementById('topbar').style.alignItems = 'center';
  }
  const user = Auth.getUser();
  if (user) {
    userBox.innerHTML = `
      <span style="color:var(--text-muted);">👤 ${escapeHtml(user.display_name || user.username)}</span>
      <button class="btn btn-ghost btn-sm" onclick="doLogout()">退出</button>
    `;
  } else {
    userBox.innerHTML = '';
  }
}

async function router() {
  const route = getRoute();

  // 路由守卫：未登录且访问非公开路由 → 跳转登录
  if (!publicRoutes.includes(route) && !Auth.isLoggedIn()) {
    location.hash = '#/login';
    return;
  }
  // 已登录访问登录页 → 跳转首页
  if (route === '/login' && Auth.isLoggedIn()) {
    location.hash = '#/';
    return;
  }

  document.getElementById('page-title').textContent = titles[route] || '首页';
  updateNav();
  updateTopbarUser();

  const page = routes[route];
  if (page && page.render) {
    try {
      await page.render();
    } catch (e) {
      document.getElementById('content').innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>页面加载失败: ${escapeHtml(e.message)}</p></div>`;
    }
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// 如果没有 hash，设置默认
if (!location.hash) {
  location.hash = Auth.isLoggedIn() ? '#/' : '#/login';
}
