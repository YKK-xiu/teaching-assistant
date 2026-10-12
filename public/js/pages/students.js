// 学生档案页面
const StudentsPage = {
  async render() {
    document.getElementById('page-title').textContent = '学生';
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="toolbar">
        <input type="text" id="s-search" class="form-control" placeholder="搜索姓名/学校/联系方式..." style="flex:1;">
        <select id="s-grade" class="form-control"><option value="">全部年级</option></select>
        <button class="btn btn-primary" onclick="StudentsPage.openForm()">+ 新建学生</button>
      </div>
      <div id="s-list"></div>
    `;
    document.getElementById('s-search').addEventListener('input', () => this.load());
    document.getElementById('s-grade').addEventListener('change', () => this.load());
    await this.load();
  },

  async load() {
    const q = document.getElementById('s-search').value;
    const grade = document.getElementById('s-grade').value;
    let url = '/api/students?';
    if (q) url += 'q=' + encodeURIComponent(q) + '&';
    if (grade) url += 'grade=' + encodeURIComponent(grade);
    try {
      const list = await API.get(url);
      // 更新年级筛选
      const grades = [...new Set(list.map(s => s.grade).filter(Boolean))];
      const sel = document.getElementById('s-grade');
      const cur = sel.value;
      sel.innerHTML = '<option value="">全部年级</option>' + grades.map(g => `<option value="${escapeHtml(g)}" ${g === cur ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');
      const el = document.getElementById('s-list');
      if (list.length === 0) {
        el.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">👨‍🎓</div>暂无学生</div></div>';
        return;
      }
      el.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>姓名</th><th>年级</th><th>学校</th><th>联系方式</th><th>操作</th></tr></thead><tbody>${
        list.map(s => `
          <tr>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>${escapeHtml(s.grade) || '-'}</td>
            <td>${escapeHtml(s.school) || '-'}</td>
            <td>${escapeHtml(s.contact) || '-'}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="StudentsPage.view(${s.id})">详情</button>
              <button class="btn btn-secondary btn-sm" onclick="StudentsPage.openForm(${s.id})">编辑</button>
              <button class="btn btn-danger btn-sm" onclick="StudentsPage.del(${s.id})">删除</button>
            </td>
          </tr>`).join('')
      }</tbody></table></div>`;
    } catch (e) { showToast(e.message, 'error'); }
  },

  async view(id) {
    try {
      const s = await API.get('/api/students/' + id);
      openModal(s.name, `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div><strong>年级：</strong>${escapeHtml(s.grade) || '-'}</div>
          <div><strong>学校：</strong>${escapeHtml(s.school) || '-'}</div>
          <div><strong>联系方式：</strong>${escapeHtml(s.contact) || '-'}</div>
          <div><strong>备注：</strong>${escapeHtml(s.remark) || '-'}</div>
        </div>
        ${s.courses && s.courses.length ? `<div style="margin-bottom:16px;"><strong>关联课程：</strong>${s.courses.map(c => `<span class="badge">${escapeHtml(c.name)}</span>`).join(' ')}</div>` : ''}
        <h4 style="margin-bottom:12px;">学习记录</h4>
        <div style="position:relative;padding-left:20px;">
          ${s.learning_records.length === 0 ? '<p style="color:var(--text-muted)">暂无学习记录</p>' :
            s.learning_records.map(r => `
              <div style="margin-bottom:16px;border-left:2px solid var(--primary);padding-left:12px;position:relative;">
                <div style="position:absolute;left:-7px;top:4px;width:12px;height:12px;background:var(--primary);border-radius:50%;"></div>
                <div style="font-weight:600;">${escapeHtml(r.record_date)}</div>
                ${r.content ? `<div><strong>内容：</strong>${escapeHtml(r.content)}</div>` : ''}
                ${r.performance ? `<div><strong>表现：</strong>${escapeHtml(r.performance)}</div>` : ''}
                ${r.next_plan ? `<div><strong>下次计划：</strong>${escapeHtml(r.next_plan)}</div>` : ''}
                <button class="btn-ghost btn-sm" onclick="StudentsPage.delRecord(${r.id}, ${id})">删除记录</button>
              </div>
            `).join('')
          }
        </div>
      `, `
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary" onclick="closeModal();StudentsPage.addRecord(${id})">+ 添加学习记录</button>
      `);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async addRecord(studentId) {
    openModal('添加学习记录', `
      <div class="form-group"><label>日期</label><input type="date" id="rec-date" class="form-control" value="${today()}"></div>
      <div class="form-group"><label>学习内容</label><textarea id="rec-content" class="form-control" rows="3"></textarea></div>
      <div class="form-group"><label>表现</label><textarea id="rec-perf" class="form-control" rows="2"></textarea></div>
      <div class="form-group"><label>下次计划</label><textarea id="rec-plan" class="form-control" rows="2"></textarea></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="StudentsPage.saveRecord(${studentId})">保存</button>
    `);
  },

  async saveRecord(studentId) {
    const data = {
      record_date: document.getElementById('rec-date').value,
      content: document.getElementById('rec-content').value,
      performance: document.getElementById('rec-perf').value,
      next_plan: document.getElementById('rec-plan').value
    };
    if (!data.record_date) { showToast('请选择日期', 'error'); return; }
    try {
      await API.post('/api/students/' + studentId + '/records', data);
      showToast('记录已添加', 'success');
      closeModal();
      this.view(studentId);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async delRecord(recordId, studentId) {
    if (!confirm('删除该学习记录？')) return;
    try { await API.del('/api/students/records/' + recordId); showToast('已删除', 'success'); this.view(studentId); }
    catch (e) { showToast(e.message, 'error'); }
  },

  async openForm(id = null) {
    let s = { name: '', contact: '', grade: '', school: '', remark: '' };
    if (id) { try { s = await API.get('/api/students/' + id); } catch (e) { showToast(e.message, 'error'); return; } }
    openModal(id ? '编辑学生' : '新建学生', `
      <div class="form-group"><label>姓名 *</label><input type="text" id="s-name" class="form-control" value="${escapeHtml(s.name)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>年级</label><input type="text" id="s-grade-input" class="form-control" value="${escapeHtml(s.grade)}" placeholder="如：高一"></div>
        <div class="form-group"><label>学校</label><input type="text" id="s-school" class="form-control" value="${escapeHtml(s.school)}"></div>
      </div>
      <div class="form-group"><label>联系方式</label><input type="text" id="s-contact" class="form-control" value="${escapeHtml(s.contact)}"></div>
      <div class="form-group"><label>备注</label><textarea id="s-remark" class="form-control" rows="2">${escapeHtml(s.remark)}</textarea></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="StudentsPage.save(${id})">保存</button>
    `);
  },

  async save(id) {
    const name = document.getElementById('s-name').value.trim();
    if (!name) { showToast('姓名不能为空', 'error'); return; }
    const data = {
      name,
      grade: document.getElementById('s-grade-input').value,
      school: document.getElementById('s-school').value,
      contact: document.getElementById('s-contact').value,
      remark: document.getElementById('s-remark').value
    };
    try {
      if (id) await API.put('/api/students/' + id, data);
      else await API.post('/api/students', data);
      showToast('保存成功', 'success');
      closeModal();
      await this.load();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该学生及其所有学习记录？')) return;
    try { await API.del('/api/students/' + id); showToast('删除成功', 'success'); await this.load(); }
    catch (e) { showToast(e.message, 'error'); }
  }
};
