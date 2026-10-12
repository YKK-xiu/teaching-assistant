// 通用工具函数

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// 点击遮罩关闭
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// 富文本编辑器
function createEditor(containerId, initialContent = '') {
  const container = document.getElementById(containerId);
  if (!container) return null;
  container.innerHTML = `
    <div class="editor-toolbar">
      <button type="button" data-cmd="bold"><b>B</b></button>
      <button type="button" data-cmd="italic"><i>I</i></button>
      <button type="button" data-cmd="underline"><u>U</u></button>
      <button type="button" data-cmd="insertUnorderedList">• 列表</button>
      <button type="button" data-cmd="insertOrderedList">1. 列表</button>
      <button type="button" data-cmd="formatBlock" data-value="h3">标题</button>
      <button type="button" data-cmd="formatBlock" data-value="p">正文</button>
      <button type="button" data-cmd="createLink">链接</button>
      <button type="button" data-cmd="removeFormat">清除</button>
    </div>
    <div class="editor-content" contenteditable="true"></div>
  `;
  const content = container.querySelector('.editor-content');
  content.innerHTML = initialContent;
  container.querySelectorAll('.editor-toolbar button').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const url = prompt('请输入链接地址:', 'https://');
        if (url) document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, btn.dataset.value || null);
      }
      content.focus();
    });
  });
  return {
    getContent() { return content.innerHTML; },
    setContent(html) { content.innerHTML = html; }
  };
}

// 确认对话框
function confirmDialog(msg) {
  return new Promise(resolve => {
    openModal('确认操作', `<p>${msg}</p>`,
      `<button class="btn btn-secondary" onclick="closeModal();window.__confirmResult(false)">取消</button>
       <button class="btn btn-danger" onclick="closeModal();window.__confirmResult(true)">确认</button>`);
    window.__confirmResult = resolve;
  });
}

// 日期格式化
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function today() {
  return formatDate(new Date());
}

// 转义 HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 多选知识点组件
async function renderKnowledgeMultiSelect(containerId, selectedIds = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const tree = await API.get('/api/knowledge-points/tree');
    let html = '<div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;padding:8px;">';
    function renderNodes(nodes, level) {
      nodes.forEach(n => {
        const checked = selectedIds.includes(n.id) ? 'checked' : '';
        html += `<div style="padding-left:${level * 16}px;">
          <label><input type="checkbox" value="${n.id}" ${checked}> ${escapeHtml(n.title)}</label>
        </div>`;
        if (n.children && n.children.length) renderNodes(n.children, level + 1);
      });
    }
    renderNodes(tree, 0);
    html += '</div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p style="color:var(--text-muted)">加载知识点失败</p>';
  }
}

function getSelectedKpIds(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => parseInt(cb.value));
}
