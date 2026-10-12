// 课程表页面
const CoursesPage = {
  weekStart: null,

  async render() {
    document.getElementById('page-title').textContent = '课程表';
    const content = document.getElementById('content');
    // 计算本周一
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay(); // 周日=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow - 1));
    this.weekStart = monday.toISOString().slice(0, 10);
    content.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="CoursesPage.changeWeek(-1)">← 上周</button>
        <button class="btn btn-secondary" onclick="CoursesPage.changeWeek(0)">本周</button>
        <button class="btn btn-secondary" onclick="CoursesPage.changeWeek(1)">下周 →</button>
        <span id="week-label" style="font-weight:600;margin-left:12px;"></span>
        <div style="flex:1;"></div>
        <button class="btn btn-primary" onclick="CoursesPage.openForm()">+ 新建课程</button>
      </div>
      <div class="card" id="schedule"></div>
    `;
    await this.loadSchedule();
  },

  changeWeek(offset) {
    if (offset === 0) {
      const now = new Date();
      const dow = now.getDay() === 0 ? 7 : now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow - 1));
      this.weekStart = monday.toISOString().slice(0, 10);
    } else {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + offset * 7);
      this.weekStart = d.toISOString().slice(0, 10);
    }
    this.loadSchedule();
  },

  async loadSchedule() {
    const start = new Date(this.weekStart);
    const days = [];
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), name: dayNames[(i + 1) % 7], dow: (i + 1) % 7 });
    }
    document.getElementById('week-label').textContent = `${days[0].date} ~ ${days[6].date}`;

    try {
      const courses = await API.get('/api/courses/week?weekStart=' + this.weekStart);
      const el = document.getElementById('schedule');
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:80px repeat(7, 1fr);gap:4px;">
          <div style="padding:8px;font-weight:600;text-align:center;border-bottom:2px solid var(--border);">时间</div>
          ${days.map(d => `<div style="padding:8px;font-weight:600;text-align:center;border-bottom:2px solid var(--border);">${d.name}<br><span style="font-size:12px;color:var(--text-muted);">${d.date.slice(5)}</span></div>`).join('')}
          ${this.renderTimeSlots(courses, days)}
        </div>
      `;
    } catch (e) { showToast(e.message, 'error'); }
  },

  renderTimeSlots(courses, days) {
    // 生成 8:00 - 21:00 的时间段
    const slots = [];
    for (let h = 8; h <= 21; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    let html = '';
    slots.forEach(time => {
      html += `<div style="padding:8px;text-align:right;color:var(--text-muted);font-size:12px;border-bottom:1px solid var(--border);">${time}</div>`;
      days.forEach(d => {
        const cellCourses = courses.filter(c => c.date === d.date && c.start_time && c.start_time.startsWith(time.slice(0, 2)));
        html += `<div style="border-bottom:1px solid var(--border);border-left:1px solid var(--border);min-height:50px;padding:4px;">
          ${cellCourses.map(c => `
            <div onclick="CoursesPage.openForm(${c.id})" style="background:#e8edf0;border:1px solid var(--primary-light);border-radius:4px;padding:4px 6px;margin-bottom:4px;cursor:pointer;font-size:12px;" title="${escapeHtml(c.name)}">
              <div style="font-weight:600;color:var(--primary-dark);">${escapeHtml(c.name)}</div>
              <div style="color:var(--text-muted);">${c.start_time}-${c.end_time}</div>
              ${c.students && c.students.length ? `<div style="color:var(--text-muted);">${c.students.map(s => escapeHtml(s.name)).join(',')}</div>` : ''}
            </div>
          `).join('')}
        </div>`;
      });
    });
    return html;
  },

  async openForm(id = null) {
    let c = { name: '', subject: '', location: '', remark: '', day_of_week: 1, start_time: '09:00', end_time: '10:00', start_date: '', end_date: '', students: [], student_ids: [] };
    let students = [];
    try { students = await API.get('/api/students'); } catch (e) { /* ignore */ }
    if (id) { try { c = await API.get('/api/courses/' + id); } catch (e) { showToast(e.message, 'error'); return; } }
    openModal(id ? '编辑课程' : '新建课程', `
      <div class="form-group"><label>课程名称 *</label><input type="text" id="c-name" class="form-control" value="${escapeHtml(c.name)}" placeholder="如：高一数学一对一"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>学科</label><input type="text" id="c-subject" class="form-control" value="${escapeHtml(c.subject)}"></div>
        <div class="form-group"><label>地点</label><input type="text" id="c-location" class="form-control" value="${escapeHtml(c.location)}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-group"><label>星期</label>
          <select id="c-dow" class="form-control">
            ${['周日','周一','周二','周三','周四','周五','周六'].map((n, i) => `<option value="${i}" ${c.day_of_week == i ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>开始时间</label><input type="time" id="c-start" class="form-control" value="${c.start_time}"></div>
        <div class="form-group"><label>结束时间</label><input type="time" id="c-end" class="form-control" value="${c.end_time}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>开始日期</label><input type="date" id="c-start-date" class="form-control" value="${c.start_date}"></div>
        <div class="form-group"><label>结束日期</label><input type="date" id="c-end-date" class="form-control" value="${c.end_date}"></div>
      </div>
      <div class="form-group"><label>关联学生</label>
        <div style="max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;padding:8px;">
          ${students.length === 0 ? '<p style="color:var(--text-muted)">暂无学生，请先在学生模块添加</p>' :
            students.map(s => {
              const checked = (c.students || []).some(cs => cs.id === s.id) ? 'checked' : '';
              return `<label style="display:block;"><input type="checkbox" value="${s.id}" ${checked}> ${escapeHtml(s.name)} (${escapeHtml(s.grade)})</label>`;
            }).join('')}
        </div>
      </div>
      <div class="form-group"><label>备注</label><textarea id="c-remark" class="form-control" rows="2">${escapeHtml(c.remark)}</textarea></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      ${id ? '<button class="btn btn-danger" onclick="CoursesPage.del(' + id + ')" style="margin-right:auto;">删除</button>' : ''}
      <button class="btn btn-primary" onclick="CoursesPage.save(${id})">保存</button>
    `);
  },

  async save(id) {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { showToast('课程名称不能为空', 'error'); return; }
    const studentEls = document.querySelectorAll('#modal-body input[type=checkbox]:checked');
    const data = {
      name,
      subject: document.getElementById('c-subject').value,
      location: document.getElementById('c-location').value,
      day_of_week: parseInt(document.getElementById('c-dow').value),
      start_time: document.getElementById('c-start').value,
      end_time: document.getElementById('c-end').value,
      start_date: document.getElementById('c-start-date').value,
      end_date: document.getElementById('c-end-date').value,
      remark: document.getElementById('c-remark').value,
      student_ids: Array.from(studentEls).map(cb => parseInt(cb.value))
    };
    try {
      if (id) await API.put('/api/courses/' + id, data);
      else await API.post('/api/courses', data);
      showToast('保存成功', 'success');
      closeModal();
      await this.loadSchedule();
    } catch (e) { showToast(e.message, 'error'); }
  },

  async del(id) {
    if (!confirm('确定删除该课程？')) return;
    try { await API.del('/api/courses/' + id); showToast('删除成功', 'success'); closeModal(); await this.loadSchedule(); }
    catch (e) { showToast(e.message, 'error'); }
  }
};
