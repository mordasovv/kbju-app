'use strict';
(function () {
  /* ================= Telegram ================= */
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTG = !!(tg && tg.initData);
  const ver = (v) => { try { return !!(inTG && tg.isVersionAtLeast(v)); } catch (e) { return false; } };

  /* ================= helpers ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const r0 = (n) => Math.round(n || 0);
  const r1 = (n) => Math.round((n || 0) * 10) / 10;
  const fmt = (n) => r0(n).toLocaleString('ru-RU');
  const fmt1 = (n) => { const v = r1(n); return (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('.', ','); };
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; };
  const parseJSON = (s, fb) => { if (!s) return fb; try { return JSON.parse(s); } catch (e) { return fb; } };

  const haptic = {
    tap() { try { ver('6.1') && tg.HapticFeedback.impactOccurred('light'); } catch (e) {} },
    ok() { try { ver('6.1') && tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} },
    err() { try { ver('6.1') && tg.HapticFeedback.notificationOccurred('error'); } catch (e) {} },
  };

  const sv = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    left: sv('<path d="M15 5l-7 7 7 7"/>'),
    right: sv('<path d="M9 5l7 7-7 7"/>'),
    plus: sv('<path d="M12 5v14M5 12h14"/>'),
    close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    scan: sv('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 8v8M11 8v8M14 8v8M16.5 8v8" stroke-width="1.6"/>'),
    torch: sv('<path d="M8 3h8l-1 6H9z"/><path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M12 13v3"/>'),
    camera: sv('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    keyboard: sv('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
    trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  };

  /* ================= storage: Telegram CloudStorage + localStorage ================= */
  const LS = 'kbju:';
  const lsGet = (k) => { try { return localStorage.getItem(LS + k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(LS + k, v); } catch (e) {} };
  const lsDel = (k) => { try { localStorage.removeItem(LS + k); } catch (e) {} };
  const cloud = ver('6.9') && tg.CloudStorage ? tg.CloudStorage : null;
  const CLOUD_MAX = 4096;

  const Store = {
    getMany(keys) {
      return new Promise((resolve) => {
        const local = {};
        keys.forEach((k) => { local[k] = lsGet(k); });
        if (!cloud || !keys.length) return resolve(local);
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(local); } }, 5000);
        try {
          cloud.getItems(keys, (err, vals) => {
            if (done) return;
            done = true; clearTimeout(timer);
            if (err || !vals) return resolve(local);
            const out = {};
            keys.forEach((k) => {
              const v = vals[k];
              if (v) { out[k] = v; lsSet(k, v); } else { out[k] = null; lsDel(k); }
            });
            resolve(out);
          });
        } catch (e) { done = true; clearTimeout(timer); resolve(local); }
      });
    },
    async get(key) { return (await this.getMany([key]))[key]; },
    set(key, value) {
      lsSet(key, value);
      if (!cloud) return Promise.resolve(true);
      if (value.length > CLOUD_MAX) { toast('Слишком много записей за день для облака — сохранено только на этом устройстве'); return Promise.resolve(false); }
      return new Promise((resolve) => {
        try {
          cloud.setItem(key, value, (err) => {
            if (err) toast('Облако Telegram не ответило — сохранено на этом устройстве');
            resolve(!err);
          });
        } catch (e) { resolve(false); }
      });
    },
    del(key) {
      lsDel(key);
      if (!cloud) return Promise.resolve();
      return new Promise((resolve) => { try { cloud.removeItem(key, () => resolve()); } catch (e) { resolve(); } });
    },
    keys() {
      return new Promise((resolve) => {
        const local = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(LS)) local.push(k.slice(LS.length));
          }
        } catch (e) {}
        if (!cloud) return resolve(local);
        try { cloud.getKeys((err, ks) => resolve(err ? local : (ks || []))); } catch (e) { resolve(local); }
      });
    },
    async getJSON(key, fb) { return parseJSON(await this.get(key), fb); },
    setJSON(key, obj) { return this.set(key, JSON.stringify(obj)); },
  };

  /* ================= dates ================= */
  const pad = (n) => String(n).padStart(2, '0');
  const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => dstr(new Date());
  const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
  const dayKey = (s) => 'd_' + s.replace(/-/g, '');
  const dateLabel = (s) => {
    const t = todayStr();
    if (s === t) return 'Сегодня';
    if (s === addDays(t, -1)) return 'Вчера';
    if (s === addDays(t, 1)) return 'Завтра';
    return parseD(s).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  };

  /* ================= domain ================= */
  const DEFAULT_MEALS = [{ id: 0, n: 'Завтрак' }, { id: 1, n: 'Обед' }, { id: 2, n: 'Ужин' }, { id: 3, n: 'Перекус' }];
  const mealName = (id) => { const m = S.meals.find((x) => x.id === id); return m ? m.n : 'Другое'; };
  const defaultMeal = () => {
    const h = new Date().getHours();
    const want = h < 11 ? 0 : h < 16 ? 1 : h < 21 ? 2 : 3;
    return S.meals.some((x) => x.id === want) ? want : S.meals[0].id;
  };
  const mealChips = (sel) => `<div class="chips meal-chips">${S.meals.map((x) => `<button type="button" class="chip${x.id === sel ? ' on' : ''}" data-meal="${x.id}">${esc(x.n)}</button>`).join('')}</div>`;
  function bindMealChips(root, onPick) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-meal]');
      if (!b) return;
      const id = +b.dataset.meal;
      $$('[data-meal]', root).forEach((x) => x.classList.toggle('on', +x.dataset.meal === id));
      haptic.tap();
      onPick(id);
    });
  }
  const ACT = [
    [1.2, 'Почти без движения', 'сидячая работа, без тренировок'],
    [1.375, 'Немного', '1–3 тренировки в неделю'],
    [1.55, 'Средне', '3–5 тренировок в неделю'],
    [1.725, 'Много', '6–7 тренировок в неделю'],
    [1.9, 'Очень много', 'физическая работа и спорт'],
  ];
  const GOALS = { lose: ['Похудеть', 0.85, 1.8], keep: ['Держать', 1, 1.6], gain: ['Набрать', 1.1, 1.8] };
  const DEFAULT_GOALS = { kcal: 2000, p: 100, f: 67, c: 250, def: true };

  const bodyValid = (p) => p && p.age >= 14 && p.age <= 100 && p.height >= 120 && p.height <= 230 && p.weight >= 30 && p.weight <= 300;
  function autoGoals(p) {
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
    const g = GOALS[p.goal] || GOALS.keep;
    const tdee = bmr * (p.act || 1.375);
    const kcal = Math.round(tdee * g[1] / 10) * 10;
    const prot = Math.round(p.weight * g[2]);
    const fat = Math.round(Math.max(p.weight * 0.8, kcal * 0.25 / 9));
    const carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
    return { kcal, p: prot, f: fat, c: carb, bmr: Math.round(bmr), tdee: Math.round(tdee) };
  }
  function manualGoals(p) {
    const k = p.kcal;
    return {
      kcal: k,
      p: p.mp != null ? p.mp : Math.round(k * 0.3 / 4),
      f: p.mf != null ? p.mf : Math.round(k * 0.3 / 9),
      c: p.mc != null ? p.mc : Math.round(k * 0.4 / 4),
    };
  }
  const profileMode = (p) => (p && (p.mode || (p.manual ? 'manual' : p.age ? 'auto' : null))) || 'manual';
  function calcGoals(p) {
    if (!p) return DEFAULT_GOALS;
    if (profileMode(p) === 'manual') return p.kcal ? manualGoals(p) : DEFAULT_GOALS;
    if (bodyValid(p)) return autoGoals(p);
    return DEFAULT_GOALS;
  }
  const totals = (list) => list.reduce((a, e) => {
    const m = e.g / 100;
    a.k += e.k * m; a.p += e.p * m; a.f += e.f * m; a.c += e.c * m;
    return a;
  }, { k: 0, p: 0, f: 0, c: 0 });

  const BASE = (window.BASE_FOODS || []).map((x, i) => ({
    id: 'g' + i, n: x[0], k: x[1], p: x[2], f: x[3], c: x[4], u: x[5], ug: x[6], src: 'base',
  }));
  const compact = (p) => ({
    id: p.id, n: String(p.n).slice(0, 60), b: p.b ? String(p.b).slice(0, 30) : undefined,
    k: r1(p.k), p: r1(p.p), f: r1(p.f), c: r1(p.c),
    q: p.q || undefined, s: p.s || undefined, u: p.u || undefined, ug: p.ug || undefined, src: p.src,
  });

  /* ================= state ================= */
  const S = { date: todayStr(), entries: [], profile: null, goals: DEFAULT_GOALS, recent: [], my: null, tab: 'diary', meals: DEFAULT_MEALS.slice() };
  const saveMeals = () => Store.setJSON('meals', S.meals);
  const view = $('#view');

  async function loadDay() { S.entries = parseJSON(await Store.get(dayKey(S.date)), []) || []; }
  function saveDay() { return Store.setJSON(dayKey(S.date), S.entries); }

  async function ensureMy() {
    if (S.my) return S.my;
    const keys = (await Store.keys()).filter((k) => k.startsWith('p_'));
    const map = new Map();
    for (let i = 0; i < keys.length; i += 50) {
      const vals = await Store.getMany(keys.slice(i, i + 50));
      Object.values(vals).forEach((v) => { const p = parseJSON(v, null); if (p && p.id) map.set(p.id, Object.assign(p, { src: 'my' })); });
    }
    S.my = map;
    return map;
  }
  async function saveMy(prod) {
    await ensureMy();
    const p = compact(Object.assign({}, prod, { src: 'my' }));
    S.my.set(p.id, p);
    await Store.setJSON('p_' + p.id, p);
    return p;
  }
  async function deleteMy(id) {
    await ensureMy();
    S.my.delete(id);
    await Store.del('p_' + id);
  }
  async function pushRecent(prod) {
    let list = [compact(prod)].concat(S.recent.filter((x) => x.id !== prod.id)).slice(0, 20);
    let json = JSON.stringify(list);
    while (json.length > CLOUD_MAX - 100 && list.length > 1) { list = list.slice(0, -1); json = JSON.stringify(list); }
    S.recent = list;
    await Store.set('recent', json);
  }

  /* ================= Open Food Facts ================= */
  const OFF = 'https://world.openfoodfacts.org';
  const OFF_FIELDS = 'code,product_name,product_name_ru,generic_name,brands,quantity,product_quantity,serving_quantity,nutriments,image_front_small_url,image_small_url';

  async function fetchT(url, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), ms);
    try { return await fetch(url, ctrl ? { signal: ctrl.signal } : {}); } finally { clearTimeout(t); }
  }
  function fromOFF(p, code) {
    const nu = p.nutriments || {};
    let k = num(nu['energy-kcal_100g']);
    const pr = num(nu.proteins_100g), fa = num(nu.fat_100g), ca = num(nu.carbohydrates_100g);
    if (k == null) { const kj = num(nu['energy-kj_100g']) != null ? num(nu['energy-kj_100g']) : num(nu.energy_100g); if (kj != null) k = kj / 4.184; }
    if (k == null && (pr != null || fa != null || ca != null)) k = (pr || 0) * 4 + (fa || 0) * 9 + (ca || 0) * 4;
    const name = (p.product_name_ru || p.product_name || p.generic_name || '').trim();
    const q = num(p.product_quantity);
    const s = num(p.serving_quantity);
    return {
      id: String(code || p.code || ''),
      n: name || 'Без названия',
      b: (p.brands || '').split(',')[0].trim() || undefined,
      k: k == null ? null : r1(k), p: r1(pr), f: r1(fa), c: r1(ca),
      q: q && q > 0 && q < 10000 ? r0(q) : undefined,
      s: s && s > 0 && s < 2000 ? r0(s) : undefined,
      img: p.image_front_small_url || p.image_small_url || undefined,
      src: 'off',
    };
  }
  async function offProduct(code) {
    const r = await fetchT(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&lc=ru`, 10000);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j || !j.product || j.status === 0 || j.status === 'failure') return null;
    return fromOFF(j.product, code);
  }
  async function offSearch(q) {
    const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&lc=ru&fields=${OFF_FIELDS}`;
    const r = await fetchT(url, 15000);
    if (r.status === 429 || r.status === 503) throw Object.assign(new Error('busy'), { busy: true });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const seen = new Set();
    return (j.products || []).map((p) => fromOFF(p)).filter((p) => {
      if (p.k == null || !p.id || p.n === 'Без названия' || seen.has(p.id)) return false;
      seen.add(p.id); return true;
    });
  }
  async function findByCode(code) {
    await ensureMy();
    if (S.my.has(code)) return S.my.get(code);
    return offProduct(code);
  }

  /* ================= barcode parsing ================= */
  function checksumOk(d) {
    if (!/^\d{8,14}$/.test(d)) return false;
    const digits = d.split('').map(Number);
    const check = digits.pop();
    let sum = 0;
    digits.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
    return (10 - (sum % 10)) % 10 === check;
  }
  function gtin(d) {
    if (d.length === 14 && d[0] === '0') d = d.slice(1);
    if (d.length === 12) d = '0' + d;
    if (d.length === 13 && /^0{5}/.test(d)) d = d.slice(5);
    if (!checksumOk(d)) return { type: 'bad', value: d };
    return { type: d.length === 13 && d[0] === '2' ? 'weight' : 'gtin', value: d };
  }
  // EAN/UPC, «Честный знак» (DataMatrix: 01 + GTIN), GS1 Digital Link QR
  function normalizeCode(raw) {
    const s = String(raw || '').trim().replace(/^\][A-Za-z]\d/, '').replace(/^[\u001dè]+/, '');
    if (/^\d{8}$|^\d{12,14}$/.test(s)) return gtin(s);
    let m = s.match(/^01(\d{14})/);
    if (m) return gtin(m[1]);
    m = s.match(/\/01\/(\d{8,14})(?:[/?#]|$)/);
    if (m) return gtin(m[1]);
    return { type: /^https?:\/\//i.test(s) ? 'url' : 'text', value: s };
  }

  /* ================= UI: toast, sheets ================= */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }
  function confirmBox(msg) {
    return new Promise((resolve) => {
      if (ver('6.2')) { try { return tg.showConfirm(msg, (ok) => resolve(!!ok)); } catch (e) {} }
      resolve(window.confirm(msg));
    });
  }

  /* ---------- home screen shortcut (Bot API 8.0) ---------- */
  const homeScreen = { status: null };
  const canAddHome = () => homeScreen.status === 'missed' || homeScreen.status === 'unknown';
  function checkHome(cb) {
    if (!ver('8.0') || typeof tg.checkHomeScreenStatus !== 'function') { homeScreen.status = 'unsupported'; return cb && cb(); }
    let done = false;
    const finish = (st) => { if (done) return; done = true; homeScreen.status = st || 'unsupported'; if (cb) cb(); };
    try { tg.checkHomeScreenStatus(finish); } catch (e) { finish('unsupported'); }
    setTimeout(() => finish(homeScreen.status || 'unsupported'), 3000);
  }
  function addHome() {
    try { tg.addToHomeScreen(); } catch (e) { toast('Не получилось добавить иконку на этом устройстве'); }
  }
  if (ver('8.0')) {
    try {
      tg.onEvent('homeScreenAdded', () => {
        homeScreen.status = 'added';
        haptic.ok();
        toast('Иконка добавлена на главный экран');
        if (S.tab === 'diary') render(); else { const c = $('#homeCard'); if (c) c.remove(); }
      });
    } catch (e) {}
  }
  const homeBanner = () => (canAddHome() && !lsGet('hs_hide') ? `
    <div class="home-card">
      <div class="home-text"><b>На главный экран</b><p>Открывай в одно касание, как обычное приложение.</p></div>
      <button class="btn primary sm" data-act="home-add">Добавить</button>
      <button class="icon-btn home-x" data-act="home-hide" aria-label="Скрыть">${ICON.close}</button>
    </div>` : '');

  const sheets = [];
  function openSheet({ title, body, cls }) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap' + (cls ? ' ' + cls : '');
    wrap.innerHTML = `<div class="sheet-backdrop"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn sheet-close" aria-label="Закрыть">${ICON.close}</button></header>
        <div class="sheet-body">${body}</div>
      </section>`;
    $('#sheets').appendChild(wrap);
    const api = {
      el: wrap,
      body: $('.sheet-body', wrap),
      close: () => closeSheet(api),
      onClose: null,
    };
    $('.sheet-backdrop', wrap).addEventListener('click', api.close);
    $('.sheet-close', wrap).addEventListener('click', api.close);
    sheets.push(api);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    syncBack();
    return api;
  }
  function closeSheet(api) {
    const i = sheets.indexOf(api);
    if (i < 0) return;
    sheets.splice(i, 1);
    if (api.onClose) api.onClose();
    api.el.classList.remove('open');
    setTimeout(() => api.el.remove(), 260);
    syncBack();
  }
  function closeAll() { sheets.slice().reverse().forEach(closeSheet); }
  function syncBack() {
    if (!ver('6.1')) return;
    if (sheets.length || scanner.active) tg.BackButton.show(); else tg.BackButton.hide();
  }
  function goBack() {
    if (scanner.active) return stopScanner();
    const top = sheets[sheets.length - 1];
    if (top) top.close();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') goBack(); });

  /* ================= diary ================= */
  function render() {
    $$('.tabbar [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    if (S.tab === 'profile') renderProfile(); else renderDiary();
  }

  const macroCol = (key, label, val, goal) => `
    <div class="mac ${key}">
      <span class="mac-name">${label}</span>
      <span class="mac-val"><b>${fmt(val)}</b> / ${fmt(goal)} г</span>
      <span class="mac-bar"><i style="width:${goal ? Math.min(100, (val / goal) * 100).toFixed(1) : 0}%"></i></span>
    </div>`;

  const entrySub = (e) => (e.x
    ? `Б ${fmt1(e.p)}, Ж ${fmt1(e.f)}, У ${fmt1(e.c)}`
    : `${fmt(e.g)} г${e.b ? ', ' + esc(e.b) : ''}`);

  function mealBlock(id, title, list, canAdd) {
    const t = totals(list);
    return `<div class="meal">
      <div class="meal-head">
        ${canAdd ? `<button class="meal-title" data-meal-edit="${id}" aria-label="Переименовать «${esc(title)}»"><h3>${esc(title)}</h3></button>` : `<h3>${esc(title)}</h3>`}
        <span>${list.length ? fmt(t.k) + ' ккал' : ''}</span>
      </div>
      ${list.map((e) => `<button class="entry" data-entry="${esc(e.i)}">
        <span class="e-name">${esc(e.n)}<small>${entrySub(e)}</small></span>
        <span class="e-k">${fmt((e.k * e.g) / 100)}</span>
      </button>`).join('')}
      ${canAdd ? `<button class="add-row" data-add="${id}">${ICON.plus}<span>Добавить</span></button>` : ''}
    </div>`;
  }
  function mealsHTML() {
    const known = new Set(S.meals.map((m) => m.id));
    const orphans = S.entries.filter((e) => !known.has(e.m));
    return S.meals.map((m) => mealBlock(m.id, m.n, S.entries.filter((e) => e.m === m.id), true)).join('')
      + (orphans.length ? mealBlock(-1, 'Другое', orphans, false) : '')
      + `<button class="add-meal" data-act="new-meal">${ICON.plus}<span>Добавить приём пищи</span></button>`;
  }

  function openMealEdit(id) {
    const meal = S.meals.find((m) => m.id === id);
    const isNew = !meal;
    const sh = openSheet({
      title: isNew ? 'Новый приём пищи' : 'Приём пищи',
      body: `<form class="stack" id="mealf" novalidate>
          <label class="fld"><span>Название</span><div class="inp"><input name="n" value="${esc(meal ? meal.n : '')}" placeholder="Например, второй перекус" maxlength="30" autocomplete="off"></div></label>
          <button type="submit" class="btn primary">${isNew ? 'Добавить' : 'Сохранить'}</button>
          ${!isNew && S.meals.length > 1 ? `<button type="button" class="btn danger" data-act="del">${ICON.trash}<span>Удалить приём пищи</span></button>` : ''}
        </form>`,
    });
    const input = $('input', sh.body);
    if (isNew) setTimeout(() => input.focus(), 300);
    $('#mealf', sh.body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = input.value.trim();
      if (!n) { haptic.err(); return toast('Напиши название'); }
      if (isNew) S.meals.push({ id: S.meals.reduce((a, m) => Math.max(a, m.id), -1) + 1, n: n.slice(0, 30) });
      else meal.n = n.slice(0, 30);
      await saveMeals();
      haptic.ok();
      sh.close();
      renderDiary();
    });
    const del = $('[data-act=del]', sh.body);
    if (del) del.addEventListener('click', async () => {
      if (S.entries.some((x) => x.m === id)) { haptic.err(); return toast('Сначала удали записи из этого приёма пищи'); }
      if (!(await confirmBox(`Убрать «${meal.n}» из дневника?`))) return;
      S.meals = S.meals.filter((m) => m.id !== id);
      await saveMeals();
      sh.close();
      renderDiary();
    });
  }

  function renderDiary() {
    const g = S.goals;
    const t = totals(S.entries);
    const left = g.kcal - t.k;
    const over = left < -0.5;
    const scale = Math.max(g.kcal, t.k) || 1;
    const mk = { p: t.p * 4, f: t.f * 9, c: t.c * 4 };
    const mkSum = mk.p + mk.f + mk.c;
    const seg = (v) => (mkSum ? ((t.k / scale) * (v / mkSum) * 100) : 0).toFixed(2) + '%';
    const isToday = S.date === todayStr();

    view.innerHTML = `
      <header class="day-nav">
        <button class="icon-btn" data-act="prev" aria-label="Предыдущий день">${ICON.left}</button>
        <button class="day-title" data-act="today" ${isToday ? 'disabled' : ''}>${esc(dateLabel(S.date))}</button>
        <button class="icon-btn" data-act="next" aria-label="Следующий день">${ICON.right}</button>
      </header>

      <section class="summary">
        <p class="sum-label">${over ? 'Больше цели на' : 'Осталось'}</p>
        <p class="sum-big${over ? ' over' : ''}">${fmt(Math.abs(left))}<span>ккал</span></p>
        <p class="sum-sub">Съедено ${fmt(t.k)} из ${fmt(g.kcal)}</p>
        <div class="meter" role="img" aria-label="Съедено ${fmt(t.k)} из ${fmt(g.kcal)} ккал">
          ${mkSum > 0 ? `<i class="seg p" style="width:${seg(mk.p)}"></i><i class="seg f" style="width:${seg(mk.f)}"></i><i class="seg c" style="width:${seg(mk.c)}"></i>` : ''}
          ${over ? `<b class="goal-tick" style="left:${((g.kcal / scale) * 100).toFixed(2)}%"></b>` : ''}
        </div>
        <div class="macros">${macroCol('p', 'Белки', t.p, g.p)}${macroCol('f', 'Жиры', t.f, g.f)}${macroCol('c', 'Углеводы', t.c, g.c)}</div>
        ${g.def ? `<button class="hint-card" data-act="profile">Сейчас стоит норма 2 000 ккал по умолчанию. <span>Задать свою норму</span></button>` : ''}
      </section>

      ${homeBanner()}
      <section class="meals">${mealsHTML()}</section>

      <section class="week card">
        <h2>Последние 7 дней</h2>
        <div id="week"><div class="week-chart"></div></div>
      </section>`;
    renderWeek();
  }

  async function renderWeek() {
    const forDate = S.date;
    const days = Array.from({ length: 7 }, (_, i) => addDays(forDate, i - 6));
    const vals = await Store.getMany(days.map(dayKey));
    if (S.tab !== 'diary' || S.date !== forDate) return;
    const box = $('#week');
    if (!box) return;
    const kc = days.map((d) => (d === forDate ? totals(S.entries).k : totals(parseJSON(vals[dayKey(d)], []) || []).k));
    const goal = S.goals.kcal;
    const max = Math.max(goal * 1.2, ...kc) || 1;
    const logged = kc.filter((v) => v > 0);
    const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
    box.innerHTML = `
      <div class="week-chart">
        <span class="goal-line" style="bottom:${((goal / max) * 100).toFixed(1)}%"><em>${fmt(goal)}</em></span>
        ${kc.map((v, i) => `<button class="wb${days[i] === forDate ? ' cur' : ''}${v > goal * 1.05 ? ' over' : ''}" data-day="${days[i]}" aria-label="${esc(dateLabel(days[i]))}: ${fmt(v)} ккал">
          <i style="height:${Math.max(v ? 3 : 0, (v / max) * 100).toFixed(1)}%"></i>
        </button>`).join('')}
      </div>
      <div class="week-days">${days.map((d) => `<span${d === forDate ? ' class="cur"' : ''}>${parseD(d).toLocaleDateString('ru-RU', { weekday: 'short' })}</span>`).join('')}</div>
      <p class="muted">${logged.length ? `В среднем ${fmt(avg)} ккал в день — по ${logged.length} ${plural(logged.length, 'дню', 'дням', 'дням')} с записями` : 'Пока нет записей за эту неделю'}</p>`;
  }

  view.addEventListener('click', async (e) => {
    const el = e.target.closest('button');
    if (!el || !view.contains(el)) return;
    if (el.dataset.add != null) { haptic.tap(); return openAdd(+el.dataset.add); }
    if (el.dataset.mealEdit != null) { haptic.tap(); return openMealEdit(+el.dataset.mealEdit); }
    if (el.dataset.entry) {
      const entry = S.entries.find((x) => x.i === el.dataset.entry);
      if (!entry) return;
      if (entry.x) openQuick({ entry, meal: entry.m });
      else openProduct(entryToProd(entry), { entry, meal: entry.m });
      return;
    }
    if (el.dataset.day) { await switchDay(el.dataset.day); return; }
    const act = el.dataset.act;
    if (act === 'prev') return switchDay(addDays(S.date, -1));
    if (act === 'next') return switchDay(addDays(S.date, 1));
    if (act === 'today') return switchDay(todayStr());
    if (act === 'new-meal') return openMealEdit(null);
    if (act === 'home-add') return addHome();
    if (act === 'home-hide') { lsSet('hs_hide', '1'); const c = el.closest('.home-card'); if (c) c.remove(); return; }
    if (act === 'profile') { S.tab = 'profile'; render(); window.scrollTo(0, 0); }
  });

  async function switchDay(d) {
    haptic.tap();
    S.date = d;
    await loadDay();
    if (S.tab === 'diary') renderDiary();
  }

  const entryToProd = (e) => ({ id: e.pid || 'e' + e.i, n: e.n, b: e.b, k: e.k, p: e.p, f: e.f, c: e.c, u: e.u, ug: e.ug, q: e.q, s: e.s, src: 'entry' });

  /* ================= add / search ================= */
  function localSearch(q) {
    const nq = norm(q);
    if (!nq) return [];
    const words = nq.split(' ');
    const pool = [].concat(S.recent, S.my ? Array.from(S.my.values()) : [], BASE);
    const seen = new Set();
    const out = [];
    pool.forEach((p) => {
      if (seen.has(p.id)) return;
      const hay = norm(p.n + ' ' + (p.b || ''));
      if (!words.every((w) => hay.includes(w))) return;
      seen.add(p.id);
      const score = hay.startsWith(nq) ? 0 : (' ' + hay).includes(' ' + words[0]) ? 1 : 2;
      out.push({ p, score });
    });
    return out.sort((a, b) => a.score - b.score).slice(0, 40).map((x) => x.p);
  }

  const resRow = (p, i) => {
    const sub = p.b || (p.u && p.ug ? `1 ${p.u} ≈ ${p.ug} г` : '');
    return `<button class="res" data-pick="${i}">
      <span class="res-name">${esc(p.n)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <span class="res-k">${p.k != null ? fmt(p.k) : '—'}<small>ккал / 100 г</small></span>
    </button>`;
  };

  function openAdd(meal, presetQuery) {
    let m = meal != null ? meal : defaultMeal();
    let picks = [];
    let offResults = null;
    let offState = 'idle';
    const notToday = S.date !== todayStr();
    const sh = openSheet({
      title: notToday ? `Добавить: ${dateLabel(S.date).toLowerCase()}` : 'Добавить',
      body: `
        ${mealChips(m)}
        <form class="search" role="search">
          <input type="search" id="q" placeholder="Гречка, творог или цифры штрихкода" autocomplete="off" enterkeyhint="search" value="${esc(presetQuery || '')}">
          <button type="button" class="icon-btn accent" data-act="scan" aria-label="Сканировать штрихкод">${ICON.scan}</button>
        </form>
        <div class="add-actions">
          <button class="btn ghost" data-act="quick">Только ккал и БЖУ</button>
          <button class="btn ghost" data-act="custom">Свой продукт</button>
        </div>
        <div id="results"></div>`,
    });
    const input = $('#q', sh.body);
    const results = $('#results', sh.body);

    function draw() {
      const q = input.value.trim();
      picks = [];
      let html = '';
      const group = (title, list) => {
        if (!list.length) return;
        html += `<h4 class="group">${title}</h4>`;
        list.forEach((p) => { html += resRow(p, picks.length); picks.push(p); });
      };
      if (!q) {
        group('Недавние', S.recent.slice(0, 12));
        group('Мои продукты', S.my ? Array.from(S.my.values()).slice(0, 30) : []);
        if (!picks.length) html += `<p class="empty-text">Начни вводить название или отсканируй штрихкод на упаковке.</p>`;
      } else {
        const digits = q.replace(/\s/g, '');
        if (/^\d{8,14}$/.test(digits)) {
          html += `<button class="btn primary" data-act="code">${ICON.search}<span>Найти по штрихкоду ${esc(digits)}</span></button>`;
        } else {
          group('Найдено', localSearch(q));
          if (offState === 'loading') html += `<div class="loading small"><span class="spinner"></span><p>Ищу в базе магазинов…</p></div>`;
          else if (offState === 'done') {
            if (offResults && offResults.length) group('Из магазинов', offResults);
            else html += `<p class="empty-text">В базе магазинов ничего не нашлось. Добавь продукт сам — займёт полминуты.</p>`;
          } else if (offState === 'error') html += `<p class="empty-text">${esc(offResults)}</p><button class="btn ghost" data-act="off">Повторить поиск</button>`;
          else html += `<button class="btn ghost" data-act="off">${ICON.search}<span>Искать «${esc(q)}» в базе магазинов</span></button>`;
        }
      }
      results.innerHTML = html;
    }

    async function runOff() {
      const q = input.value.trim();
      if (q.length < 2) return;
      offState = 'loading'; draw();
      try {
        offResults = await offSearch(q);
        offState = 'done';
      } catch (err) {
        offState = 'error';
        offResults = err && err.busy ? 'База магазинов перегружена. Подожди минуту и повтори.' : 'Не получилось связаться с базой. Проверь интернет.';
      }
      if (input.value.trim() === q) draw();
    }

    input.addEventListener('input', () => { offState = 'idle'; offResults = null; draw(); });
    $('form', sh.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const digits = input.value.replace(/\s/g, '');
      if (/^\d{8,14}$/.test(digits)) return codeFromInput(digits);
      input.blur();
      runOff();
    });
    function codeFromInput(digits) {
      const c = normalizeCode(digits);
      if (c.type === 'bad') { haptic.err(); return toast('В коде ошибка — проверь цифры под штрихкодом'); }
      if (c.type === 'weight') return toast('Это внутренний код магазина для весового товара. Найди продукт по названию.');
      lookupCode(c.value, { meal: m });
    }
    sh.body.addEventListener('click', (e) => {
      const el = e.target.closest('button');
      if (!el) return;
      if (el.dataset.meal != null) {
        m = +el.dataset.meal;
        $$('[data-meal]', sh.body).forEach((b) => b.classList.toggle('on', +b.dataset.meal === m));
        return haptic.tap();
      }
      if (el.dataset.pick != null) { const p = picks[+el.dataset.pick]; if (p) openProduct(p, { meal: m }); return; }
      const act = el.dataset.act;
      if (act === 'scan') return openScanner({ meal: m });
      if (act === 'custom') return openCustom({ meal: m, prefill: { n: /^\d+$/.test(input.value.trim()) ? '' : input.value.trim() } });
      if (act === 'quick') return openQuick({ meal: m, name: /^\d+$/.test(input.value.trim()) ? '' : input.value.trim() });
      if (act === 'off') return runOff();
      if (act === 'code') return codeFromInput(input.value.replace(/\s/g, ''));
    });

    draw();
    if (!S.my) ensureMy().then(() => { if (!input.value.trim()) draw(); });
    if (!presetQuery && !ver('6.0')) setTimeout(() => input.focus(), 300);
  }

  /* ================= product card ================= */
  function openProduct(prod, ctx) {
    ctx = ctx || {};
    if (prod.k == null) {
      return openCustom({ meal: ctx.meal, prefill: prod, reason: 'В базе нет КБЖУ для этого продукта. Перепиши с упаковки — сохраню, и в следующий раз он найдётся по скану сразу.' });
    }
    const entry = ctx.entry;
    let m = ctx.meal != null ? ctx.meal : defaultMeal();
    let grams = entry ? entry.g : prod.ug ? prod.ug : prod.q && prod.q <= 120 ? prod.q : prod.s ? prod.s : 100;

    const portions = [];
    if (prod.ug && prod.u) portions.push([prod.ug, `1 ${prod.u}`]);
    if (prod.s) portions.push([prod.s, 'Порция']);
    if (prod.q) portions.push([prod.q, 'Вся упаковка']);
    [50, 100, 150, 200].forEach((g) => { if (!portions.some((p) => p[0] === g)) portions.push([g, null]); });

    const sh = openSheet({
      title: entry ? 'Запись в дневнике' : 'Продукт',
      body: `
        <div class="prod-head">
          ${prod.img ? `<img src="${esc(prod.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
          <div><h3>${esc(prod.n)}</h3>${prod.b ? `<p>${esc(prod.b)}</p>` : prod.src === 'base' ? '<p>Средние значения</p>' : ''}</div>
        </div>
        <div class="per100">
          <div><b>${fmt(prod.k)}</b><span>ккал</span></div>
          <div class="p"><b>${fmt1(prod.p)}</b><span>белки</span></div>
          <div class="f"><b>${fmt1(prod.f)}</b><span>жиры</span></div>
          <div class="c"><b>${fmt1(prod.c)}</b><span>углеводы</span></div>
        </div>
        <p class="per100-note">в 100 г</p>

        <label class="grams-label" for="grams">Сколько грамм</label>
        <div class="stepper">
          <button type="button" data-d="-10" aria-label="Минус 10 грамм">−</button>
          <input id="grams" inputmode="decimal" value="${fmt1(grams)}" autocomplete="off">
          <button type="button" data-d="10" aria-label="Плюс 10 грамм">+</button>
        </div>
        <div class="chips portions">${portions.map(([g, l]) => `<button class="chip" data-g="${g}">${l ? `${esc(l)} (${fmt(g)} г)` : `${fmt(g)} г`}</button>`).join('')}</div>

        <div class="calc" id="calc"></div>

        ${mealChips(m)}
        <button class="btn primary" data-act="save">${entry ? 'Сохранить' : 'Добавить в дневник'}</button>
        ${entry ? `<button class="btn danger" data-act="del">${ICON.trash}<span>Удалить из дневника</span></button>` : ''}
        <button class="link-btn" data-act="fix">Неверное КБЖУ? Исправить</button>`,
    });
    const gi = $('#grams', sh.body);
    const calc = $('#calc', sh.body);

    function upd() {
      const g = num(gi.value) || 0;
      const k = g / 100;
      calc.innerHTML = `
        <div class="calc-k"><b>${fmt(prod.k * k)}</b><span>ккал</span></div>
        <div class="p"><b>${fmt1(prod.p * k)}</b><span>Б</span></div>
        <div class="f"><b>${fmt1(prod.f * k)}</b><span>Ж</span></div>
        <div class="c"><b>${fmt1(prod.c * k)}</b><span>У</span></div>`;
    }
    gi.addEventListener('input', upd);
    gi.addEventListener('focus', () => gi.select());
    upd();

    sh.body.addEventListener('click', async (e) => {
      const el = e.target.closest('button');
      if (!el) return;
      if (el.dataset.d) {
        const v = Math.max(0, (num(gi.value) || 0) + +el.dataset.d);
        gi.value = fmt1(v); upd(); return haptic.tap();
      }
      if (el.dataset.g) { gi.value = fmt1(+el.dataset.g); upd(); return haptic.tap(); }
      if (el.dataset.meal != null) {
        m = +el.dataset.meal;
        $$('[data-meal]', sh.body).forEach((b) => b.classList.toggle('on', +b.dataset.meal === m));
        return haptic.tap();
      }
      const act = el.dataset.act;
      if (act === 'save') {
        const g = num(gi.value);
        if (!g || g <= 0 || g > 5000) { haptic.err(); gi.focus(); return toast('Укажи вес от 1 до 5000 г'); }
        if (entry) {
          Object.assign(entry, { g: r1(g), m });
        } else {
          S.entries.push({
            i: uid(), pid: prod.id, n: String(prod.n).slice(0, 60), b: prod.b ? String(prod.b).slice(0, 30) : undefined,
            g: r1(g), k: r1(prod.k), p: r1(prod.p), f: r1(prod.f), c: r1(prod.c), m,
            u: prod.u || undefined, ug: prod.ug || undefined, q: prod.q || undefined, s: prod.s || undefined,
          });
          if (prod.src !== 'entry') pushRecent(prod);
        }
        await saveDay();
        haptic.ok();
        closeAll();
        S.tab = 'diary';
        render();
        toast(entry ? 'Сохранено' : `Добавлено: ${mealName(m).toLowerCase()}`);
      }
      if (act === 'del' && entry) {
        if (!(await confirmBox(`Удалить «${entry.n}» из дневника?`))) return;
        S.entries = S.entries.filter((x) => x.i !== entry.i);
        await saveDay();
        haptic.ok();
        closeAll();
        render();
        toast('Удалено');
      }
      if (act === 'fix') {
        openCustom({ meal: m, prefill: prod, entry, reason: 'Перепиши КБЖУ с упаковки. Исправленный продукт сохранится в «Мои продукты».' });
      }
    });
  }

  /* ================= quick entry: kcal + macros for a whole meal ================= */
  function openQuick({ meal, entry, name }) {
    let m = entry ? entry.m : meal != null ? meal : defaultMeal();
    const v = (x) => (x == null ? '' : fmt1(x));
    const sh = openSheet({
      title: entry ? 'Запись в дневнике' : 'Только ккал и БЖУ',
      body: `
        ${entry ? '' : '<p class="note">Для блюда целиком, когда знаешь его калории и БЖУ: из меню кафе, доставки или своего рецепта.</p>'}
        <form class="stack" id="qf" novalidate>
          <label class="fld"><span>Название</span><div class="inp"><input name="n" value="${esc(entry ? entry.n : name || '')}" placeholder="Например, поке с курицей" maxlength="60" autocomplete="off"></div></label>
          <p class="fld-title">На всю порцию</p>
          <div class="row4">
            <label class="fld"><span>Ккал</span><div class="inp"><input name="k" inputmode="decimal" value="${entry ? v(entry.k) : ''}"></div></label>
            <label class="fld p"><span>Белки</span><div class="inp"><input name="p" inputmode="decimal" value="${entry ? v(entry.p) : ''}"></div></label>
            <label class="fld f"><span>Жиры</span><div class="inp"><input name="f" inputmode="decimal" value="${entry ? v(entry.f) : ''}"></div></label>
            <label class="fld c"><span>Углев.</span><div class="inp"><input name="c" inputmode="decimal" value="${entry ? v(entry.c) : ''}"></div></label>
          </div>
          <p class="muted small">Калории можно не писать — посчитаю по белкам, жирам и углеводам.</p>
          ${mealChips(m)}
          <button type="submit" class="btn primary">${entry ? 'Сохранить' : 'Записать'}</button>
          ${entry ? `<button type="button" class="btn danger" data-act="del">${ICON.trash}<span>Удалить из дневника</span></button>` : ''}
        </form>`,
    });
    bindMealChips(sh.body, (id) => { m = id; });
    const form = $('#qf', sh.body);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const pr = num(fd.get('p')), fa = num(fd.get('f')), ca = num(fd.get('c'));
      let k = num(fd.get('k'));
      const err = (msg) => { haptic.err(); toast(msg); };
      if (k == null && pr == null && fa == null && ca == null) return err('Заполни калории или БЖУ');
      if ([pr, fa, ca].some((x) => x != null && (x < 0 || x > 1000))) return err('Белки, жиры и углеводы — от 0 до 1000 г');
      if (k == null) k = (pr || 0) * 4 + (fa || 0) * 9 + (ca || 0) * 4;
      if (k < 0 || k > 10000) return err('Калории — от 0 до 10 000');
      const n = String(fd.get('n') || '').trim().slice(0, 60) || mealName(m);
      const data = { n, g: 100, k: r1(k), p: r1(pr), f: r1(fa), c: r1(ca), m, x: 1 };
      if (entry) Object.assign(entry, data);
      else S.entries.push(Object.assign({ i: uid() }, data));
      await saveDay();
      haptic.ok();
      closeAll();
      S.tab = 'diary';
      render();
      toast(entry ? 'Сохранено' : `Записано: ${mealName(m).toLowerCase()}`);
    });
    const del = $('[data-act=del]', sh.body);
    if (del) del.addEventListener('click', async () => {
      if (!(await confirmBox(`Удалить «${entry.n}» из дневника?`))) return;
      S.entries = S.entries.filter((x) => x.i !== entry.i);
      await saveDay();
      haptic.ok();
      closeAll();
      render();
      toast('Удалено');
    });
  }

  /* ================= custom product ================= */
  function openCustom({ meal, prefill, reason, entry }) {
    const p = prefill || {};
    const code = /^\d{8,14}$/.test(p.id || '') ? p.id : '';
    const v = (x) => (x == null || x === '' ? '' : fmt1(x));
    const sh = openSheet({
      title: p.n ? 'Проверь КБЖУ' : 'Свой продукт',
      body: `
        ${reason ? `<p class="note">${esc(reason)}</p>` : ''}
        <form class="stack" id="cf" novalidate>
          <label class="fld"><span>Название</span><div class="inp"><input name="n" value="${esc(p.n === 'Без названия' ? '' : p.n || '')}" autocomplete="off" maxlength="60"></div></label>
          <div class="row2">
            <label class="fld"><span>Бренд</span><div class="inp"><input name="b" value="${esc(p.b || '')}" autocomplete="off" maxlength="30"></div></label>
            <label class="fld"><span>Штрихкод</span><div class="inp"><input name="code" inputmode="numeric" value="${esc(code)}" autocomplete="off"></div></label>
          </div>
          <p class="fld-title">На 100 г — как на упаковке</p>
          <div class="row4">
            <label class="fld"><span>Ккал</span><div class="inp"><input name="k" inputmode="decimal" value="${v(p.k)}"></div></label>
            <label class="fld p"><span>Белки</span><div class="inp"><input name="p" inputmode="decimal" value="${v(p.p)}"></div></label>
            <label class="fld f"><span>Жиры</span><div class="inp"><input name="f" inputmode="decimal" value="${v(p.f)}"></div></label>
            <label class="fld c"><span>Углев.</span><div class="inp"><input name="c" inputmode="decimal" value="${v(p.c)}"></div></label>
          </div>
          <p class="muted small">Калории можно не писать — посчитаю по белкам, жирам и углеводам.</p>
          <label class="fld"><span>Вес упаковки, г (если есть)</span><div class="inp"><input name="q" inputmode="decimal" value="${v(p.q)}"></div></label>
          <button type="submit" class="btn primary">Сохранить продукт</button>
        </form>`,
    });
    $('#cf', sh.body).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const n = String(fd.get('n') || '').trim();
      const pr = num(fd.get('p')), fa = num(fd.get('f')), ca = num(fd.get('c'));
      let k = num(fd.get('k'));
      const codeIn = String(fd.get('code') || '').replace(/\s/g, '');
      const err = (msg) => { haptic.err(); toast(msg); };
      if (!n) return err('Напиши название продукта');
      if (k == null && pr == null && fa == null && ca == null) return err('Заполни калории или БЖУ');
      if ([pr, fa, ca].some((x) => x != null && (x < 0 || x > 100))) return err('Белки, жиры и углеводы — от 0 до 100 г');
      if ((pr || 0) + (fa || 0) + (ca || 0) > 100.5) return err('БЖУ в сумме не может быть больше 100 г на 100 г');
      if (k == null) k = (pr || 0) * 4 + (fa || 0) * 9 + (ca || 0) * 4;
      if (k < 0 || k > 950) return err('Калорий на 100 г не бывает больше 900');
      let id;
      if (codeIn) {
        const c = normalizeCode(codeIn);
        if (c.type !== 'gtin' && c.type !== 'weight') return err('Штрихкод с ошибкой — проверь цифры или оставь поле пустым');
        id = c.value;
      } else {
        id = p.src === 'my' && p.id ? p.id : 'u' + uid();
      }
      const saved = await saveMy({ id, n, b: String(fd.get('b') || '').trim() || undefined, k, p: pr || 0, f: fa || 0, c: ca || 0, q: num(fd.get('q')) || undefined, u: p.u, ug: p.ug, s: p.s });
      haptic.ok();
      sh.close();
      if (entry) {
        Object.assign(entry, { pid: saved.id, n: saved.n, b: saved.b, k: saved.k, p: saved.p, f: saved.f, c: saved.c });
        await saveDay();
        render();
        closeAll();
        toast('КБЖУ исправлено');
        return;
      }
      toast('Продукт сохранён');
      openProduct(saved, { meal });
    });
  }

  /* ================= code lookup ================= */
  async function lookupCode(code, ctx) {
    const sh = openSheet({ title: 'Ищу продукт', body: `<div class="loading"><span class="spinner"></span><p>Штрихкод ${esc(code)}</p></div>` });
    try {
      const prod = await findByCode(code);
      if (!sheets.includes(sh)) return;
      sh.close();
      if (prod) openProduct(prod, ctx);
      else openCustom({ meal: ctx && ctx.meal, prefill: { id: code }, reason: `Продукта ${code} пока нет в базе. Перепиши КБЖУ с упаковки один раз — дальше он будет находиться по скану сразу.` });
    } catch (e) {
      if (!sheets.includes(sh)) return;
      sh.body.innerHTML = `<p class="note">Не получилось связаться с базой продуктов. Проверь интернет и попробуй ещё раз.</p>
        <button class="btn primary" data-r>Повторить</button>
        <button class="btn ghost" data-c>Ввести КБЖУ с упаковки</button>`;
      $('[data-r]', sh.body).onclick = () => { sh.close(); lookupCode(code, ctx); };
      $('[data-c]', sh.body).onclick = () => { sh.close(); openCustom({ meal: ctx && ctx.meal, prefill: { id: code } }); };
    }
  }

  /* ================= scanner ================= */
  const scanner = { active: false };
  const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix', 'code_128'];
  let detectorPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('load ' + src));
      document.head.appendChild(s);
    });
  }
  function getDetector() {
    if (detectorPromise) return detectorPromise;
    detectorPromise = (async () => {
      if ('BarcodeDetector' in window) {
        try {
          const sup = await window.BarcodeDetector.getSupportedFormats();
          if (sup.includes('ean_13')) return new window.BarcodeDetector({ formats: SCAN_FORMATS.filter((f) => sup.includes(f)) });
        } catch (e) {}
      }
      if (!window.BarcodeDetectionAPI) await loadScript('vendor/barcode-detector.js');
      const api = window.BarcodeDetectionAPI;
      const wasmUrl = new URL('vendor/zxing_reader.wasm', location.href).href;
      api.setZXingModuleOverrides({ locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) });
      return new api.BarcodeDetector({ formats: SCAN_FORMATS });
    })();
    detectorPromise.catch(() => { detectorPromise = null; });
    return detectorPromise;
  }

  function openScanner(ctx) {
    if (scanner.active) return;
    Object.assign(scanner, { active: true, ctx: ctx || {}, stream: null, timer: null, busy: false, lastMsg: 0, torch: false });
    const el = document.createElement('div');
    el.className = 'scanner';
    el.innerHTML = `
      <video playsinline muted autoplay></video>
      <div class="scan-mask"><div class="scan-frame"><i class="scan-line"></i></div></div>
      <button class="icon-btn scan-close" data-act="close" aria-label="Закрыть">${ICON.close}</button>
      <p class="scan-status">Включаю камеру…</p>
      <div class="scan-tools">
        <button class="scan-btn" data-act="torch" hidden>${ICON.torch}<span>Фонарик</span></button>
        <button class="scan-btn" data-act="photo">${ICON.camera}<span>Фото</span></button>
        <button class="scan-btn" data-act="manual">${ICON.keyboard}<span>Ввести код</span></button>
      </div>
      <input type="file" accept="image/*" hidden>`;
    document.body.appendChild(el);
    scanner.el = el;
    scanner.video = $('video', el);
    scanner.canvas = document.createElement('canvas');
    scanner.cctx = scanner.canvas.getContext('2d', { willReadFrequently: true });
    syncBack();

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') stopScanner();
      if (act === 'torch') toggleTorch(b);
      if (act === 'photo') $('input[type=file]', el).click();
      if (act === 'manual') { const c = scanner.ctx; stopScanner(); openManual(c); }
    });
    $('input[type=file]', el).addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) scanPhoto(f);
    });
    startCamera();
  }

  const setStatus = (msg) => { if (scanner.el) $('.scan-status', scanner.el).textContent = msg; };

  async function startCamera() {
    const detP = getDetector();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no media'), { name: 'NoMedia' });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!scanner.active) { stream.getTracks().forEach((t) => t.stop()); return; }
      scanner.stream = stream;
      scanner.video.srcObject = stream;
      await scanner.video.play().catch(() => {});
      const track = stream.getVideoTracks()[0];
      const caps = track && track.getCapabilities ? track.getCapabilities() : {};
      if (caps.torch) $('[data-act=torch]', scanner.el).hidden = false;
      if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    } catch (e) {
      return cameraError(e);
    }
    try {
      scanner.detector = await detP;
    } catch (e) {
      return setStatus('Не загрузилось распознавание штрихкодов. Проверь интернет или введи цифры вручную.');
    }
    if (!scanner.active) return;
    setStatus('Наведи камеру на штрихкод');
    tick();
  }

  function cameraError(e) {
    const name = e && e.name;
    let msg = 'Камера недоступна. Сфоткай штрихкод или введи цифры под ним.';
    if (name === 'NotAllowedError' || name === 'SecurityError') msg = 'Нет доступа к камере. Разреши Telegram доступ к камере в настройках телефона — или сфоткай штрихкод, или введи цифры.';
    else if (name === 'NotFoundError' || name === 'OverconstrainedError') msg = 'Камера не найдена. Введи цифры под штрихкодом вручную.';
    else if (name === 'NotReadableError') msg = 'Камера занята другим приложением. Закрой его и попробуй снова.';
    setStatus(msg);
    if (scanner.el) scanner.el.classList.add('no-cam');
  }

  async function tick() {
    if (!scanner.active) return;
    const v = scanner.video;
    if (!scanner.busy && v.readyState >= 2 && v.videoWidth) {
      scanner.busy = true;
      try {
        const vw = v.videoWidth, vh = v.videoHeight;
        const cw = Math.round(vw * 0.9), ch = Math.round(vh * 0.62);
        const scale = Math.min(1, 1100 / cw);
        const cv = scanner.canvas;
        cv.width = Math.round(cw * scale); cv.height = Math.round(ch * scale);
        scanner.cctx.drawImage(v, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, cv.width, cv.height);
        const res = await scanner.detector.detect(cv);
        if (res && res.length && handleDetected(res)) return;
      } catch (e) { /* keep scanning */ }
      scanner.busy = false;
    }
    scanner.timer = setTimeout(tick, 110);
  }

  // returns true if scanning should stop
  function handleDetected(results) {
    for (const r of results) {
      const c = normalizeCode(r.rawValue);
      if (c.type === 'gtin' || c.type === 'weight') {
        haptic.ok();
        if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
        const ctx = scanner.ctx;
        stopScanner();
        if (c.type === 'weight') {
          toast('Это внутренний код магазина для весового товара. Найди продукт по названию.');
          openAdd(ctx.meal);
        } else {
          lookupCode(c.value, ctx);
        }
        return true;
      }
    }
    const now = Date.now();
    if (now - scanner.lastMsg > 2500) {
      scanner.lastMsg = now;
      const t = normalizeCode(results[0].rawValue).type;
      if (t === 'url' || t === 'text') setStatus('В этом QR нет кода товара. Наведи на штрихкод — полоски с цифрами.');
    }
    return false;
  }

  async function scanPhoto(file) {
    setStatus('Ищу штрихкод на фото…');
    try {
      const det = scanner.detector || (await getDetector());
      let src;
      try { src = await createImageBitmap(file); } catch (e) {
        src = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });
      }
      const res = await det.detect(src);
      if (res && res.length && handleDetected(res)) return;
      setStatus('На фото не нашёл штрихкод. Сними ближе, ровно и без бликов.');
      haptic.err();
    } catch (e) {
      setStatus('Не получилось прочитать фото. Попробуй ещё раз или введи цифры.');
    }
  }

  async function toggleTorch(btn) {
    const track = scanner.stream && scanner.stream.getVideoTracks()[0];
    if (!track) return;
    scanner.torch = !scanner.torch;
    try { await track.applyConstraints({ advanced: [{ torch: scanner.torch }] }); btn.classList.toggle('on', scanner.torch); } catch (e) { scanner.torch = !scanner.torch; }
  }

  function stopScanner() {
    if (!scanner.active) return;
    scanner.active = false;
    clearTimeout(scanner.timer);
    if (scanner.stream) scanner.stream.getTracks().forEach((t) => t.stop());
    scanner.stream = null;
    if (scanner.el) scanner.el.remove();
    scanner.el = null;
    syncBack();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScanner(); });

  function openManual(ctx) {
    const sh = openSheet({
      title: 'Цифры штрихкода',
      body: `<form class="stack" id="mf">
          <p class="muted">Это 8 или 13 цифр под полосками штрихкода.</p>
          <div class="inp"><input name="code" inputmode="numeric" placeholder="4600000000000" autocomplete="off" maxlength="14"></div>
          <button type="submit" class="btn primary">Найти продукт</button>
        </form>`,
    });
    const input = $('input', sh.body);
    setTimeout(() => input.focus(), 300);
    $('#mf', sh.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const c = normalizeCode(input.value.replace(/\s/g, ''));
      if (c.type === 'gtin') { sh.close(); return lookupCode(c.value, ctx); }
      haptic.err();
      if (c.type === 'weight') return toast('Это код весового товара магазина — найди продукт по названию');
      toast('В коде ошибка — проверь цифры');
    });
  }

  /* ================= profile ================= */
  const segCtl = (name, val, opts) => `<div class="seg" role="radiogroup">
      <input type="hidden" name="${name}" value="${esc(val)}">
      ${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === val}" data-seg="${name}" data-v="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}
    </div>`;
  const field = (name, label, val, mode, unit, cls) => `<label class="fld${cls ? ' ' + cls : ''}"><span>${label}</span><div class="inp"><input name="${name}" inputmode="${mode}" value="${val == null ? '' : esc(fmt1(val))}" autocomplete="off">${unit ? `<em>${unit}</em>` : ''}</div></label>`;

  function readProfile(form) {
    const fd = new FormData(form);
    return {
      mode: fd.get('mode') || 'manual',
      sex: fd.get('sex') || 'm', age: num(fd.get('age')), height: num(fd.get('height')), weight: num(fd.get('weight')),
      act: num(fd.get('act')) || 1.375, goal: fd.get('goal') || 'keep',
      kcal: num(fd.get('kcal')), mp: num(fd.get('mp')), mf: num(fd.get('mf')), mc: num(fd.get('mc')),
    };
  }
  const macroKcal = (o) => (o.mp != null && o.mf != null && o.mc != null ? o.mp * 4 + o.mf * 9 + o.mc * 4 : null);

  function renderProfile() {
    const p = Object.assign({ sex: 'f', age: null, height: null, weight: null, act: 1.375, goal: 'keep', kcal: null, mp: null, mf: null, mc: null }, S.profile || {});
    const mode = profileMode(S.profile);
    view.innerHTML = `
      <header class="page-head">
        <h1>Норма на день</h1>
        <p>Впиши свои калории и БЖУ или посчитай норму по росту, весу и активности.</p>
      </header>
      <form id="pf" novalidate>
        ${segCtl('mode', mode, [['manual', 'Свои цифры'], ['auto', 'Рассчитать']])}
        <section class="card stack" data-pane="manual"${mode === 'manual' ? '' : ' hidden'}>
          <label class="fld big"><span>Калории</span><div class="inp"><input name="kcal" inputmode="numeric" value="${p.kcal == null ? '' : esc(r0(p.kcal))}" placeholder="Например, 1800" autocomplete="off"><em>ккал</em></div></label>
          <div class="row3">
            ${field('mp', 'Белки', p.mp, 'decimal', 'г', 'p')}
            ${field('mf', 'Жиры', p.mf, 'decimal', 'г', 'f')}
            ${field('mc', 'Углеводы', p.mc, 'decimal', 'г', 'c')}
          </div>
          <p class="muted small" id="manualHint"></p>
          <p class="note warn" id="lowNote" hidden>Меньше 1 200 ккал в день — слишком мало для большинства взрослых. Такую норму лучше обсудить с врачом.</p>
        </section>
        <section class="card stack" data-pane="auto"${mode === 'auto' ? '' : ' hidden'}>
          ${segCtl('sex', p.sex, [['f', 'Женщина'], ['m', 'Мужчина']])}
          <div class="row3">
            ${field('age', 'Возраст', p.age, 'numeric', 'лет')}
            ${field('height', 'Рост', p.height, 'numeric', 'см')}
            ${field('weight', 'Вес', p.weight, 'decimal', 'кг')}
          </div>
          <label class="fld"><span>Активность</span><div class="inp select"><select name="act">${ACT.map((a) => `<option value="${a[0]}"${+p.act === a[0] ? ' selected' : ''}>${a[1]} — ${a[2]}</option>`).join('')}</select></div></label>
          ${segCtl('goal', p.goal, Object.keys(GOALS).map((k) => [k, GOALS[k][0]]))}
          <div class="result" id="goalResult"></div>
        </section>
        <button type="submit" class="btn primary">Сохранить норму</button>
      </form>
      ${homeScreen.status && homeScreen.status !== 'unsupported' ? `<section class="card" id="homeCard">
        <h2>Главный экран телефона</h2>
        <p class="muted">${homeScreen.status === 'added' ? 'Иконка Калорийки уже на главном экране.' : 'Добавь иконку — приложение будет открываться в одно касание, без поиска бота в чатах.'}</p>
        ${homeScreen.status !== 'added' ? `<button class="btn primary" data-act="home-add">Добавить на главный экран</button>` : ''}
      </section>` : ''}
      <section class="card my-products">
        <h2>Мои продукты</h2>
        <div id="myList"><p class="muted">Загружаю…</p></div>
      </section>
      <p class="foot">Состав продуктов по штрихкоду — из открытой базы <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>. Расчёт по формуле Миффлина — Сан-Жеора — ориентир, а не медицинская рекомендация.</p>`;

    const form = $('#pf');
    const result = $('#goalResult');
    const hint = $('#manualHint');

    function updManual() {
      const o = readProfile(form);
      const mk = macroKcal(o);
      const kcal = o.kcal != null ? o.kcal : mk;
      $('#lowNote').hidden = !(kcal && kcal < 1200);
      if (o.kcal == null && mk == null) { hint.textContent = 'Впиши калории. БЖУ можно не заполнять — тогда разделю 30/30/40.'; return; }
      if (o.kcal == null) { hint.textContent = `Калории посчитаю по БЖУ: ${fmt(mk)} ккал.`; return; }
      if (mk != null) {
        const diff = mk - o.kcal;
        hint.textContent = Math.abs(diff) > Math.max(50, o.kcal * 0.05)
          ? `По белкам, жирам и углеводам выходит ${fmt(mk)} ккал, а не ${fmt(o.kcal)}. Проверь цифры или оставь как есть.`
          : `Сходится: по БЖУ выходит ${fmt(mk)} ккал.`;
        return;
      }
      const g = manualGoals(o);
      const miss = [o.mp == null && `белки ${fmt(g.p)} г`, o.mf == null && `жиры ${fmt(g.f)} г`, o.mc == null && `углеводы ${fmt(g.c)} г`].filter(Boolean);
      hint.textContent = `Пустые поля заполню из расчёта 30/30/40: ${miss.join(', ')}.`;
    }
    function updAuto() {
      const o = readProfile(form);
      if (!bodyValid(o)) { result.innerHTML = `<p class="muted">Заполни возраст, рост и вес — сразу покажу норму.</p>`; return; }
      const g = autoGoals(o);
      result.innerHTML = `<p class="r-title">Получается</p>
        <p class="r-k">${fmt(g.kcal)}<span>ккал в день</span></p>
        <div class="r-mac"><span class="p"><b>${fmt(g.p)} г</b>белки</span><span class="f"><b>${fmt(g.f)} г</b>жиры</span><span class="c"><b>${fmt(g.c)} г</b>углеводы</span></div>
        <p class="muted small">В покое организм тратит около ${fmt(g.bmr)} ккал, с учётом активности — около ${fmt(g.tdee)}.</p>`;
    }
    const upd = () => { updManual(); updAuto(); };

    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg]');
      if (!b) return;
      const name = b.dataset.seg;
      $(`input[name=${name}]`, form).value = b.dataset.v;
      $$(`[data-seg=${name}]`, form).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      if (name === 'mode') {
        $$('[data-pane]', form).forEach((x) => { x.hidden = x.dataset.pane !== b.dataset.v; });
        const o = readProfile(form);
        if (b.dataset.v === 'manual' && o.kcal == null && o.mp == null && bodyValid(o)) {
          const g = autoGoals(o);
          form.kcal.value = g.kcal; form.mp.value = g.p; form.mf.value = g.f; form.mc.value = g.c;
        }
      }
      haptic.tap();
      upd();
    });
    form.addEventListener('input', upd);
    form.addEventListener('change', upd);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const o = readProfile(form);
      if (o.mode === 'manual') {
        if (o.kcal == null) o.kcal = macroKcal(o);
        if (!o.kcal || o.kcal < 800 || o.kcal > 6000) { haptic.err(); return toast('Калории — от 800 до 6000 в день'); }
        if ([o.mp, o.mf, o.mc].some((x) => x != null && (x < 0 || x > 1000))) { haptic.err(); return toast('Проверь белки, жиры и углеводы'); }
        o.kcal = r0(o.kcal);
      } else if (!bodyValid(o)) {
        haptic.err(); return toast('Проверь возраст (14–100), рост (120–230 см) и вес (30–300 кг)');
      }
      S.profile = o;
      S.goals = calcGoals(o);
      await Store.setJSON('profile', o);
      haptic.ok();
      toast('Норма сохранена');
      S.tab = 'diary';
      render();
      window.scrollTo(0, 0);
    });
    upd();
    renderMyList();
  }

  async function renderMyList() {
    await ensureMy();
    const box = $('#myList');
    if (!box) return;
    const list = Array.from(S.my.values()).sort((a, b) => a.n.localeCompare(b.n, 'ru'));
    if (!list.length) { box.innerHTML = `<p class="muted">Здесь появятся продукты, которые ты добавишь с упаковки. Они находятся по скану и в поиске.</p>`; return; }
    box.innerHTML = list.map((p) => `<div class="my-row">
        <span class="res-name">${esc(p.n)}<small>${fmt(p.k)} ккал, Б ${fmt1(p.p)}, Ж ${fmt1(p.f)}, У ${fmt1(p.c)}${/^\d+$/.test(p.id) ? ', код ' + p.id : ''}</small></span>
        <button class="icon-btn" data-del="${esc(p.id)}" aria-label="Удалить «${esc(p.n)}»">${ICON.trash}</button>
      </div>`).join('');
    box.onclick = async (e) => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const p = S.my.get(b.dataset.del);
      if (!p || !(await confirmBox(`Удалить «${p.n}» из твоих продуктов? Записи в дневнике останутся.`))) return;
      await deleteMy(p.id);
      S.recent = S.recent.filter((x) => x.id !== p.id);
      Store.setJSON('recent', S.recent);
      renderMyList();
    };
  }

  /* ================= tabbar ================= */
  $('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    haptic.tap();
    if (b.dataset.tab === 'scan') return openScanner({ meal: defaultMeal() });
    closeAll();
    S.tab = b.dataset.tab;
    render();
    window.scrollTo(0, 0);
  });

  /* ================= init ================= */
  async function init() {
    if (inTG) {
      try { tg.ready(); tg.expand(); } catch (e) {}
      if (ver('7.7')) { try { tg.disableVerticalSwipes(); } catch (e) {} }
      if (ver('6.1')) {
        try { tg.setHeaderColor('secondary_bg_color'); tg.setBackgroundColor('secondary_bg_color'); } catch (e) {}
        tg.BackButton.onClick(goBack);
      }
      document.documentElement.classList.add('in-tg');
    }
    const key = dayKey(S.date);
    const v = await Store.getMany(['profile', 'recent', 'meals', key]);
    const meals = parseJSON(v.meals, null);
    if (Array.isArray(meals) && meals.length && meals.every((m) => typeof m.id === 'number' && m.n)) S.meals = meals;
    S.profile = parseJSON(v.profile, null);
    S.goals = calcGoals(S.profile);
    S.recent = parseJSON(v.recent, []) || [];
    S.entries = parseJSON(v[key], []) || [];
    render();
    ensureMy();
    checkHome(() => { if (homeScreen.status !== 'unsupported' && S.tab === 'diary' && !sheets.length) render(); });
  }

  window.__kbju = { normalizeCode, calcGoals, autoGoals, S };
  init();
})();
