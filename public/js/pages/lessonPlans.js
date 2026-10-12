// 备课页面
const LessonPlansPage = {
  async render() {
    document.getElementById('page-title').textContent = '备课';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="toolbar">
        <input type="text" id="lp-search" class="form-control" placeholder="搜索备课..." style="flex:1;">
        <select id="lp-course" class="form-control"><option value="">全部课程</option></select>
        <button class="btn btn-primary" onclick="LessonPlansPage.openForm()">+ 新建备课</button>
      </div>
      <div id="lp-list"></div>
    `;
    document.getElementById('lp-search').addEventListener('input', () => this.load());
    document.getElementById('lp-course').addEventListener('change', () => this.load());
    await this.loadCourses();
    await this.load();
  },

  async loadCourses() {
    try {
      const courses = await API.get('/api/lesson-plans/courses/list');
      const sel = document.getElementById('lp-course');
      sel.innerHTML = '<option value="">全部课程</option>' + courses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    } catch (e) { /* ignore */ }
  },

  async load() {
    const q = document.getElementById('lp-search').value;
    const course = document.getElementById('lp-course').value;
    let url = '/api/lesson-plans?';
    if (q) url += 'q=' + encodeURIComponent(q) + '&';
    if (course) url += 'course=' + encodeURIComponent(course);
    try {
      const list = await API.get(url);
      const el = document.getElementById('lp-list');
      if (list.length === 0) {
        el.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">📝</div>暂无备课记录</div></div>';
        return;
      }
      el.innerHTML = list.map(lp => `
        <div class="card" style="cursor:pointer;" onclick="LessonPlansPage.view(${lp.id})">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <h3 style="margin-bottom:4px;">${escapeHtml(lp.title)}</h3>
              <div style="color:var(--text-muted);font-size:13px;">
                ${lp.course_name ? `课程: ${escapeHtml(lp.course_name)} · ` : ''}${lp.plan_date || '未设日期'}
              </div>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();LessonPlansPage.openForm(${lp.id})">编辑</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();LessonPlansPage.del(${lp.id})">删除</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) { showToast(e.message, 'error'); }
  },

  async view(id) {
    try {
      const lp = await API.get('/api/lesson-plans/' + id);
      const atts = await API.get('/api/attachments?entity_type=lesson_plan&entity_id=' + id).catch(() => []);
      openModal(lp.title, `
        <div style="color:var(--text-muted);margin-bottom:12px;">${lp.course_name ? `课程: ${escapeHtml(lp.course_name)} · ` : ''}${lp.plan_date || '未设日期'}</div>
        ${(lp.knowledge_points || []).length ? `<div style="margin-bottom:12px;"><strong>关联知识点：</strong>${lp.knowledge_points.map(k => `<span class="badge">${escapeHtml(k.title)}</span>`).join(' ')}</div>` : ''}
        <div style="border:1px solid var(--border);padding:12px;border-radius:8px;min-height:100px;">${lp.content || '<em style="color:var(--text-muted)">无内容</em>'}</div>
        ${atts.length ? `<div style="margin-top:16px;"><strong>附件：</strong>${atts.map(a => `<div><a href="/api/attachments/${a.id}/download">📎 ${escapeHtml(a.original_name)}</a></div>`).join('')}</div>` : ''}
      `, `<button class="btn btn-secondary" onclick="closeModal()">关闭</button> <button class="btn btn-primary" onclick="closeModal();LessonPlansPage.openForm(${lp.id})">编辑</button>`);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async openForm(id = null) {
    let lp = { title: '', course_name: '', plan_date: today(), content: '', knowledge_points: [] };
    if (id) { try { lp = await API.get('/api/lesson-plans/' + id); } catch (e) { showToast(e.message, 'error'); return; } }
    openModal(id ? '编辑备课' : '新建备课', `
      <div class="form-group"><label>标题</label><input type="text" id="lp-title" class="form-control" value="${escapeHtml(lp.title)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>课程名称</label><input type="text" id="lp-course-name" class="form-control" value="${escapeHtml(lp.course_name)}" placeholder="如：高一数学"></div>
        <div class="form-group"><label>日期</label><input type="date" id="lp-date" class="form-control" value="${lp.plan_date}"></div>
      </div>
      <div class="form-group"><label>关联知识点</label><div id="lp-kp-select"></div></div>
      <div class="form-group"><label>内容</label><div id="lp-editor"></div></div>
      ${id ? `<div class="form-group"><label>附件上传</label><input type="file" id="lp-file"><div id="lp-atts"></div></div>` : ''}
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="LessonPlansPage.save(${id})">保存</button>
    `);
    window.__lpEditor = createEditor('lp-editor', lp.content || '');
    await renderKnowledgeMultiSelect('lp-kp-select', (lp.knowledge_points || []).map(k => k.id));
    if (id) this.loadAttachments(id);
  },

  async loadAttachments(id) {
    try {
      const atts = await API.get('/api/attachments?entity_type=lesson_plan&entity_id=' + id);
      const el = document.getElementById('lp-atts');
      if (el) el.innerHTML = atts.map(a => `<div><a href="/api/attachments/${a.id}/download">📎 ${escapeHtml(a.original_name)}</a> <button class="btn-ghost btn-sm" onclick="LessonPlansPage.delAtt(${a.id}, ${id})">删除</button></div>`).join('');
    } catch (e) { /* ignore */ }
  },

  async delAtt(attId, lpId) {
    try { await API.del('/api/attachments/' + attId); showToast('附件已删除', 'success'); this.loadAttachments(lpId); }
    catch (e) { showToast(e.message, 'error'); }
  },

  async save(id) {
    const title = document.getElementById('lp-title').value.trim();
    if (!title) { showToast('标题不能为空', 'error'); return; }
    const data = {
      title,
      course_name: document.getElementById('lp-course-name').value,
      plan_date: document.getElementById('lp-date').value,
      content: window.__lpEditor.getContent(),
      knowledge_point_ids: getSelectedKpIds('lp-kp-select')
    };
    try {
      let lpId = id;
      if (id) await API.put('/api/lesson-plans/' + id, data);
      else { const r = await API.post('/api/lesson-plans', data); lpId = r.id; }
      // 上传附件
      const fileInput = document.getElementById('lp-file');
      if (fileInput && fileInput.files[0]) {
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        fd.append('entity_type', 'lesson_plan');
        fd.append('entity_id', lpId);
        await API.upload('/api/attachments', fd);
      }
      showToast('保存成功', 'success');
      closeModal();
      await this.loadCourses();
      await this.load();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该备课？')) return;
    try { await API.del('/api/lesson-plans/' + id); showToast('删除成功', 'success'); await this.load(); }
    catch (e) { showToast(e.message, 'error'); }
  }
};
