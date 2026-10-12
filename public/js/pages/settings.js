// 设置页面
const SettingsPage = {
  render() {
    document.getElementById('page-title').textContent = '设置';
    document.getElementById('content').innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px;">数据备份</h2>
        <p style="color:var(--text-muted);margin-bottom:16px;">导出所有数据（数据库 + 附件）为压缩包，建议定期备份以防数据丢失。</p>
        <button class="btn btn-primary" onclick="SettingsPage.exportData()">📦 导出全部数据</button>
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px;">关于</h2>
        <p style="color:var(--text-muted);">
          教学助手 v1.0 - 面向独立教培老师的教学管理工具。<br>
          技术栈：Node.js + Express + SQLite + 原生 JS。<br>
          数据存储在本地，可部署到任意支持 Node.js 的服务器。
        </p>
      </div>
    `;
  },

  exportData() {
    showToast('正在打包数据，请稍候...', '');
    // 触发下载
    const a = document.createElement('a');
    a.href = '/api/export';
    a.click();
    setTimeout(() => showToast('导出完成', 'success'), 1500);
  }
};
