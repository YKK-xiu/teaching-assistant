// 登录 / 注册页面
const AuthPage = {
  mode: 'login', // 'login' | 'register'

  render() {
    document.getElementById('page-title').textContent = '登录';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div style="max-width:400px;margin:60px auto;">
        <div class="card" style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">📚</div>
            <h2 style="margin-top:8px;">教学助手</h2>
            <p style="color:var(--text-muted);font-size:13px;">${this.mode === 'login' ? '登录以管理你的教学数据' : '创建账号，数据独立存储'}</p>
          </div>

          <div id="auth-form">
            ${this.mode === 'register' ? `
              <div class="form-group">
                <label>昵称（可选）</label>
                <input type="text" id="reg-display" class="form-control" placeholder="显示名称">
              </div>
            ` : ''}
            <div class="form-group">
              <label>用户名</label>
              <input type="text" id="auth-username" class="form-control" placeholder="请输入用户名" autocomplete="username">
            </div>
            <div class="form-group">
              <label>密码</label>
              <input type="password" id="auth-password" class="form-control" placeholder="请输入密码" autocomplete="${this.mode === 'login' ? 'current-password' : 'new-password'}">
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center;" id="auth-submit">
              ${this.mode === 'login' ? '登 录' : '注 册'}
            </button>
          </div>

          <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-muted);">
            ${this.mode === 'login'
              ? '还没有账号？<a href="#" id="switch-mode" style="color:var(--primary);">立即注册</a>'
              : '已有账号？<a href="#" id="switch-mode" style="color:var(--primary);">去登录</a>'}
          </div>
        </div>
      </div>
    `;

    document.getElementById('auth-submit').onclick = () => this.submit();
    document.getElementById('switch-mode').onclick = (e) => {
      e.preventDefault();
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.render();
    };

    // 回车提交
    ['auth-username', 'auth-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') this.submit(); });
    });
  },

  async submit() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    try {
      const displayName = this.mode === 'register'
        ? document.getElementById('reg-display').value.trim()
        : '';
      const url = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await API.post(url, { username, password, display_name: displayName });

      Auth.setToken(data.token);
      Auth.setUser(data.user);
      showToast(this.mode === 'login' ? '登录成功' : '注册成功');

      // 刷新用户信息显示
      if (typeof updateTopbarUser === 'function') updateTopbarUser();

      location.hash = '#/';
    } catch (e) {
      showToast(e.message);
    }
  }
};

// 登出
async function doLogout() {
  try {
    await API.post('/api/auth/logout');
  } catch (e) { /* ignore */ }
  Auth.logout();
  if (typeof updateTopbarUser === 'function') updateTopbarUser();
  location.hash = '#/login';
}
