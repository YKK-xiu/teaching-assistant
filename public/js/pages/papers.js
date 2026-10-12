// 试卷页面
const PapersPage = {
  async render() {
    document.getElementById('page-title').textContent = '试卷';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="toolbar">
        <div style="flex:1;"></div>
        <button class="btn btn-primary" onclick="PapersPage.openCreate()">+ 新建试卷</button>
      </div>
      <div id="papers-list"></div>
    `;
    await this.loadList();
  },

  async loadList() {
    try {
      const papers = await API.get('/api/papers');
      const el = document.getElementById('papers-list');
      if (papers.length === 0) {
        el.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">📄</div>暂无试卷，点击"新建试卷"开始组卷</div></div>';
        return;
      }
      el.innerHTML = papers.map(p => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="margin-bottom:4px;">${escapeHtml(p.title)}</h3>
            <div style="color:var(--text-muted);font-size:13px;">
              ${p.description ? escapeHtml(p.description) : '无描述'} · 
              ${p.duration} 分钟 · 总分 ${p.total_score} · ${p.question_count} 题
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="PapersPage.view(${p.id})">查看</button>
            <button class="btn btn-primary btn-sm" onclick="PapersPage.print(${p.id})">打印</button>
            <button class="btn btn-danger btn-sm" onclick="PapersPage.del(${p.id})">删除</button>
          </div>
        </div>
      `).join('');
    } catch (e) { showToast(e.message, 'error'); }
  },

  async openCreate() {
    const tree = await API.get('/api/knowledge-points/tree').catch(() => []);
    const kpOptions = [];
    function flat(nodes) {
      nodes.forEach(n => { kpOptions.push(n); if (n.children) flat(n.children); });
    }
    flat(tree);
    openModal('新建试卷', `
      <div class="form-group"><label>试卷标题</label><input type="text" id="p-title" class="form-control" placeholder="如：函数单元测试"></div>
      <div class="form-group"><label>描述</label><input type="text" id="p-desc" class="form-control" placeholder="选填"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>考试时长（分钟）</label><input type="number" id="p-duration" class="form-control" value="60"></div>
        <div class="form-group"><label>总分</label><input type="number" id="p-total" class="form-control" value="100"></div>
      </div>
      <div class="form-group">
        <label>组卷方式</label>
        <div>
          <label><input type="radio" name="p-mode" value="auto" checked onchange="PapersPage.toggleMode()"> 自动组卷（按知识点筛选）</label>
          <label style="margin-left:16px;"><input type="radio" name="p-mode" value="manual" onchange="PapersPage.toggleMode()"> 手动选题</label>
        </div>
      </div>
      <div id="p-auto-mode">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label>知识点</label>
            <select id="p-kp" class="form-control">
              <option value="">全部</option>
              ${kpOptions.map(k => `<option value="${k.id}">${escapeHtml(k.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>难度</label>
            <select id="p-diff" class="form-control">
              <option value="">全部</option><option value="1">简单</option><option value="2">中等</option><option value="3">困难</option>
            </select>
          </div>
          <div class="form-group"><label>题目数量</label><input type="number" id="p-limit" class="form-control" value="10"></div>
        </div>
      </div>
      <div id="p-manual-mode" style="display:none;">
        <div class="form-group"><label>选择题库中的题目（可搜索）</label>
          <input type="text" id="p-qsearch" class="form-control" placeholder="搜索题干..." oninput="PapersPage.searchQuestions()">
          <div id="p-qlist" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;margin-top:8px;padding:8px;"></div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="PapersPage.create()">创建试卷</button>
    `);
    window.__selectedQuestions = [];
    this.searchQuestions();
  },

  toggleMode() {
    const mode = document.querySelector('input[name="p-mode"]:checked').value;
    document.getElementById('p-auto-mode').style.display = mode === 'auto' ? 'block' : 'none';
    document.getElementById('p-manual-mode').style.display = mode === 'manual' ? 'block' : 'none';
  },

  async searchQuestions() {
    const q = document.getElementById('p-qsearch')?.value || '';
    try {
      const list = await API.get('/api/questions?q=' + encodeURIComponent(q));
      const el = document.getElementById('p-qlist');
      el.innerHTML = list.map(item => {
        const checked = (window.__selectedQuestions || []).includes(item.id) ? 'checked' : '';
        return `<label style="display:block;padding:4px 0;"><input type="checkbox" value="${item.id}" ${checked} onchange="PapersPage.toggleQ(${item.id})"> ${escapeHtml(item.stem.replace(/<[^>]+>/g, '').slice(0, 80))}</label>`;
      }).join('') || '<p style="color:var(--text-muted)">无题目</p>';
    } catch (e) { /* ignore */ }
  },

  toggleQ(id) {
    if (!window.__selectedQuestions) window.__selectedQuestions = [];
    const i = window.__selectedQuestions.indexOf(id);
    if (i >= 0) window.__selectedQuestions.splice(i, 1);
    else window.__selectedQuestions.push(id);
  },

  async create() {
    const title = document.getElementById('p-title').value.trim();
    if (!title) { showToast('请输入试卷标题', 'error'); return; }
    const mode = document.querySelector('input[name="p-mode"]:checked').value;
    const data = {
      title,
      description: document.getElementById('p-desc').value,
      duration: parseInt(document.getElementById('p-duration').value) || 0,
      total_score: parseFloat(document.getElementById('p-total').value) || 0
    };
    try {
      if (mode === 'auto') {
        const kp = document.getElementById('p-kp').value;
        const diff = document.getElementById('p-diff').value;
        const limit = document.getElementById('p-limit').value;
        let url = '/api/questions/filter/for-paper?';
        if (kp) url += 'knowledge_point_id=' + kp + '&';
        if (diff) url += 'difficulty=' + diff + '&';
        if (limit) url += 'limit=' + limit;
        const questions = await API.get(url);
        data.question_ids = questions.map(q => q.id);
        if (data.question_ids.length === 0) { showToast('未找到符合条件的题目', 'error'); return; }
      } else {
        data.question_ids = window.__selectedQuestions || [];
        if (data.question_ids.length === 0) { showToast('请至少选择一道题目', 'error'); return; }
      }
      await API.post('/api/papers', data);
      showToast('试卷创建成功', 'success');
      closeModal();
      await this.loadList();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async view(id) {
    try {
      const paper = await API.get('/api/papers/' + id);
      openModal(paper.title, `
        <p style="color:var(--text-muted);margin-bottom:12px;">${paper.description || ''} · 时长 ${paper.duration} 分钟 · 总分 ${paper.total_score}</p>
        ${paper.questions.map((q, i) => `
          <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);">
            <div><strong>${i + 1}. </strong>（${q.paper_score || q.score}分）${q.stem}</div>
            ${q.answer ? `<div style="margin-top:4px;color:var(--success);"><strong>答案：</strong>${q.answer}</div>` : ''}
            ${q.analysis ? `<div style="margin-top:4px;color:var(--text-muted);"><strong>解析：</strong>${q.analysis}</div>` : ''}
          </div>
        `).join('')}
      `, `<button class="btn btn-secondary" onclick="closeModal()">关闭</button>`);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async print(id) {
    try {
      const paper = await API.get('/api/papers/' + id);
      const w = window.open('', '_blank');
      w.document.write(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(paper.title)}</title>
        <style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;}
        h1{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;}
        .info{text-align:center;color:#666;margin:12px 0;}
        .q{margin:20px 0;} .q-title{font-weight:bold;margin-bottom:8px;}
        @media print{body{margin:0;}}</style></head><body>
        <h1>${escapeHtml(paper.title)}</h1>
        <div class="info">${paper.duration > 0 ? `考试时长：${paper.duration} 分钟` : ''} ${paper.total_score > 0 ? `总分：${paper.total_score} 分` : ''}</div>
        ${paper.questions.map((q, i) => `
          <div class="q">
            <div class="q-title">${i + 1}. （${q.paper_score || q.score}分）</div>
            <div>${q.stem}</div>
          </div>
        `).join('')}
        </body></html>
      `);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该试卷？')) return;
    try {
      await API.del('/api/papers/' + id);
      showToast('删除成功', 'success');
      await this.loadList();
    } catch (e) { showToast(e.message, 'error'); }
  }
};
