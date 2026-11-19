// Тетрадь — клиент: дерево страниц, блочный редактор, слэш-меню, drag&drop, автосейв.

const $ = (sel, root = document) => root.querySelector(sel);

function mk(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

const ICONS = {
  plus: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  grip: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="5.8" cy="3.5" r="1.4"/><circle cx="10.2" cy="3.5" r="1.4"/><circle cx="5.8" cy="8" r="1.4"/><circle cx="10.2" cy="8" r="1.4"/><circle cx="5.8" cy="12.5" r="1.4"/><circle cx="10.2" cy="12.5" r="1.4"/></svg>',
  dots: '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><circle cx="3.5" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12.5" cy="8" r="1.5"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 6.5 8 9l2.5-2.5"/></svg>',
  pen: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.3 2.2a1.7 1.7 0 0 1 2.4 2.4L5.5 12.8l-3.2.9.9-3.2z"/></svg>',
  link: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6.5 9.5l3-3"/><path d="M7.2 4.6l1.1-1.1a2.7 2.7 0 0 1 3.8 3.8l-1.1 1.1"/><path d="M8.8 11.4l-1.1 1.1a2.7 2.7 0 0 1-3.8-3.8l1.1-1.1"/></svg>',
  linkOff: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6.5 9.5l3-3"/><path d="M7.2 4.6l1.1-1.1a2.7 2.7 0 0 1 3.8 3.8l-1.1 1.1"/><path d="M8.8 11.4l-1.1 1.1a2.7 2.7 0 0 1-3.8-3.8l1.1-1.1"/><path d="M2.5 13.5l11-11"/></svg>',
  trash: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h11M6.5 4.5V3.2h3v1.3M4.2 4.5l.6 9h6.4l.6-9M6.7 7v4.4M9.3 7v4.4"/></svg>',
  search: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>',
  menu: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
  notebook: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="2" width="10" height="12" rx="2"/><path d="M6 5.5h4M6 8h4M6 10.5h2.5"/></svg>',
};

const PH = {
  paragraph: 'Введите текст или нажмите «/» для команд',
  h1: 'Заголовок 1',
  h2: 'Заголовок 2',
  h3: 'Заголовок 3',
  bullet: 'Элемент списка',
  numbered: 'Элемент списка',
  todo: 'Задача',
  quote: 'Цитата',
  code: 'Код',
};

const SLASH_ITEMS = [
  { type: 'paragraph', name: 'Текст', hint: 'Обычный текст' },
  { type: 'h1', name: 'Заголовок 1', hint: 'Большой заголовок' },
  { type: 'h2', name: 'Заголовок 2', hint: 'Средний заголовок' },
  { type: 'h3', name: 'Заголовок 3', hint: 'Малый заголовок' },
  { type: 'bullet', name: 'Список', hint: 'Маркированный список' },
  { type: 'numbered', name: 'Нумерованный список', hint: 'Список с номерами' },
  { type: 'todo', name: 'Чекбокс', hint: 'Задача с отметкой' },
  { type: 'quote', name: 'Цитата', hint: 'Выделенный текст' },
  { type: 'code', name: 'Код', hint: 'Моноширинный блок' },
  { type: 'divider', name: 'Разделитель', hint: 'Линия между блоками' },
];

const MD_RULES = [
  ['# ', 'h1'],
  ['## ', 'h2'],
  ['### ', 'h3'],
  ['- ', 'bullet'],
  ['1. ', 'numbered'],
  ['[] ', 'todo'],
  ['> ', 'quote'],
  ['```', 'code'],
];

const CODE_LANGS = ['', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql'];

const S = {
  me: null,
  pages: [],
  collapsed: new Set(),
  currentId: null,
  blocks: [],
  dirty: false,
  titleDirty: false,
  saveTimer: 0,
  titleTimer: 0,
  indTimer: 0,
  slash: null,
  dragPageId: null,
  dragBlockId: null,
  readOnly: false,
};

const newId = (p) => p + Math.random().toString(36).slice(2, 12);
const newBlock = (type, text) => ({ id: newId('b_'), type, text: text || '', checked: 0, meta: {} });

async function api(method, url, body) {
  const opt = { method };
  if (body !== undefined) {
    opt.headers = { 'Content-Type': 'application/json' };
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  let data = {};
  try { data = await res.json(); } catch { /* пустой ответ */ }
  if (!res.ok) {
    const err = new Error(data.error || 'HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- каретка ----------

function caretIndex(ed) {
  const sel = getSelection();
  if (!sel.rangeCount) return 0;
  const r = sel.getRangeAt(0);
  if (!ed.contains(r.startContainer)) return 0;
  const pre = r.cloneRange();
  pre.selectNodeContents(ed);
  pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().length;
}

function setCaretIndex(ed, index) {
  const sel = getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  let node, lastText = null, remain = index, done = false;
  while ((node = walker.nextNode())) {
    lastText = node;
    if (remain <= node.data.length) { range.setStart(node, remain); done = true; break; }
    remain -= node.data.length;
  }
  if (!done) {
    if (lastText) range.setStart(lastText, lastText.data.length);
    else range.setStart(ed, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function focusBlock(id, index = 0) {
  const block = document.querySelector(`.block[data-id="${CSS.escape(id)}"]`);
  if (!block) return;
  const ed = block.querySelector('.b-edit');
  if (ed && ed.isContentEditable) {
    ed.focus();
    if (index != null) setCaretIndex(ed, index);
  } else if (block.classList.contains('b-divider')) {
    block.focus();
  }
}

function plainPaste(e) {
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
}

// ---------- сохранение ----------

function setIndicator(state) {
  const el = $('#save-indicator');
  clearTimeout(S.indTimer);
  el.textContent = state === 'saving' ? 'Сохранение…'
    : state === 'saved' ? 'Сохранено'
    : state === 'error' ? 'Не сохранено'
    : '';
  if (state === 'saved') S.indTimer = setTimeout(() => { el.textContent = ''; }, 2500);
}

function scheduleSave() {
  if (S.readOnly || !S.currentId) return;
  S.dirty = true;
  setIndicator('saving');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(saveNow, 800);
}

async function saveNow() {
  if (!S.currentId) return;
  S.dirty = false;
  try {
    await api('PUT', '/api/pages/' + S.currentId + '/blocks', {
      blocks: S.blocks.map((b) => ({ id: b.id, type: b.type, text: b.text, checked: b.checked ? 1 : 0, meta: b.meta || {} })),
    });
    setIndicator('saved');
  } catch {
    S.dirty = true;
    setIndicator('error');
  }
}

function scheduleTitle() {
  if (S.readOnly || !S.currentId) return;
  S.titleDirty = true;
  setIndicator('saving');
  clearTimeout(S.titleTimer);
  S.titleTimer = setTimeout(saveTitleNow, 600);
}

async function saveTitleNow() {
  if (!S.currentId) return;
  const title = $('#page-title').innerText.replace(/\n+/g, ' ').trim().slice(0, 200);
  S.titleDirty = false;
  try {
    await api('PATCH', '/api/pages/' + S.currentId, { title });
    const p = S.pages.find((x) => x.id === S.currentId);
    if (p) p.title = title;
    renderTree();
    setIndicator('saved');
  } catch {
    S.titleDirty = true;
    setIndicator('error');
  }
}

async function flushSaves() {
  clearTimeout(S.saveTimer);
  clearTimeout(S.titleTimer);
  const jobs = [];
  if (S.dirty) { S.dirty = false; jobs.push(saveNow()); }
  if (S.titleDirty) { S.titleDirty = false; jobs.push(saveTitleNow()); }
  await Promise.all(jobs);
}

// ---------- дерево страниц ----------

async function loadPages() {
  S.pages = (await api('GET', '/api/pages')).pages;
}

function ordered(parentId) {
  return S.pages
    .filter((p) => (p.parent_id || null) === (parentId || null))
    .sort((a, b) => a.position - b.position);
}

function isDescendantPage(pageId, ancestorId) {
  let cur = pageId;
  let guard = 0;
  while (cur && guard++ < 10000) {
    if (cur === ancestorId) return true;
    const p = S.pages.find((x) => x.id === cur);
    cur = p ? (p.parent_id || null) : null;
  }
  return false;
}

function renderTree() {
  const nav = $('#page-tree');
  nav.innerHTML = '';
  for (const p of ordered(null)) nav.append(pageRow(p, 0));
}

function pageRow(p, depth) {
  const frag = document.createDocumentFragment();
  const row = mk('div', 'page-row' + (p.id === S.currentId ? ' active' : ''));
  row.style.paddingLeft = 6 + depth * 14 + 'px';

  const kids = ordered(p.id);
  const chev = mk('button', 'chev' + (kids.length ? '' : ' invisible') + (S.collapsed.has(p.id) ? ' closed' : ''));
  chev.innerHTML = ICONS.chevron;
  chev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (S.collapsed.has(p.id)) S.collapsed.delete(p.id);
    else S.collapsed.add(p.id);
    renderTree();
  });

  const title = mk('span', 'page-title' + (p.title ? '' : ' empty'), p.title || 'Без названия');
  title.draggable = true;
  title.addEventListener('click', () => openPage(p.id));
  title.addEventListener('dragstart', (e) => {
    S.dragPageId = p.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', p.id);
  });
  title.addEventListener('dragend', () => {
    S.dragPageId = null;
    clearDropMarks();
  });

  const actions = mk('span', 'row-actions');
  const add = mk('button', 'iconbtn');
  add.innerHTML = ICONS.plus;
  add.title = 'Подчинённая страница';
  add.addEventListener('click', (e) => { e.stopPropagation(); createPage(p.id); });
  const dots = mk('button', 'iconbtn');
  dots.innerHTML = ICONS.dots;
  dots.title = 'Действия';
  dots.addEventListener('click', (e) => { e.stopPropagation(); pageMenu(p, dots); });
  actions.append(add, dots);

  row.append(chev, title, actions);
  row.addEventListener('dragover', (e) => pageDragOver(e, p, row));
  row.addEventListener('dragleave', () => row.classList.remove('drop-above', 'drop-below', 'drop-into'));
  row.addEventListener('drop', (e) => pageDrop(e, p, row));
  frag.append(row);

  if (!S.collapsed.has(p.id)) {
    for (const k of kids) frag.append(pageRow(k, depth + 1));
  }
  return frag;
}

function clearDropMarks() {
  document.querySelectorAll('.drop-above, .drop-below, .drop-into').forEach((el) =>
    el.classList.remove('drop-above', 'drop-below', 'drop-into')
  );
}

function pageDragOver(e, target, row) {
  if (!S.dragPageId || S.dragPageId === target.id) return;
  if (isDescendantPage(target.id, S.dragPageId)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const r = row.getBoundingClientRect();
  const y = e.clientY - r.top;
  clearDropMarks();
  if (y < r.height * 0.3) row.classList.add('drop-above');
  else if (y > r.height * 0.7) row.classList.add('drop-below');
  else row.classList.add('drop-into');
}

async function pageDrop(e, target, row) {
  e.preventDefault();
  const mode = row.classList.contains('drop-above') ? 'above'
    : row.classList.contains('drop-below') ? 'below'
    : 'into';
  clearDropMarks();
  const dragId = S.dragPageId;
  S.dragPageId = null;
  if (!dragId || dragId === target.id) return;
  if (isDescendantPage(target.id, dragId)) {
    toast('Нельзя переместить страницу внутрь её потомка');
    return;
  }

  let parentId, position;
  if (mode === 'into') {
    parentId = target.id;
    const kids = ordered(parentId).filter((p) => p.id !== dragId);
    position = kids.length ? kids[kids.length - 1].position + 1 : 1;
  } else {
    parentId = target.parent_id || null;
    const sibs = ordered(parentId).filter((p) => p.id !== dragId);
    const i = sibs.findIndex((p) => p.id === target.id);
    if (i < 0) return;
    if (mode === 'above') {
      position = i === 0 ? sibs[0].position - 1 : (sibs[i - 1].position + sibs[i].position) / 2;
    } else {
      position = i === sibs.length - 1 ? sibs[i].position + 1 : (sibs[i].position + sibs[i + 1].position) / 2;
    }
  }

  try {
    await api('PATCH', '/api/pages/' + dragId, { parent_id: parentId, position });
    await loadPages();
    renderTree();
  } catch {
    toast('Не удалось переместить страницу');
  }
}

async function createPage(parentId) {
  try {
    const { page } = await api('POST', '/api/pages', parentId ? { parent_id: parentId } : {});
    if (parentId) S.collapsed.delete(parentId);
    await loadPages();
    renderTree();
    await openPage(page.id);
    const t = $('#page-title');
    t.focus();
    const r = document.createRange();
    r.selectNodeContents(t);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  } catch {
    toast('Не удалось создать страницу');
  }
}

// ---------- меню страницы ----------

function pageMenu(p, anchor) {
  closeMenus();
  const menu = mk('div', 'menu');
  const item = (icon, label, cls, fn) => {
    const b = mk('button', 'menu-item' + (cls ? ' ' + cls : ''));
    b.innerHTML = ICONS[icon] + '<span class="mi-name"></span>';
    b.querySelector('.mi-name').textContent = label;
    b.addEventListener('click', fn);
    menu.append(b);
  };
  item('pen', 'Переименовать', '', () => { closeMenus(); renamePopup(p); });
  item('link', 'Копировать публичную ссылку', '', () => { closeMenus(); shareCopy(p); });
  if (p.share_token) {
    item('linkOff', 'Отключить публичную ссылку', '', async () => {
      closeMenus();
      try {
        await api('DELETE', '/api/pages/' + p.id + '/share');
        await loadPages();
        renderTree();
        toast('Публичная ссылка отключена');
      } catch { toast('Не удалось отключить ссылку'); }
    });
  }
  item('trash', 'Удалить', 'danger', () => { closeMenus(); deleteConfirm(p); });

  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = Math.min(r.bottom + 6, window.innerHeight - menu.offsetHeight - 10) + 'px';
  menu.style.left = Math.min(r.left - 160, window.innerWidth - 240) + 'px';
}

function closeMenus() {
  document.querySelectorAll('.menu:not(.slash-menu)').forEach((m) => m.remove());
}

async function shareCopy(p) {
  try {
    const { share_token } = await api('POST', '/api/pages/' + p.id + '/share');
    const local = S.pages.find((x) => x.id === p.id);
    if (local) local.share_token = share_token;
    renderTree();
    const link = location.origin + '/s/' + share_token;
    await copyText(link);
    toast('Ссылка скопирована');
  } catch {
    toast('Не удалось скопировать ссылку');
  }
}

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = mk('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function deleteConfirm(p) {
  confirmDialog(
    `Удалить страницу «${p.title || 'Без названия'}»?`,
    'Вложенные страницы и их содержимое будут удалены безвозвратно.',
    async () => {
      try {
        const inSubtree = S.currentId && (S.currentId === p.id || isDescendantPage(S.currentId, p.id));
        await api('DELETE', '/api/pages/' + p.id);
        if (inSubtree) renderEditorEmpty();
        await loadPages();
        renderTree();
      } catch {
        toast('Не удалось удалить страницу');
      }
    }
  );
}

function renamePopup(p) {
  inputDialog('Переименовать страницу', p.title, async (val) => {
    try {
      await api('PATCH', '/api/pages/' + p.id, { title: val });
      const local = S.pages.find((x) => x.id === p.id);
      if (local) local.title = val;
      if (S.currentId === p.id) $('#page-title').innerText = val;
      renderTree();
    } catch {
      toast('Не удалось переименовать');
    }
  });
}

// ---------- диалоги ----------

function overlay() {
  const ov = mk('div', 'overlay');
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.remove(); });
  const esc = (e) => {
    if (e.key === 'Escape') {
      ov.remove();
      document.removeEventListener('keydown', esc);
    }
  };
  document.addEventListener('keydown', esc);
  return ov;
}

function confirmDialog(title, sub, onOk) {
  const ov = overlay();
  const d = mk('div', 'dialog');
  d.append(mk('div', 'dialog-title', title));
  if (sub) d.append(mk('div', 'dialog-sub', sub));
  const row = mk('div', 'dialog-btns');
  const cancel = mk('button', 'btn ghost', 'Отмена');
  cancel.addEventListener('click', () => ov.remove());
  const ok = mk('button', 'btn danger', 'Удалить');
  ok.addEventListener('click', async () => { ov.remove(); await onOk(); });
  row.append(cancel, ok);
  d.append(row);
  ov.append(d);
  $('#popup-root').append(ov);
  ok.focus();
}

function inputDialog(title, value, onOk) {
  const ov = overlay();
  const d = mk('div', 'dialog');
  d.append(mk('div', 'dialog-title', title));
  const input = mk('input', 'dialog-input');
  input.value = value || '';
  input.maxLength = 200;
  d.append(input);
  const row = mk('div', 'dialog-btns');
  const cancel = mk('button', 'btn ghost', 'Отмена');
  cancel.addEventListener('click', () => ov.remove());
  const ok = mk('button', 'btn primary', 'Сохранить');
  const submit = async () => {
    const v = input.value.trim();
    ov.remove();
    await onOk(v);
  };
  ok.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  row.append(cancel, ok);
  d.append(row);
  ov.append(d);
  $('#popup-root').append(ov);
  input.focus();
  input.select();
}

function toast(msg) {
  const t = mk('div', 'toast', msg);
  $('#toast-root').append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, 2400);
}

// ---------- редактор ----------

function renderEditorEmpty() {
  S.currentId = null;
  S.blocks = [];
  const t = $('#page-title');
  t.innerText = '';
  t.contentEditable = 'false';
  const wrap = $('#blocks');
  wrap.innerHTML = '';
  wrap.append(mk('div', 'empty-hint', 'Выберите страницу слева или создайте новую.'));
}

async function openPage(id) {
  if (S.currentId === id) return;
  await flushSaves();
  let d;
  try {
    d = await api('GET', '/api/pages/' + id);
  } catch {
    toast('Страница недоступна');
    return;
  }
  S.currentId = id;
  S.blocks = d.blocks;
  if (S.blocks.length === 0) S.blocks.push(newBlock('paragraph', ''));
  const t = $('#page-title');
  t.contentEditable = 'true';
  t.innerText = d.page.title || '';
  renderBlocks($('#blocks'), S.blocks, false);
  setIndicator('');
  renderTree();
}

function renderBlocks(container, blocks, readOnly) {
  container.innerHTML = '';
  let num = 0;
  for (const b of blocks) {
    num = b.type === 'numbered' ? num + 1 : 0;
    container.append(blockEl(b, num, readOnly));
  }
}

function blockEl(b, num, readOnly) {
  const el = mk('div', 'block b-' + b.type);
  el.dataset.id = b.id;

  if (b.type === 'divider') {
    if (!readOnly) {
      el.append(blockHandles(b));
      el.tabIndex = 0;
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          removeBlock(b.id);
        }
      });
      el.addEventListener('dragover', (e) => blockDragOver(e, el));
      el.addEventListener('dragleave', () => el.classList.remove('drop-above', 'drop-below'));
      el.addEventListener('drop', (e) => blockDrop(e, el));
    }
    el.append(mk('div', 'divider-line'));
    return el;
  }

  if (!readOnly) {
    el.append(blockHandles(b));
    el.addEventListener('dragover', (e) => blockDragOver(e, el));
    el.addEventListener('dragleave', () => el.classList.remove('drop-above', 'drop-below'));
    el.addEventListener('drop', (e) => blockDrop(e, el));
  }

  if (b.type === 'todo') {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!b.checked;
    cb.disabled = readOnly;
    cb.addEventListener('change', () => {
      b.checked = cb.checked ? 1 : 0;
      el.classList.toggle('done', !!b.checked);
      scheduleSave();
    });
    el.append(cb);
  } else if (b.type === 'bullet') {
    el.append(mk('span', 'marker', '•'));
  } else if (b.type === 'numbered') {
    el.append(mk('span', 'marker', num + '.'));
  }

  if (b.type === 'code') {
    const box = mk('div', 'code-box');
    if (!readOnly) {
      const lang = mk('select', 'code-lang');
      for (const l of CODE_LANGS) {
        const o = document.createElement('option');
        o.value = l;
        o.textContent = l || 'язык';
        lang.append(o);
      }
      lang.value = (b.meta && b.meta.lang) || '';
      lang.addEventListener('change', () => {
        b.meta = { ...(b.meta || {}), lang: lang.value };
        scheduleSave();
      });
      box.append(lang);
    } else if (b.meta && b.meta.lang) {
      box.append(mk('span', 'code-lang-label', b.meta.lang));
    }
    const ed = editable(b, readOnly);
    ed.classList.add('code-text');
    box.append(ed);
    el.append(box);
  } else {
    el.append(editable(b, readOnly));
  }

  if (b.type === 'todo' && b.checked) el.classList.add('done');
  return el;
}

function editable(b, readOnly) {
  const ed = mk('div', 'b-edit');
  ed.innerText = b.text || '';
  ed.dataset.ph = PH[b.type] || '';
  if (readOnly) return ed;
  ed.contentEditable = 'true';
  ed.spellcheck = false;
  ed.addEventListener('input', () => onBlockInput(b, ed));
  ed.addEventListener('keydown', (e) => onBlockKey(b, ed, e));
  ed.addEventListener('paste', plainPaste);
  return ed;
}

function normText(t) {
  return String(t || '').replace(/\r/g, '');
}

function onBlockInput(b, ed) {
  b.text = normText(ed.innerText);
  if (!S.slash && b.text === '\n') { b.text = ''; }
  if (b.text === '' && ed.innerHTML !== '') {
    ed.innerHTML = '';
    setCaretIndex(ed, 0);
  }
  if (mdShortcut(b)) { closeSlash(false); return; }
  if (b.text === '/') {
    openSlash(b, ed);
  } else if (S.slash && S.slash.blockId === b.id) {
    if (b.text.startsWith('/')) {
      S.slash.query = b.text.slice(1);
      renderSlashItems();
    } else {
      closeSlash(false);
    }
  }
  scheduleSave();
}

function mdShortcut(b) {
  const t = b.text;
  for (const [prefix, type] of MD_RULES) {
    if (t.startsWith(prefix)) {
      b.text = t.slice(prefix.length);
      b.type = type;
      if (type === 'code' && !(b.meta && b.meta.lang !== undefined)) b.meta = { lang: '' };
      scheduleSave();
      renderBlocks($('#blocks'), S.blocks, false);
      focusBlock(b.id, 0);
      return true;
    }
  }
  return false;
}

function onBlockKey(b, ed, e) {
  if (S.slash && S.slash.blockId === b.id) {
    const items = S.slash.items || [];
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      S.slash.hi = (S.slash.hi + 1) % items.length;
      updateSlashHi();
      return;
    }
    if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      S.slash.hi = (S.slash.hi - 1 + items.length) % items.length;
      updateSlashHi();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) applySlash(items[S.slash.hi] || items[0]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSlash(true);
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (b.type === 'code') {
      document.execCommand('insertText', false, '\n');
      b.text = normText(ed.innerText);
      scheduleSave();
      return;
    }
    const idx = caretIndex(ed);
    const before = b.text.slice(0, idx);
    const after = b.text.slice(idx);
    b.text = before;
    const nb = newBlock('paragraph', after);
    const i = S.blocks.findIndex((x) => x.id === b.id);
    S.blocks.splice(i + 1, 0, nb);
    scheduleSave();
    renderBlocks($('#blocks'), S.blocks, false);
    focusBlock(nb.id, 0);
    return;
  }

  if (e.key === 'Backspace') {
    if (caretIndex(ed) !== 0) return;
    e.preventDefault();
    if (b.text === '') {
      const i = S.blocks.findIndex((x) => x.id === b.id);
      if (S.blocks.length === 1) {
        if (b.type !== 'paragraph') {
          b.type = 'paragraph';
          b.checked = 0;
          scheduleSave();
          renderBlocks($('#blocks'), S.blocks, false);
          focusBlock(b.id, 0);
        }
        return;
      }
      removeBlock(b.id);
      return;
    }
    if (b.type !== 'paragraph') {
      b.type = 'paragraph';
      b.checked = 0;
      scheduleSave();
      renderBlocks($('#blocks'), S.blocks, false);
      focusBlock(b.id, 0);
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    if (caretIndex(ed) === 0) {
      e.preventDefault();
      focusSibling(b, -1);
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    if (caretIndex(ed) === b.text.length) {
      e.preventDefault();
      focusSibling(b, 1);
    }
    return;
  }
}

function nearestEditableIndex(start, dir) {
  for (let j = start; j >= 0 && j < S.blocks.length; j += dir) {
    if (S.blocks[j].type !== 'divider') return j;
  }
  return null;
}

function focusSibling(b, dir) {
  const i = S.blocks.findIndex((x) => x.id === b.id);
  const cur = caretIndex(document.querySelector(`.block[data-id="${CSS.escape(b.id)}"] .b-edit`) || document.body);
  const j = nearestEditableIndex(i + dir, dir);
  if (j == null) return;
  const t = S.blocks[j];
  focusBlock(t.id, Math.min(cur, t.text.length));
}

function removeBlock(id) {
  const i = S.blocks.findIndex((x) => x.id === id);
  if (i < 0) return;
  S.blocks.splice(i, 1);
  scheduleSave();
  renderBlocks($('#blocks'), S.blocks, false);
  const j = nearestEditableIndex(i - 1, -1);
  if (j != null) {
    const t = S.blocks[j];
    focusBlock(t.id, t.text.length);
  }
}

// ручки блока: «+» ниже и захват для переноса
function blockHandles(b) {
  const h = mk('div', 'handles');
  const add = mk('button', 'hbtn h-add');
  add.innerHTML = ICONS.plus;
  add.title = 'Блок ниже';
  add.addEventListener('click', () => insertBlockBelow(b.id));
  const grip = mk('button', 'hbtn h-grip');
  grip.innerHTML = ICONS.grip;
  grip.title = 'Перетащить';
  grip.draggable = true;
  grip.addEventListener('dragstart', (e) => {
    S.dragBlockId = b.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', b.id);
  });
  grip.addEventListener('dragend', () => {
    S.dragBlockId = null;
    clearDropMarks();
  });
  h.append(add, grip);
  return h;
}

function insertBlockBelow(id) {
  const i = S.blocks.findIndex((x) => x.id === id);
  const nb = newBlock('paragraph', '');
  S.blocks.splice(i + 1, 0, nb);
  scheduleSave();
  renderBlocks($('#blocks'), S.blocks, false);
  focusBlock(nb.id, 0);
}

function blockDragOver(e, el) {
  if (!S.dragBlockId || el.dataset.id === S.dragBlockId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const r = el.getBoundingClientRect();
  clearDropMarks();
  el.classList.add(e.clientY - r.top < r.height / 2 ? 'drop-above' : 'drop-below');
}

function blockDrop(e, el) {
  e.preventDefault();
  const before = el.classList.contains('drop-above');
  el.classList.remove('drop-above', 'drop-below');
  const dragId = S.dragBlockId;
  S.dragBlockId = null;
  if (!dragId || dragId === el.dataset.id) return;
  const from = S.blocks.findIndex((x) => x.id === dragId);
  if (from < 0) return;
  const [moved] = S.blocks.splice(from, 1);
  const to = S.blocks.findIndex((x) => x.id === el.dataset.id);
  if (to < 0) {
    S.blocks.splice(from, 0, moved);
    return;
  }
  S.blocks.splice(before ? to : to + 1, 0, moved);
  scheduleSave();
  renderBlocks($('#blocks'), S.blocks, false);
}

// ---------- слэш-меню ----------

function openSlash(b, ed) {
  closeSlash(false);
  const menu = mk('div', 'menu slash-menu');
  document.body.append(menu);
  const r = ed.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 270)) + 'px';
  menu.style.top = Math.min(r.bottom + 6, window.innerHeight - 200) + 'px';
  S.slash = { blockId: b.id, query: '', hi: 0, el: menu, items: [] };
  renderSlashItems();
}

function slashFiltered() {
  const q = (S.slash.query || '').trim().toLowerCase();
  return SLASH_ITEMS.filter((it) => !q || it.name.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q));
}

function renderSlashItems() {
  const items = slashFiltered();
  S.slash.items = items;
  if (S.slash.hi >= items.length) S.slash.hi = 0;
  const menu = S.slash.el;
  menu.innerHTML = '';
  if (!items.length) {
    menu.append(mk('div', 'menu-empty', 'Ничего не найдено'));
    return;
  }
  items.forEach((it, i) => {
    const btn = mk('button', 'menu-item' + (i === S.slash.hi ? ' hi' : ''));
    btn.append(mk('span', 'mi-name', it.name));
    btn.append(mk('span', 'mi-hint', it.hint));
    btn.addEventListener('click', () => applySlash(it));
    btn.addEventListener('mousemove', () => {
      if (S.slash && S.slash.hi !== i) { S.slash.hi = i; updateSlashHi(); }
    });
    menu.append(btn);
  });
}

function updateSlashHi() {
  if (!S.slash) return;
  [...S.slash.el.querySelectorAll('.menu-item')].forEach((c, i) => c.classList.toggle('hi', i === S.slash.hi));
}

function closeSlash(restore) {
  if (!S.slash) return;
  const { blockId, el } = S.slash;
  el.remove();
  S.slash = null;
  if (restore) {
    const b = S.blocks.find((x) => x.id === blockId);
    const ed = document.querySelector(`.block[data-id="${CSS.escape(blockId)}"] .b-edit`);
    if (b && ed && b.text.startsWith('/')) {
      b.text = '';
      ed.innerText = '';
      scheduleSave();
    }
  }
}

function applySlash(item) {
  const id = S.slash && S.slash.blockId;
  closeSlash(false);
  const b = S.blocks.find((x) => x.id === id);
  if (!b) return;
  b.text = '';
  b.type = item.type;
  b.checked = 0;
  if (item.type === 'code' && !(b.meta && b.meta.lang !== undefined)) b.meta = { lang: '' };
  scheduleSave();
  renderBlocks($('#blocks'), S.blocks, false);
  focusBlock(b.id, 0);
}

// ---------- поиск ----------

let searchTimer = 0;

function wireSearch() {
  const input = $('#search-input');
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (!q) { hideSearch(); return; }
    searchTimer = setTimeout(async () => {
      try {
        const { results } = await api('GET', '/api/search?q=' + encodeURIComponent(q));
        renderSearch(results);
      } catch { /* игнорируем */ }
    }, 250);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; hideSearch(); input.blur(); }
  });
}

function renderSearch(results) {
  const box = $('#search-results');
  box.innerHTML = '';
  if (!results.length) box.append(mk('div', 'search-empty', 'Ничего не найдено'));
  for (const r of results) {
    const it = mk('button', 'search-item');
    it.append(mk('div', 'si-title', r.title || 'Без названия'));
    if (r.snippet) it.append(mk('div', 'si-snippet', r.snippet));
    it.addEventListener('click', () => {
      hideSearch();
      $('#search-input').value = '';
      openPage(r.page_id);
    });
    box.append(it);
  }
  box.hidden = false;
}

function hideSearch() {
  $('#search-results').hidden = true;
}

// ---------- публичный просмотр ----------

async function openPublic(token) {
  $('#app').hidden = true;
  $('#login').hidden = true;
  const pub = $('#public');
  pub.hidden = false;
  try {
    const d = await api('GET', '/api/public/' + token);
    document.title = (d.page.title || 'Без названия') + ' — Тетрадь';
    $('#public-title').textContent = d.page.title || 'Без названия';
    renderBlocks($('#public-blocks'), d.blocks, true);
  } catch {
    $('#public-title').textContent = 'Страница недоступна';
    $('#public-blocks').append(mk('p', 'search-empty', 'Ссылка недействительна или владелец отключил доступ.'));
  }
}

// ---------- вход и запуск ----------

function showLogin() {
  $('#login').hidden = false;
}

async function enterApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#workspace-name').innerHTML = ICONS.notebook + '<span>Тетрадь</span>';
  $('#user-name').textContent = S.me.name;
  $('#root-add').innerHTML = ICONS.plus + '<span>Новая страница</span>';
  try {
    await loadPages();
  } catch {
    toast('Не удалось загрузить страницы');
    return;
  }
  renderTree();
  const first = ordered(null)[0];
  if (first) await openPage(first.id);
  else renderEditorEmpty();
}

function wire() {
  $('#search-icon').innerHTML = ICONS.search;
  $('#side-toggle').innerHTML = ICONS.menu;

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#login-name').value.trim();
    if (!name) return;
    const btn = $('#login-btn');
    btn.disabled = true;
    try {
      const { user } = await api('POST', '/api/login', { name });
      S.me = user;
      await enterApp();
    } catch {
      toast('Не удалось войти');
    }
    btn.disabled = false;
  });

  $('#root-add').addEventListener('click', () => createPage(null));

  const title = $('#page-title');
  title.addEventListener('input', () => { if (S.currentId) scheduleTitle(); });
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const b = S.blocks[0];
      if (b) focusBlock(b.id, 0);
    }
  });
  title.addEventListener('paste', plainPaste);

  $('#side-toggle').addEventListener('click', () => document.body.classList.toggle('side-open'));

  wireSearch();

  // закрытие всплывающих элементов по клику мимо
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.menu')) {
      closeMenus();
      if (S.slash) closeSlash(false);
    }
    if (!e.target.closest('.side-search')) hideSearch();
  });

  // слэш-меню не должно висеть при прокрутке
  $('#editor-scroll').addEventListener('scroll', () => closeSlash(false), true);
}

async function init() {
  wire();
  const m = location.pathname.match(/^\/s\/([A-Za-z0-9]+)/);
  if (m) {
    S.readOnly = true;
    await openPublic(m[1]);
    return;
  }
  try {
    const { user } = await api('GET', '/api/me');
    if (user) {
      S.me = user;
      await enterApp();
      return;
    }
  } catch { /* сервер недоступен — покажем вход */ }
  showLogin();
}

init();
