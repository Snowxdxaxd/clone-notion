// Тетрадь — клон Notion: блочный редактор с деревом страниц.
// Node 24 ESM, без сборки. SQLite через lib/db.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createApp, json, bytes, notFound, badRequest, unauthorized } from './lib/http.mjs';
import { migrate, db, uid } from './lib/db.mjs';
import { ensureAuthTables, loginByName, currentUser } from './lib/auth.mjs';

migrate([
  {
    id: '001-init',
    sql: `
      create table if not exists users (
        id text primary key,
        name text not null,
        created integer not null
      );
      create table if not exists pages (
        id text primary key,
        parent_id text references pages(id) on delete cascade,
        owner_id text not null references users(id),
        title text not null default '',
        position real not null default 0,
        share_token text unique,
        created integer not null,
        updated integer not null
      );
      create table if not exists blocks (
        id text primary key,
        page_id text not null references pages(id) on delete cascade,
        position real not null default 0,
        type text not null default 'paragraph',
        text text not null default '',
        checked integer not null default 0,
        meta_json text not null default '{}',
        created integer not null,
        updated integer not null
      );
      create index if not exists idx_pages_owner on pages(owner_id);
      create index if not exists idx_blocks_page on blocks(page_id);
    `,
  },
]);
ensureAuthTables(db);

const TYPES = ['paragraph', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider'];
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const app = createApp({ publicDir: 'public', spa: true });

// ---------- helpers ----------

const getPage = (id) => db.prepare('select * from pages where id = ?').get(id);

function ownPage(ctx, id) {
  const user = currentUser(db, ctx);
  if (!user) return { error: 'auth' };
  const page = getPage(id);
  if (!page || page.owner_id !== user.id) return { error: 'notfound', user };
  return { user, page };
}

const nextPosition = (parentId) => {
  const row = db.prepare('select max(position) as m from pages where parent_id is ?').get(parentId ?? null);
  return (row && row.m != null ? row.m : 0) + 1;
};

const touchPage = (id) => db.prepare('update pages set updated = ? where id = ?').run(Date.now(), id);

const safeParse = (s) => {
  try { const v = JSON.parse(s || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
};

const rowToBlock = (r) => ({
  id: r.id,
  type: r.type,
  text: r.text,
  checked: r.checked ? 1 : 0,
  meta: safeParse(r.meta_json),
  created: r.created,
  updated: r.updated,
});

// ---------- auth ----------

app.post('/api/login', (ctx) => {
  const user = loginByName(db, ctx.res, ctx.body.name);
  if (!user) return json(ctx.res, 400, { error: 'need_name' });
  const c = db.prepare('select count(*) as c from pages where owner_id = ?').get(user.id).c;
  if (c === 0) seedPages(user.id);
  json(ctx.res, 200, { user });
});

app.get('/api/me', (ctx) => {
  json(ctx.res, 200, { user: currentUser(db, ctx) });
});

// ---------- pages ----------

app.get('/api/pages', (ctx) => {
  const user = currentUser(db, ctx);
  if (!user) return unauthorized(ctx.res);
  const pages = db
    .prepare('select id, parent_id, title, position, share_token, created, updated from pages where owner_id = ? order by position')
    .all(user.id);
  json(ctx.res, 200, { pages });
});

app.post('/api/pages', (ctx) => {
  const user = currentUser(db, ctx);
  if (!user) return unauthorized(ctx.res);
  const parentId = ctx.body.parent_id || null;
  if (parentId) {
    const parent = getPage(parentId);
    if (!parent || parent.owner_id !== user.id) return badRequest(ctx.res, 'bad_parent');
  }
  const id = uid('p_');
  const now = Date.now();
  const title = String(ctx.body.title ?? '').slice(0, 200);
  db.prepare('insert into pages(id, parent_id, owner_id, title, position, created, updated) values (?, ?, ?, ?, ?, ?, ?)')
    .run(id, parentId, user.id, title, nextPosition(parentId), now, now);
  json(ctx.res, 200, { page: getPage(id) });
});

app.patch('/api/pages/:id', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);

  const sets = [];
  const vals = [];

  if (ctx.body.title !== undefined) {
    sets.push('title = ?');
    vals.push(String(ctx.body.title).slice(0, 200));
  }

  if (ctx.body.parent_id !== undefined) {
    const pid = ctx.body.parent_id === null || ctx.body.parent_id === '' ? null : String(ctx.body.parent_id);
    if (pid !== null) {
      if (pid === o.page.id) return badRequest(ctx.res, 'cycle');
      const parent = getPage(pid);
      if (!parent || parent.owner_id !== o.user.id) return badRequest(ctx.res, 'bad_parent');
      // цикл: новый родитель не должен лежать в поддереве переносимой страницы
      let cur = pid;
      let guard = 0;
      while (cur && guard++ < 10000) {
        if (cur === o.page.id) return badRequest(ctx.res, 'cycle');
        const r = db.prepare('select parent_id from pages where id = ?').get(cur);
        cur = r ? r.parent_id : null;
      }
    }
    sets.push('parent_id = ?');
    vals.push(pid);
  }

  if (ctx.body.position !== undefined) {
    const n = Number(ctx.body.position);
    if (Number.isFinite(n)) { sets.push('position = ?'); vals.push(n); }
  }

  if (!sets.length) return json(ctx.res, 200, { page: o.page });
  sets.push('updated = ?');
  vals.push(Date.now(), o.page.id);
  db.prepare(`update pages set ${sets.join(', ')} where id = ?`).run(...vals);
  json(ctx.res, 200, { page: getPage(o.page.id) });
});

// потомки и блоки удаляются каскадом (on delete cascade)
app.delete('/api/pages/:id', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);
  db.prepare('delete from pages where id = ?').run(o.page.id);
  json(ctx.res, 200, { ok: true });
});

app.get('/api/pages/:id', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);
  const blocks = db.prepare('select * from blocks where page_id = ? order by position').all(o.page.id).map(rowToBlock);
  json(ctx.res, 200, { page: o.page, blocks });
});

// ---------- blocks (полный массив — автосейв) ----------

app.put('/api/pages/:id/blocks', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);
  const list = Array.isArray(ctx.body.blocks) ? ctx.body.blocks : null;
  if (!list) return badRequest(ctx.res, 'need_blocks');

  const now = Date.now();
  const clean = list.slice(0, 1000).map((b, i) => {
    const type = TYPES.includes(b && b.type) ? b.type : 'paragraph';
    const id = typeof (b && b.id) === 'string' && b.id.length > 0 && b.id.length <= 40 ? b.id : uid('b_');
    const text = String((b && b.text) ?? '').slice(0, 100000);
    const checked = type === 'todo' && b.checked ? 1 : 0;
    let meta = {};
    if (b && b.meta && typeof b.meta === 'object' && !Array.isArray(b.meta)) meta = b.meta;
    return { id, position: i, type, text, checked, meta: JSON.stringify(meta) };
  });

  db.transaction(() => {
    db.prepare('delete from blocks where page_id = ?').run(o.page.id);
    const ins = db.prepare(
      'insert into blocks(id, page_id, position, type, text, checked, meta_json, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const b of clean) ins.run(b.id, o.page.id, b.position, b.type, b.text, b.checked, b.meta, now, now);
    touchPage(o.page.id);
  })();

  json(ctx.res, 200, { ok: true });
});

// ---------- публичная ссылка ----------

app.post('/api/pages/:id/share', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);
  let token = o.page.share_token;
  if (!token) {
    token = randomBytes(16).toString('hex');
    db.prepare('update pages set share_token = ?, updated = ? where id = ?').run(token, Date.now(), o.page.id);
  }
  json(ctx.res, 200, { share_token: token });
});

app.delete('/api/pages/:id/share', (ctx) => {
  const o = ownPage(ctx, ctx.params.id);
  if (o.error === 'auth') return unauthorized(ctx.res);
  if (o.error) return notFound(ctx.res);
  db.prepare('update pages set share_token = null, updated = ? where id = ?').run(Date.now(), o.page.id);
  json(ctx.res, 200, { ok: true });
});

// страница по токену: без сессии, только чтение
app.get('/api/public/:token', (ctx) => {
  const page = db.prepare('select * from pages where share_token = ?').get(ctx.params.token);
  if (!page) return notFound(ctx.res);
  const blocks = db.prepare('select * from blocks where page_id = ? order by position').all(page.id).map(rowToBlock);
  json(ctx.res, 200, { page: { title: page.title, updated: page.updated }, blocks });
});

// тот же SPA по адресу /s/<token>
app.get('/s/:token', (ctx) => {
  const html = fs.readFileSync(path.join(PUB, 'index.html'));
  bytes(ctx.res, 200, html, 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
});

// ---------- поиск ----------

app.get('/api/search', (ctx) => {
  const user = currentUser(db, ctx);
  if (!user) return unauthorized(ctx.res);
  const q = String(ctx.query.get('q') || '').trim().slice(0, 100).toLowerCase();
  if (!q) return json(ctx.res, 200, { results: [] });

  const pages = db.prepare('select id, title from pages where owner_id = ?').all(user.id);
  const byId = new Map(pages.map((p) => [p.id, p]));
  const hits = new Map();

  for (const p of pages) {
    if ((p.title || '').toLowerCase().includes(q)) {
      hits.set(p.id, { page_id: p.id, title: p.title, snippet: '' });
    }
  }
  const blocks = db
    .prepare('select b.page_id, b.text from blocks b join pages p on p.id = b.page_id where p.owner_id = ?')
    .all(user.id);
  for (const b of blocks) {
    const t = (b.text || '').toLowerCase();
    const i = t.indexOf(q);
    if (i < 0) continue;
    if (hits.has(b.page_id) && hits.get(b.page_id).snippet) continue;
    const start = Math.max(0, i - 40);
    const snippet = (start > 0 ? '…' : '') + (b.text || '').slice(start, i + q.length + 80);
    hits.set(b.page_id, { page_id: b.page_id, title: byId.get(b.page_id).title, snippet });
  }
  json(ctx.res, 200, { results: [...hits.values()].slice(0, 20) });
});

// ---------- seed (при первом входе пользователя) ----------

function seedPages(ownerId) {
  const now = Date.now();
  const insPage = db.prepare(
    'insert into pages(id, parent_id, owner_id, title, position, created, updated) values (?, ?, ?, ?, ?, ?, ?)'
  );
  const insBlock = db.prepare(
    'insert into blocks(id, page_id, position, type, text, checked, meta_json, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    const produkt = uid('p_');
    insPage.run(produkt, null, ownerId, 'Продукт', 1, now, now);
    const idei = uid('p_');
    insPage.run(idei, produkt, ownerId, 'Идеи', 1, now, now);
    [
      'Добавить экспорт страницы в Markdown',
      'Горячие клавиши для смены типа блока',
      'Совместное редактирование в реальном времени',
    ].forEach((t, i) => insBlock.run(uid('b_'), idei, i, 'paragraph', t, 0, '{}', now, now));

    const vstrechi = uid('p_');
    insPage.run(vstrechi, null, ownerId, 'Встречи', 2, now, now);
    const status = uid('p_');
    insPage.run(status, vstrechi, ownerId, 'Статус 19 ноября', 1, now, now);
    const seedBlocks = [
      { type: 'h1', text: 'Итоги встречи' },
      { type: 'todo', text: 'Согласовать макет главной страницы', checked: 1 },
      { type: 'todo', text: 'Подготовить текст для рассылки' },
      { type: 'bullet', text: 'Обсудили сроки релиза' },
      { type: 'bullet', text: 'Распределили задачи по команде' },
      { type: 'quote', text: 'Сначала выпускаем малую часть продукта, но стабильно.' },
      { type: 'code', text: 'const x = 1;', meta: { lang: 'javascript' } },
      { type: 'divider', text: '' },
      { type: 'paragraph', text: 'Следующая встреча — в четверг в 15:00.' },
    ];
    seedBlocks.forEach((b, i) =>
      insBlock.run(uid('b_'), status, i, b.type, b.text, b.checked || 0, JSON.stringify(b.meta || {}), now, now)
    );
  })();
}

const PORT = process.env.PORT || 3014;
app.listen(PORT, () => {});
