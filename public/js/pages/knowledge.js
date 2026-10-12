// 知识点库页面
const KnowledgePage = {
  tree: [],
  currentId: null,
  editor: null,

  async render() {
    document.getElementById('page-title').textContent = '知识点';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;height:calc(100vh - 140px);">
        <div class="card" style="overflow:auto;">
          <div class="toolbar">
            <input type="text" id="kp-search" class="form-control" placeholder="搜索知识点..." style="flex:1;">
            <button class="btn btn-primary btn-sm" onclick="KnowledgePage.addRoot()">+ 根节点</button>
          </div>
          <div id="kp-tree"></div>
        </div>
        <div class="card" style="overflow:auto;" id="kp-detail">
          <div class="empty"><div class="empty-icon">🧠</div><p>请从左侧选择或新建知识点</p></div>
        </div>
      </div>
    `;
    document.getElementById('kp-search').addEventListener('input', e => this.search(e.target.value));
    await this.loadTree();
  },

  async loadTree() {
    try {
      this.tree = await API.get('/api/knowledge-points/tree');
      this.renderTree();
    } catch (e) { showToast(e.message, 'error'); }
  },

  renderTree() {
    const container = document.getElementById('kp-tree');
    if (!container) return;
    let html = '';
    function renderNodes(nodes, level) {
      nodes.forEach(n => {
        html += `<div class="kp-node" style="margin:4px 0;cursor:pointer;">
          <div onclick="KnowledgePage.select(${n.id})" style="padding:6px 8px;border-radius:4px;${KnowledgePage.currentId === n.id ? 'background:var(--primary);color:#fff;' : ''}" onmouseover="this.style.background=KnowledgePage.currentId===${n.id}?'var(--primary)':'#ebe6dc'" onmouseout="this.style.background=KnowledgePage.currentId===${n.id}?'var(--primary)':''">
            <span style="margin-left:${level * 16}px;">${level > 0 ? '└ ' : ''}${escapeHtml(n.title)}</span>
            <span style="float:right;font-size:12px;">
              <button class="btn-ghost btn-sm" onclick="event.stopPropagation();KnowledgePage.addChild(${n.id})" title="添加子节点">+</button>
              <button class="btn-ghost btn-sm" onclick="event.stopPropagation();KnowledgePage.deleteNode(${n.id})" title="删除">×</button>
            </span>
          </div>
        </div>`;
        if (n.children && n.children.length) renderNodes(n.children, level + 1);
      });
    }
    if (this.tree.length === 0) {
      html = '<p style="color:var(--text-muted);text-align:center;padding:20px;">暂无知识点，点击"+ 根节点"开始创建</p>';
    } else {
      renderNodes(this.tree, 0);
    }
    container.innerHTML = html;
  },

  async search(q) {
    if (!q.trim()) { this.renderTree(); return; }
    try {
      const results = await API.get('/api/knowledge-points/search?q=' + encodeURIComponent(q));
      const container = document.getElementById('kp-tree');
      container.innerHTML = results.map(r =>
        `<div onclick="KnowledgePage.select(${r.id})" style="padding:8px;border-bottom:1px solid var(--border);cursor:pointer;">
          ${escapeHtml(r.title)} <span class="badge">Lv.${r.level}</span>
        </div>`
      ).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px;">无搜索结果</p>';
    } catch (e) { showToast(e.message, 'error'); }
  },

  async select(id) {
    this.currentId = id;
    this.renderTree();
    const detail = document.getElementById('kp-detail');
    try {
      const kp = await API.get('/api/knowledge-points/' + id);
      detail.innerHTML = `
        <div style="margin-bottom:16px;">
          <input type="text" id="kp-title" class="form-control" value="${escapeHtml(kp.title)}" style="font-size:18px;font-weight:600;">
        </div>
        <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;">
            <label>层级</label>
            <select id="kp-level" class="form-control">
              <option value="1" ${kp.level == 1 ? 'selected' : ''}>1 - 学科</option>
              <option value="2" ${kp.level == 2 ? 'selected' : ''}>2 - 章节</option>
              <option value="3" ${kp.level == 3 ? 'selected' : ''}>3 - 知识点</option>
            </select>
          </div>
          <div style="flex:2;min-width:200px;">
            <label>标签（逗号分隔）</label>
            <input type="text" id="kp-tags" class="form-control" value="${escapeHtml(kp.tags)}">
          </div>
        </div>
        <label>内容</label>
        <div id="kp-editor"></div>
        <div style="margin-top:16px;">
          <button class="btn btn-primary" onclick="KnowledgePage.save()">💾 保存</button>
        </div>
      `;
      this.editor = createEditor('kp-editor', kp.content || '');
    } catch (e) {
      detail.innerHTML = `<p style="color:var(--danger)">加载失败: ${escapeHtml(e.message)}</p>`;
    }
  },

  async save() {
    const title = document.getElementById('kp-title').value.trim();
    if (!title) { showToast('标题不能为空', 'error'); return; }
    const data = {
      title,
      content: this.editor ? this.editor.getContent() : '',
      level: parseInt(document.getElementById('kp-level').value),
      tags: document.getElementById('kp-tags').value
    };
    try {
      await API.put('/api/knowledge-points/' + this.currentId, data);
      showToast('保存成功', 'success');
      await this.loadTree();
      this.select(this.currentId);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async addRoot() {
    const title = prompt('请输入根节点名称（如：数学、语文）:');
    if (!title) return;
    try {
      await API.post('/api/knowledge-points', { title, level: 1 });
      showToast('创建成功', 'success');
      await this.loadTree();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async addChild(parentId) {
    const title = prompt('请输入子节点名称:');
    if (!title) return;
    const parent = this.findNode(this.tree, parentId);
    const level = parent ? Math.min(parent.level + 1, 3) : 2;
    try {
      await API.post('/api/knowledge-points', { title, parent_id: parentId, level });
      showToast('创建成功', 'success');
      await this.loadTree();
    } catch (e) { showToast(e.message, 'error'); }
  },

  findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const f = this.findNode(n.children, id);
        if (f) return f;
      }
    }
    return null;
  },

  async deleteNode(id) {
    if (!confirm('确定删除该知识点及其所有子节点？此操作不可恢复。')) return;
    try {
      await API.del('/api/knowledge-points/' + id);
      showToast('删除成功', 'success');
      if (this.currentId === id) {
        this.currentId = null;
        document.getElementById('kp-detail').innerHTML = '<div class="empty"><div class="empty-icon">🧠</div><p>请从左侧选择或新建知识点</p></div>';
      }
      await this.loadTree();
    } catch (e) { showToast(e.message, 'error'); }
  }
};
