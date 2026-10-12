// 题库页面
const QuestionsPage = {
  list: [],

  async render() {
    document.getElementById('page-title').textContent = '题库';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="toolbar">
        <input type="text" id="q-search" class="form-control" placeholder="搜索题干..." style="flex:1;">
        <select id="q-type" class="form-control">
          <option value="">全部题型</option>
          <option value="choice">选择题</option>
          <option value="fill">填空题</option>
          <option value="answer">解答题</option>
          <option value="other">其他</option>
        </select>
        <select id="q-difficulty" class="form-control">
          <option value="">全部难度</option>
          <option value="1">简单</option>
          <option value="2">中等</option>
          <option value="3">困难</option>
        </select>
        <button class="btn btn-primary" onclick="QuestionsPage.openForm()">+ 新建题目</button>
      </div>
      <div class="card" style="padding:0;">
        <table>
          <thead>
            <tr><th>题干</th><th>题型</th><th>难度</th><th>分值</th><th>知识点</th><th>操作</th></tr>
          </thead>
          <tbody id="q-tbody"></tbody>
        </table>
      </div>
    `;
    document.getElementById('q-search').addEventListener('input', () => this.load());
    document.getElementById('q-type').addEventListener('change', () => this.load());
    document.getElementById('q-difficulty').addEventListener('change', () => this.load());
    await this.load();
  },

  async load() {
    const q = document.getElementById('q-search').value;
    const type = document.getElementById('q-type').value;
    const diff = document.getElementById('q-difficulty').value;
    let url = '/api/questions?';
    if (q) url += 'q=' + encodeURIComponent(q) + '&';
    if (type) url += 'type=' + type + '&';
    if (diff) url += 'difficulty=' + diff;
    try {
      this.list = await API.get(url);
      this.renderList();
    } catch (e) { showToast(e.message, 'error'); }
  },

  renderList() {
    const tbody = document.getElementById('q-tbody');
    if (this.list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty" style="padding:30px;"><div class="empty-icon">❓</div>暂无题目</div></td></tr>';
      return;
    }
    const typeMap = { choice: '选择', fill: '填空', answer: '解答', other: '其他' };
    const diffMap = { 1: '简单', 2: '中等', 3: '困难' };
    const diffClass = { 1: 'badge-success', 2: 'badge-warning', 3: 'badge-danger' };
    tbody.innerHTML = this.list.map(q => `
      <tr>
        <td style="max-width:400px;">${q.stem.replace(/<[^>]+>/g, '').slice(0, 60)}${q.stem.length > 60 ? '...' : ''}</td>
        <td>${typeMap[q.question_type] || q.question_type}</td>
        <td><span class="badge ${diffClass[q.difficulty]}">${diffMap[q.difficulty] || q.difficulty}</span></td>
        <td>${q.score}</td>
        <td>${(q.knowledge_points || []).map(k => k.title).join(', ') || '-'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="QuestionsPage.openForm(${q.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="QuestionsPage.del(${q.id})">删除</button>
        </td>
      </tr>
    `).join('');
  },

  async openForm(id = null) {
    let q = { stem: '', question_type: 'choice', answer: '', analysis: '', difficulty: 2, score: 0, tags: '', knowledge_points: [] };
    if (id) {
      try { q = await API.get('/api/questions/' + id); } catch (e) { showToast(e.message, 'error'); return; }
    }
    openModal(id ? '编辑题目' : '新建题目', `
      <div class="form-group"><label>题干</label><div id="q-stem-editor"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-group"><label>题型</label>
          <select id="q-type" class="form-control">
            <option value="choice" ${q.question_type === 'choice' ? 'selected' : ''}>选择题</option>
            <option value="fill" ${q.question_type === 'fill' ? 'selected' : ''}>填空题</option>
            <option value="answer" ${q.question_type === 'answer' ? 'selected' : ''}>解答题</option>
            <option value="other" ${q.question_type === 'other' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="form-group"><label>难度</label>
          <select id="q-diff" class="form-control">
            <option value="1" ${q.difficulty == 1 ? 'selected' : ''}>简单</option>
            <option value="2" ${q.difficulty == 2 ? 'selected' : ''}>中等</option>
            <option value="3" ${q.difficulty == 3 ? 'selected' : ''}>困难</option>
          </select>
        </div>
        <div class="form-group"><label>分值</label><input type="number" id="q-score" class="form-control" value="${q.score}" step="0.5"></div>
      </div>
      <div class="form-group"><label>答案</label><div id="q-answer-editor"></div></div>
      <div class="form-group"><label>解析</label><div id="q-analysis-editor"></div></div>
      <div class="form-group"><label>关联知识点</label><div id="q-kp-select"></div></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="QuestionsPage.save(${id})">保存</button>
    `);
    const stemEditor = createEditor('q-stem-editor', q.stem || '');
    const answerEditor = createEditor('q-answer-editor', q.answer || '');
    const analysisEditor = createEditor('q-analysis-editor', q.analysis || '');
    window.__qEditors = { stemEditor, answerEditor, analysisEditor };
    await renderKnowledgeMultiSelect('q-kp-select', (q.knowledge_points || []).map(k => k.id));
  },

  async save(id) {
    const data = {
      stem: window.__qEditors.stemEditor.getContent(),
      question_type: document.getElementById('q-type').value,
      difficulty: parseInt(document.getElementById('q-diff').value),
      score: parseFloat(document.getElementById('q-score').value) || 0,
      answer: window.__qEditors.answerEditor.getContent(),
      analysis: window.__qEditors.analysisEditor.getContent(),
      knowledge_point_ids: getSelectedKpIds('q-kp-select')
    };
    if (!data.stem.replace(/<[^>]+>/g, '').trim()) { showToast('题干不能为空', 'error'); return; }
    try {
      if (id) await API.put('/api/questions/' + id, data);
      else await API.post('/api/questions', data);
      showToast('保存成功', 'success');
      closeModal();
      await this.load();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该题目？')) return;
    try {
      await API.del('/api/questions/' + id);
      showToast('删除成功', 'success');
      await this.load();
    } catch (e) { showToast(e.message, 'error'); }
  }
};
