// 教研页面
const ResearchPage = {
  async render() {
    document.getElementById('page-title').textContent = '教研';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="toolbar">
        <input type="text" id="r-search" class="form-control" placeholder="搜索教研笔记..." style="flex:1;">
        <select id="r-tag" class="form-control"><option value="">全部标签</option></select>
        <button class="btn btn-primary" onclick="ResearchPage.openForm()">+ 新建教研</button>
      </div>
      <div id="r-list"></div>
    `;
    document.getElementById('r-search').addEventListener('input', () => this.load());
    document.getElementById('r-tag').addEventListener('change', () => this.load());
    await this.loadTags();
    await this.load();
  },

  async loadTags() {
    try {
      const tags = await API.get('/api/research/tags/list');
      document.getElementById('r-tag').innerHTML = '<option value="">全部标签</option>' + tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    } catch (e) { /* ignore */ }
  },

  async load() {
    const q = document.getElementById('r-search').value;
    const tag = document.getElementById('r-tag').value;
    let url = '/api/research?';
    if (q) url += 'q=' + encodeURIComponent(q) + '&';
    if (tag) url += 'tag=' + encodeURIComponent(tag);
    try {
      const list = await API.get(url);
      const el = document.getElementById('r-list');
      if (list.length === 0) {
        el.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">🔬</div>暂无教研笔记</div></div>';
        return;
      }
      el.innerHTML = list.map(r => `
        <div class="card" style="cursor:pointer;" onclick="ResearchPage.view(${r.id})">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <h3 style="margin-bottom:4px;">${escapeHtml(r.title)}</h3>
              <div style="color:var(--text-muted);font-size:13px;">${r.note_date || '未设日期'}${r.tags ? ' · ' + escapeHtml(r.tags) : ''}</div>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();ResearchPage.openForm(${r.id})">编辑</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();ResearchPage.del(${r.id})">删除</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) { showToast(e.message, 'error'); }
  },

  async view(id) {
    try {
      const r = await API.get('/api/research/' + id);
      openModal(r.title, `
        <div style="color:var(--text-muted);margin-bottom:12px;">${r.note_date || ''}${r.tags ? ' · ' + escapeHtml(r.tags) : ''}</div>
        ${(r.knowledge_points || []).length ? `<div style="margin-bottom:12px;"><strong>关联知识点：</strong>${r.knowledge_points.map(k => `<span class="badge">${escapeHtml(k.title)}</span>`).join(' ')}</div>` : ''}
        <div style="border:1px solid var(--border);padding:12px;border-radius:8px;min-height:100px;">${r.content || '<em style="color:var(--text-muted)">无内容</em>'}</div>
      `, `<button class="btn btn-secondary" onclick="closeModal()">关闭</button> <button class="btn btn-primary" onclick="closeModal();ResearchPage.openForm(${r.id})">编辑</button>`);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async openForm(id = null) {
    let r = { title: '', note_date: today(), content: '', tags: '', knowledge_points: [] };
    if (id) { try { r = await API.get('/api/research/' + id); } catch (e) { showToast(e.message, 'error'); return; } }
    openModal(id ? '编辑教研' : '新建教研', `
      <div class="form-group"><label>标题</label><input type="text" id="r-title" class="form-control" value="${escapeHtml(r.title)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>日期</label><input type="date" id="r-date" class="form-control" value="${r.note_date}"></div>
        <div class="form-group"><label>标签（逗号分隔）</label><input type="text" id="r-tags" class="form-control" value="${escapeHtml(r.tags)}" placeholder="如：教学法,反思"></div>
      </div>
      <div class="form-group"><label>关联知识点</label><div id="r-kp-select"></div></div>
      <div class="form-group"><label>内容</label><div id="r-editor"></div></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="ResearchPage.save(${id})">保存</button>
    `);
    window.__rEditor = createEditor('r-editor', r.content || '');
    await renderKnowledgeMultiSelect('r-kp-select', (r.knowledge_points || []).map(k => k.id));
  },

  async save(id) {
    const title = document.getElementById('r-title').value.trim();
    if (!title) { showToast('标题不能为空', 'error'); return; }
    const data = {
      title,
      note_date: document.getElementById('r-date').value,
      tags: document.getElementById('r-tags').value,
      content: window.__rEditor.getContent(),
      knowledge_point_ids: getSelectedKpIds('r-kp-select')
    };
    try {
      if (id) await API.put('/api/research/' + id, data);
      else await API.post('/api/research', data);
      showToast('保存成功', 'success');
      closeModal();
      await this.loadTags();
      await this.load();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该教研笔记？')) return;
    try { await API.del('/api/research/' + id); showToast('删除成功', 'success'); await this.load(); }
    catch (e) { showToast(e.message, 'error'); }
  }
};
