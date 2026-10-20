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
  const fmtL = (ml) => String(Math.round((ml || 0) / 10) / 100).replace('.', ',') + ' л';
  const fmtMl = (ml) => (Math.abs(ml) >= 1000 ? fmtL(ml) : `${r0(ml)} мл`);
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; };
  const parseJSON = (s, fb) => { if (!s) return fb; try { return JSON.parse(s); } catch (e) { return fb; } };
  const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + '…' : s);

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
    minus: sv('<path d="M5 12h14"/>'),
    close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    scan: sv('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 8v8M11 8v8M14 8v8M16.5 8v8" stroke-width="1.6"/>'),
    torch: sv('<path d="M8 3h8l-1 6H9z"/><path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M12 13v3"/>'),
    camera: sv('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    keyboard: sv('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
    trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    repeat: sv('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  };

  /* ================= theme: black & white ================= */
  const THEME = { light: { bg: '#F2F2F2', card: '#FFFFFF' }, dark: { bg: '#000000', card: '#141414' } };
  function applyTheme() {
    let scheme = 'light';
    if (inTG && tg.colorScheme) scheme = tg.colorScheme === 'dark' ? 'dark' : 'light';
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) scheme = 'dark';
    document.documentElement.dataset.theme = scheme;
    if (!inTG) return;
    const t = THEME[scheme];
    try { if (ver('6.9')) tg.setHeaderColor(t.bg); else if (ver('6.1')) tg.setHeaderColor('bg_color'); } catch (e) {}
    try { if (ver('6.1')) tg.setBackgroundColor(t.bg); } catch (e) {}
    try { if (ver('7.10')) tg.setBottomBarColor(t.card); } catch (e) {}
  }

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
      if (value.length > CLOUD_MAX) { toast('Слишком много записей для облака — сохранено только на этом устройстве'); return Promise.resolve(false); }
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
  const shortDate = (s) => parseD(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');

  /* ================= domain ================= */
  const DEFAULT_MEALS = [{ id: 0, n: 'Завтрак' }, { id: 1, n: 'Обед' }, { id: 2, n: 'Ужин' }, { id: 3, n: 'Перекус' }];
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
  const S = {
    date: todayStr(), day: { e: [], w: 0 }, prev: [], profile: null, goals: DEFAULT_GOALS,
    recent: [], my: null, tab: 'diary', meals: DEFAULT_MEALS.slice(), weights: [], period: 7, statDays: null,
  };
  const view = $('#view');

  const mealName = (id) => { const m = S.meals.find((x) => x.id === id); return m ? m.n : 'Другое'; };
  const defaultMeal = () => {
    const h = new Date().getHours();
    const want = h < 11 ? 0 : h < 16 ? 1 : h < 21 ? 2 : 3;
    return S.meals.some((x) => x.id === want) ? want : S.meals[0].id;
  };
  const mealChips = (sel) => `<div class="chips meal-chips">${S.meals.map((x) => `<button type="button" class="chip${x.id === sel ? ' on' : ''}" data-meal="${x.id}">${esc(x.n)}</button>`).join('')}</div>`;
  function selectChip(root, attr, val) {
    $$(`[data-${attr}]`, root).forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(val)));
  }
  const saveMeals = () => Store.setJSON('meals', S.meals);
  const waterGoal = () => (S.profile && S.profile.water) || 2000;
  const glassMl = () => (S.profile && S.profile.glass) || 250;

  const parseDay = (v) => {
    const d = parseJSON(v, null);
    if (Array.isArray(d)) return { e: d, w: 0 };
    if (d && typeof d === 'object') return { e: Array.isArray(d.e) ? d.e : [], w: +d.w || 0 };
    return { e: [], w: 0 };
  };
  async function loadDay() {
    const k = dayKey(S.date), kp = dayKey(addDays(S.date, -1));
    const v = await Store.getMany([k, kp]);
    S.day = parseDay(v[k]);
    S.prev = parseDay(v[kp]).e;
  }
  const saveDay = () => Store.setJSON(dayKey(S.date), { e: S.day.e, w: S.day.w || 0 });
  const saveWeights = () => Store.setJSON('weight', S.weights.slice(-250).map((x) => [x.d, x.kg]));

  async function ensureMy() {
    if (S.my) return S.my;
    const keys = (await Store.keys()).filter((k) => k.startsWith('p_'));
    const map = new Map();
    for (let i = 0; i < keys.length; i += 50) {
      const vals = await Store.getMany(keys.slice(i, i + 50));
      Object.values(vals).forEach((v) => {
        const p = parseJSON(v, null);
        if (p && p.id) map.set(p.id, Object.assign(p, { src: p.src === 'dish' ? 'dish' : 'my' }));
      });
    }
    S.my = map;
    return map;
  }
  async function saveMy(prod) {
    await ensureMy();
    const isDish = prod.src === 'dish';
    const p = compact(prod);
    p.src = isDish ? 'dish' : 'my';
    if (isDish) { p.ing = prod.ing; p.sv = prod.sv || undefined; p.cw = prod.cw || undefined; }
    const json = JSON.stringify(p);
    if (json.length > CLOUD_MAX - 32) { toast('Слишком много ингредиентов — убери несколько'); return null; }
    S.my.set(p.id, p);
    await Store.set('p_' + p.id, json);
    if (S.recent.some((x) => x.id === p.id)) {
      S.recent = S.recent.map((x) => (x.id === p.id ? compact(p) : x));
      Store.setJSON('recent', S.recent);
    }
    return p;
  }
  async function deleteMy(id) {
    await ensureMy();
    S.my.delete(id);
    await Store.del('p_' + id);
    if (S.recent.some((x) => x.id === id)) {
      S.recent = S.recent.filter((x) => x.id !== id);
      Store.setJSON('recent', S.recent);
    }
  }
  async function pushRecent(prod) {
    let list = [compact(prod)].concat(S.recent.filter((x) => x.id !== prod.id)).slice(0, 20);
    let json = JSON.stringify(list);
    while (json.length > CLOUD_MAX - 100 && list.length > 1) { list = list.slice(0, -1); json = JSON.stringify(list); }
    S.recent = list;
    await Store.set('recent', json);
  }
  const fullProd = (p) => (p && S.my && S.my.get(p.id)) || p;
  const isDish = (p) => fullProd(p) && fullProd(p).src === 'dish';

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

  /* ================= UI: toast, confirm, sheets ================= */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
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
    const api = { el: wrap, body: $('.sheet-body', wrap), close: () => closeSheet(api), onClose: null };
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
  function closeAbove(base) { const i = sheets.indexOf(base); sheets.slice(i + 1).reverse().forEach(closeSheet); }
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

  const segCtl = (name, val, opts) => `<div class="seg" role="radiogroup">
      <input type="hidden" name="${name}" value="${esc(val)}">
      ${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === val}" data-seg="${name}" data-v="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}
    </div>`;
  function segPick(root, b) {
    const name = b.dataset.seg;
    const hidden = $(`input[name=${name}]`, root);
    if (hidden) hidden.value = b.dataset.v;
    $$(`[data-seg=${name}]`, root).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    haptic.tap();
    return b.dataset.v;
  }
  const field = (name, label, val, mode, unit, cls) => `<label class="fld${cls ? ' ' + cls : ''}"><span>${label}</span><div class="inp"><input name="${name}" inputmode="${mode}" value="${val == null ? '' : esc(fmt1(val))}" autocomplete="off">${unit ? `<em>${unit}</em>` : ''}</div></label>`;

  /* ================= render ================= */
  function render() {
    $$('.tabbar [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    ({ diary: renderDiary, progress: renderProgress, dishes: renderDishes, profile: renderProfile }[S.tab] || renderDiary)();
  }
  function goTab(tab) { closeAll(); S.tab = tab; render(); window.scrollTo(0, 0); }

  /* ================= diary ================= */
  const macroCol = (key, label, val, goal) => `
    <div class="mac ${key}">
      <span class="mac-name">${label}</span>
      <span class="mac-val"><b>${fmt(val)}</b> / ${fmt(goal)} г</span>
      <span class="mac-bar"><i style="width:${goal ? Math.min(100, (val / goal) * 100).toFixed(1) : 0}%"></i></span>
    </div>`;
  const entrySub = (e) => (e.x
    ? `Б ${fmt1(e.p)}, Ж ${fmt1(e.f)}, У ${fmt1(e.c)}`
    : `${fmt(e.g)} г${e.b ? ', ' + esc(e.b) : ''}`);
  const prevWord = () => (S.date === todayStr() ? 'вчера' : 'в прошлый день');

  function mealBlock(id, title, list, canAdd) {
    const t = totals(list);
    const prevList = canAdd && !list.length ? S.prev.filter((e) => e.m === id) : [];
    return `<div class="meal">
      <div class="meal-head">
        ${canAdd ? `<button class="meal-title" data-meal-edit="${id}" aria-label="Переименовать «${esc(title)}»"><h3>${esc(title)}</h3></button>` : `<h3>${esc(title)}</h3>`}
        <span>${list.length ? fmt(t.k) + ' ккал' : ''}</span>
      </div>
      ${list.map((e) => `<button class="entry" data-entry="${esc(e.i)}">
        <span class="e-name">${esc(e.n)}<small>${entrySub(e)}</small></span>
        <span class="e-k">${fmt((e.k * e.g) / 100)}</span>
      </button>`).join('')}
      ${prevList.length ? `<button class="copy-row" data-copy-meal="${id}">${ICON.repeat}<span>Как ${prevWord()}: ${esc(clip(prevList.map((e) => e.n).join(', '), 42))}<small>${fmt(totals(prevList).k)} ккал</small></span></button>` : ''}
      ${canAdd ? `<button class="add-row" data-add="${id}">${ICON.plus}<span>Добавить</span></button>` : ''}
    </div>`;
  }
  function mealsHTML() {
    const known = new Set(S.meals.map((m) => m.id));
    const orphans = S.day.e.filter((e) => !known.has(e.m));
    return S.meals.map((m) => mealBlock(m.id, m.n, S.day.e.filter((e) => e.m === m.id), true)).join('')
      + (orphans.length ? mealBlock(-1, 'Другое', orphans, false) : '')
      + `<button class="add-meal" data-act="new-meal">${ICON.plus}<span>Добавить приём пищи</span></button>`;
  }
  function repeatDayCard() {
    if (S.day.e.length || !S.prev.length) return '';
    return `<button class="repeat-card" data-act="repeat-day">${ICON.repeat}
      <span><b>Повторить ${S.date === todayStr() ? 'вчерашний' : 'предыдущий'} день</b><small>${S.prev.length} ${plural(S.prev.length, 'запись', 'записи', 'записей')}, ${fmt(totals(S.prev).k)} ккал</small></span>
    </button>`;
  }
  function waterCard() {
    const w = S.day.w || 0, goal = waterGoal(), gl = glassMl();
    const n = Math.round(goal / gl);
    const glasses = w / gl;
    const vis = n >= 3 && n <= 12
      ? `<div class="w-glasses" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i><b style="height:${(Math.max(0, Math.min(1, glasses - i)) * 100).toFixed(0)}%"></b></i>`).join('')}</div>`
      : `<div class="w-bar" aria-hidden="true"><i style="width:${Math.min(100, (w / goal) * 100).toFixed(1)}%"></i></div>`;
    const gCount = r1(glasses);
    const sub = w ? `${fmt1(gCount)} ${Number.isInteger(gCount) ? plural(gCount, 'стакан', 'стакана', 'стаканов') : 'стакана'} по ${gl} мл` : `Стакан — ${gl} мл`;
    return `<section class="card water">
      <div class="w-head">
        <h3>Вода</h3>
        <button class="w-total" data-act="water"><b>${fmtL(w)}</b> из ${fmtL(goal)}</button>
      </div>
      ${vis}
      <p class="muted small w-sub">${sub}</p>
      <div class="w-actions">
        <button class="chip" data-water="${gl}">+ Стакан</button>
        <button class="chip" data-water="500">+ 0,5 л</button>
        <button class="chip" data-act="water">Свой объём</button>
      </div>
    </section>`;
  }

  function renderDiary() {
    const g = S.goals;
    const t = totals(S.day.e);
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
        <button class="day-title" data-act="today" ${isToday ? 'disabled' : ''}>${esc(capFirst(dateLabel(S.date)))}</button>
        <button class="icon-btn" data-act="next" aria-label="Следующий день">${ICON.right}</button>
      </header>

      <section class="summary">
        <p class="sum-label">${over ? 'Больше нормы на' : 'Осталось'}</p>
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
      ${waterCard()}
      ${repeatDayCard()}
      <section class="meals">${mealsHTML()}</section>`;
  }

  function refreshWater() {
    const c = $('.water');
    if (c && S.tab === 'diary') c.outerHTML = waterCard();
  }
  async function addWater(ml) {
    S.day.w = Math.max(0, Math.round((S.day.w || 0) + ml));
    await saveDay();
    haptic.tap();
    refreshWater();
    toast(ml >= 0 ? `Вода: +${fmtMl(ml)}` : `Вода: −${fmtMl(-ml)}`);
  }
  async function copyEntries(src) {
    const add = src.map((e) => Object.assign({}, e, { i: uid() }));
    S.day.e = S.day.e.concat(add);
    await saveDay();
    haptic.ok();
    renderDiary();
    toast(`Скопировано: ${add.length} ${plural(add.length, 'запись', 'записи', 'записей')}`);
  }

  async function switchDay(d) {
    haptic.tap();
    S.date = d;
    await loadDay();
    if (S.tab === 'diary') renderDiary();
  }
  const entryToProd = (e) => ({ id: e.pid || 'e' + e.i, n: e.n, b: e.b, k: e.k, p: e.p, f: e.f, c: e.c, u: e.u, ug: e.ug, q: e.q, s: e.s, src: 'entry' });

  view.addEventListener('click', async (e) => {
    const el = e.target.closest('button');
    if (!el || !view.contains(el)) return;
    const ds = el.dataset;
    if (ds.add != null) { haptic.tap(); return openAdd({ meal: +ds.add }); }
    if (ds.mealEdit != null) { haptic.tap(); return openMealEdit(+ds.mealEdit); }
    if (ds.copyMeal != null) return copyEntries(S.prev.filter((x) => x.m === +ds.copyMeal));
    if (ds.water != null) return addWater(+ds.water);
    if (ds.entry) {
      const entry = S.day.e.find((x) => x.i === ds.entry);
      if (!entry) return;
      if (entry.x) openQuick({ entry, meal: entry.m });
      else openProduct(entryToProd(entry), { entry, meal: entry.m });
      return;
    }
    if (ds.day) { S.tab = 'diary'; await switchDay(ds.day); render(); window.scrollTo(0, 0); return; }
    if (ds.dish) { await ensureMy(); const d = S.my.get(ds.dish); if (d) openDish(d); return; }
    if (ds.prod) { await ensureMy(); const p = S.my.get(ds.prod); if (p) openCustom({ prefill: p, standalone: true }); return; }
    if (ds.delProd) {
      await ensureMy();
      const p = S.my.get(ds.delProd);
      if (!p || !(await confirmBox(`Удалить «${p.n}» из твоих продуктов? Записи в дневнике останутся.`))) return;
      await deleteMy(p.id);
      return renderDishes();
    }
    if (ds.seg === 'period') { S.period = +segPick(view, el); return drawStats(); }
    const act = ds.act;
    if (act === 'prev') return switchDay(addDays(S.date, -1));
    if (act === 'next') return switchDay(addDays(S.date, 1));
    if (act === 'today') return switchDay(todayStr());
    if (act === 'new-meal') return openMealEdit(null);
    if (act === 'repeat-day') return copyEntries(S.prev);
    if (act === 'water') return openWater();
    if (act === 'weight-add') return openWeight();
    if (act === 'new-dish') return openDish(null);
    if (act === 'home-add') return addHome();
    if (act === 'home-hide') { lsSet('hs_hide', '1'); const c = el.closest('.home-card'); if (c) c.remove(); return; }
    if (act === 'profile') return goTab('profile');
  });

  /* ================= meals: add / rename / delete ================= */
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
      if (S.day.e.some((x) => x.m === id)) { haptic.err(); return toast('Сначала удали записи из этого приёма пищи'); }
      if (!(await confirmBox(`Убрать «${meal.n}» из дневника?`))) return;
      S.meals = S.meals.filter((m) => m.id !== id);
      await saveMeals();
      sh.close();
      renderDiary();
    });
  }

  /* ================= water ================= */
  function openWater() {
    const gl = glassMl();
    const UNITS = {
      glass: { label: 'стак.', mul: gl, def: 1, chips: [1, 2, 3] },
      l: { label: 'л', mul: 1000, def: 0.5, chips: [0.3, 0.5, 1, 1.5] },
      ml: { label: 'мл', mul: 1, def: 250, chips: [100, 200, 330, 500] },
    };
    let unit = 'glass';
    const sh = openSheet({
      title: 'Вода',
      body: `
        <p class="w-now">${S.date === todayStr() ? 'Сегодня' : esc(dateLabel(S.date))} выпито <b>${fmtL(S.day.w || 0)}</b> из ${fmtL(waterGoal())}</p>
        ${segCtl('wunit', unit, [['glass', 'Стаканы'], ['l', 'Литры'], ['ml', 'Миллилитры']])}
        <div class="inp big w-inp"><input id="wv" inputmode="decimal" autocomplete="off"><em id="wu"></em></div>
        <div class="chips" id="wchips"></div>
        <p class="muted small" id="wcalc"></p>
        <div class="row2">
          <button type="button" class="btn ghost" data-act="sub">${ICON.minus}<span>Убрать</span></button>
          <button type="button" class="btn primary" data-act="add">${ICON.plus}<span>Добавить</span></button>
        </div>
        <p class="muted small">Стакан — ${gl} мл. Объём стакана и норма воды меняются на вкладке «Норма».</p>`,
    });
    const vi = $('#wv', sh.body);
    const ml = () => (num(vi.value) || 0) * UNITS[unit].mul;
    function setUnit(u) {
      unit = u;
      const U = UNITS[u];
      vi.value = fmt1(U.def);
      $('#wu', sh.body).textContent = U.label;
      $('#wchips', sh.body).innerHTML = U.chips.map((c) => `<button type="button" class="chip" data-wq="${c}">${fmt1(c)} ${U.label}</button>`).join('');
      upd();
    }
    function upd() { $('#wcalc', sh.body).textContent = unit === 'ml' ? '' : `Это ${fmtMl(ml())}`; }
    vi.addEventListener('input', upd);
    vi.addEventListener('focus', () => vi.select());
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.seg) return setUnit(segPick(sh.body, b));
      if (b.dataset.wq) { vi.value = fmt1(+b.dataset.wq); upd(); return haptic.tap(); }
      const act = b.dataset.act;
      if (act !== 'add' && act !== 'sub') return;
      const v = ml();
      if (!v || v <= 0 || v > 5000) { haptic.err(); return toast('Объём — от 1 мл до 5 л'); }
      sh.close();
      await addWater(act === 'add' ? v : -Math.min(v, S.day.w || 0));
    });
    setUnit('glass');
  }

  /* ================= add / search ================= */
  function localSearch(q, noDish) {
    const nq = norm(q);
    if (!nq) return [];
    const words = nq.split(' ');
    const mine = S.my ? Array.from(S.my.values()) : [];
    const pool = [].concat(mine.filter((p) => p.src === 'dish'), S.recent, mine.filter((p) => p.src !== 'dish'), BASE);
    const seen = new Set();
    const out = [];
    pool.forEach((p) => {
      if (seen.has(p.id) || (noDish && isDish(p))) return;
      const hay = norm(p.n + ' ' + (p.b || ''));
      if (!words.every((w) => hay.includes(w))) return;
      seen.add(p.id);
      const score = hay.startsWith(nq) ? 0 : (' ' + hay).includes(' ' + words[0]) ? 1 : 2;
      out.push({ p, score });
    });
    return out.sort((a, b) => a.score - b.score).slice(0, 40).map((x) => x.p);
  }

  const resRow = (p, i) => {
    const sub = isDish(p) ? (p.s ? `Блюдо, порция ${fmt(p.s)} г` : 'Блюдо') : p.b || (p.u && p.ug ? `1 ${p.u} ≈ ${p.ug} г` : '');
    return `<button class="res" data-pick="${i}">
      <span class="res-name">${esc(p.n)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <span class="res-k">${p.k != null ? fmt(p.k) : '—'}<small>ккал / 100 г</small></span>
    </button>`;
  };

  // ctx: { meal } — добавить в дневник; { pick(prod, grams), base } — выбрать ингредиент для блюда
  function openAdd(ctx) {
    ctx = ctx || {};
    const pick = typeof ctx.pick === 'function';
    let m = ctx.meal != null ? ctx.meal : defaultMeal();
    const cx = () => (pick ? ctx : { meal: m });
    let picks = [];
    let offResults = null;
    let offState = 'idle';
    const notToday = S.date !== todayStr();
    const sh = openSheet({
      title: pick ? 'Ингредиент' : notToday ? `Добавить: ${dateLabel(S.date).toLowerCase()}` : 'Добавить',
      body: `
        ${pick ? '' : mealChips(m)}
        <form class="search" role="search">
          <input type="search" id="q" placeholder="Гречка, творог или цифры штрихкода" autocomplete="off" enterkeyhint="search">
          <button type="button" class="icon-btn accent" data-act="scan" aria-label="Сканировать штрихкод">${ICON.scan}</button>
        </form>
        <div class="add-actions${pick ? ' one' : ''}">
          ${pick ? '' : '<button class="btn ghost" data-act="quick">Ккал и БЖУ</button><button class="btn ghost" data-act="dish">Новое блюдо</button>'}
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
      const mine = S.my ? Array.from(S.my.values()) : [];
      if (!q) {
        if (!pick) group('Мои блюда', mine.filter((p) => p.src === 'dish').slice(0, 20));
        group('Недавние', S.recent.filter((p) => !(pick && isDish(p))).slice(0, 12));
        group('Мои продукты', mine.filter((p) => p.src !== 'dish').slice(0, 30));
        if (!picks.length) html += `<p class="empty-text">Начни вводить название или отсканируй штрихкод на упаковке.</p>`;
      } else {
        const digits = q.replace(/\s/g, '');
        if (/^\d{8,14}$/.test(digits)) {
          html += `<button class="btn primary" data-act="code">${ICON.search}<span>Найти по штрихкоду ${esc(digits)}</span></button>`;
        } else {
          group('Найдено', localSearch(q, pick));
          if (offState === 'loading') html += `<div class="loading small"><span class="spinner"></span><p>Ищу в базе магазинов…</p></div>`;
          else if (offState === 'done') {
            if (offResults && offResults.length) group('Из магазинов', offResults);
            else html += `<p class="empty-text">В базе магазинов ничего не нашлось. Добавь продукт сам — займёт полминуты.</p>`;
          } else if (offState === 'error') html += `<p class="empty-text">${esc(offResults)}</p><button class="btn ghost" data-act="off">Повторить поиск</button>`;
          else html += `<button class="btn ghost" data-act="off">${ICON.search}<span>Искать «${esc(clip(q, 24))}» в базе магазинов</span></button>`;
        }
      }
      results.innerHTML = html;
    }
    async function runOff() {
      const q = input.value.trim();
      if (q.length < 2) return;
      offState = 'loading'; draw();
      try { offResults = await offSearch(q); offState = 'done'; } catch (err) {
        offState = 'error';
        offResults = err && err.busy ? 'База магазинов перегружена. Подожди минуту и повтори.' : 'Не получилось связаться с базой. Проверь интернет.';
      }
      if (input.value.trim() === q) draw();
    }
    function codeFromInput(digits) {
      const c = normalizeCode(digits);
      if (c.type === 'bad') { haptic.err(); return toast('В коде ошибка — проверь цифры под штрихкодом'); }
      if (c.type === 'weight') return toast('Это внутренний код магазина для весового товара. Найди продукт по названию.');
      lookupCode(c.value, cx());
    }
    const typed = () => (/^\d+$/.test(input.value.trim()) ? '' : input.value.trim());

    input.addEventListener('input', () => { offState = 'idle'; offResults = null; draw(); });
    $('form', sh.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const digits = input.value.replace(/\s/g, '');
      if (/^\d{8,14}$/.test(digits)) return codeFromInput(digits);
      input.blur();
      runOff();
    });
    sh.body.addEventListener('click', (e) => {
      const el = e.target.closest('button');
      if (!el) return;
      if (el.dataset.meal != null) { m = +el.dataset.meal; selectChip(sh.body, 'meal', m); return haptic.tap(); }
      if (el.dataset.pick != null) { const p = picks[+el.dataset.pick]; if (p) openProduct(fullProd(p), cx()); return; }
      const act = el.dataset.act;
      if (act === 'scan') return openScanner(cx());
      if (act === 'custom') return openCustom({ prefill: { n: typed() } }, cx());
      if (act === 'quick') return openQuick({ meal: m, name: typed() });
      if (act === 'dish') return openDish(null, { meal: m, name: typed() });
      if (act === 'off') return runOff();
      if (act === 'code') return codeFromInput(input.value.replace(/\s/g, ''));
    });

    draw();
    if (!S.my) ensureMy().then(() => { if (!input.value.trim()) draw(); });
    if (!inTG) setTimeout(() => input.focus(), 300);
  }

  /* ================= product card ================= */
  function openProduct(prod, ctx) {
    ctx = ctx || {};
    const pick = typeof ctx.pick === 'function';
    if (prod.k == null) {
      return openCustom({ prefill: prod, reason: 'В базе нет КБЖУ для этого продукта. Перепиши с упаковки — сохраню, и в следующий раз он найдётся по скану сразу.' }, ctx);
    }
    const entry = ctx.entry;
    const dish = isDish(prod);
    let m = ctx.meal != null ? ctx.meal : defaultMeal();
    const grams = entry ? entry.g : prod.ug ? prod.ug : dish && prod.s ? prod.s : prod.q && prod.q <= 120 ? prod.q : prod.s ? prod.s : 100;

    const portions = [];
    if (prod.ug && prod.u) portions.push([prod.ug, `1 ${prod.u}`]);
    if (prod.s) portions.push([prod.s, 'Порция']);
    if (prod.q) portions.push([prod.q, dish ? 'Всё блюдо' : 'Вся упаковка']);
    [50, 100, 150, 200].forEach((g) => { if (!portions.some((p) => p[0] === g)) portions.push([g, null]); });

    const sh = openSheet({
      title: pick ? 'Ингредиент' : entry ? 'Запись в дневнике' : dish ? 'Блюдо' : 'Продукт',
      body: `
        <div class="prod-head">
          ${prod.img ? `<img src="${esc(prod.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
          <div><h3>${esc(prod.n)}</h3>${prod.b ? `<p>${esc(prod.b)}</p>` : prod.src === 'base' ? '<p>Средние значения</p>' : dish ? '<p>Твоё блюдо</p>' : ''}</div>
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

        ${pick ? '' : mealChips(m)}
        <button class="btn primary" data-act="save">${pick ? 'Добавить в блюдо' : entry ? 'Сохранить' : 'Добавить в дневник'}</button>
        ${entry ? `<button class="btn danger" data-act="del">${ICON.trash}<span>Удалить из дневника</span></button>` : ''}
        <button class="link-btn" data-act="fix">${dish ? 'Изменить состав блюда' : 'Неверное КБЖУ? Исправить'}</button>`,
    });
    const gi = $('#grams', sh.body);
    const calc = $('#calc', sh.body);
    function upd() {
      const k = (num(gi.value) || 0) / 100;
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
      if (el.dataset.d) { gi.value = fmt1(Math.max(0, (num(gi.value) || 0) + +el.dataset.d)); upd(); return haptic.tap(); }
      if (el.dataset.g) { gi.value = fmt1(+el.dataset.g); upd(); return haptic.tap(); }
      if (el.dataset.meal != null) { m = +el.dataset.meal; selectChip(sh.body, 'meal', m); return haptic.tap(); }
      const act = el.dataset.act;
      if (act === 'save') {
        const g = num(gi.value);
        if (!g || g <= 0 || g > 5000) { haptic.err(); gi.focus(); return toast('Укажи вес от 1 до 5000 г'); }
        if (pick) { haptic.ok(); ctx.pick(prod, r1(g)); return; }
        if (entry) {
          Object.assign(entry, { g: r1(g), m });
        } else {
          S.day.e.push({
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
        S.day.e = S.day.e.filter((x) => x.i !== entry.i);
        await saveDay();
        haptic.ok();
        closeAll();
        render();
        toast('Удалено');
      }
      if (act === 'fix') {
        if (dish) { sh.close(); return openDish(fullProd(prod)); }
        openCustom({ prefill: prod, entry, reason: 'Перепиши КБЖУ с упаковки. Исправленный продукт сохранится в «Мои продукты».' }, ctx);
      }
    });
  }

  /* ================= quick entry: kcal + macros for a whole meal ================= */
  function openQuick({ meal, entry, name }) {
    let m = entry ? entry.m : meal != null ? meal : defaultMeal();
    const v = (x) => (x == null ? '' : fmt1(x));
    const sh = openSheet({
      title: entry ? 'Запись в дневнике' : 'Ккал и БЖУ',
      body: `
        ${entry ? '' : '<p class="note">Для блюда целиком, когда знаешь его калории и БЖУ: из меню кафе, доставки или с упаковки готовой еды.</p>'}
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
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-meal]');
      if (b) { m = +b.dataset.meal; selectChip(sh.body, 'meal', m); haptic.tap(); }
    });
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
      else S.day.e.push(Object.assign({ i: uid() }, data));
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
      S.day.e = S.day.e.filter((x) => x.i !== entry.i);
      await saveDay();
      haptic.ok();
      closeAll();
      render();
      toast('Удалено');
    });
  }

  /* ================= custom product ================= */
  function openCustom({ prefill, reason, entry, standalone }, ctx) {
    ctx = ctx || {};
    const p = prefill || {};
    const code = /^\d{8,14}$/.test(p.id || '') ? p.id : '';
    const v = (x) => (x == null || x === '' ? '' : fmt1(x));
    const editing = p.src === 'my';
    const sh = openSheet({
      title: editing ? 'Мой продукт' : p.n ? 'Проверь КБЖУ' : 'Свой продукт',
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
        id = editing && p.id ? p.id : 'u' + uid();
      }
      if (editing && p.id && p.id !== id) await deleteMy(p.id);
      const saved = await saveMy({ id, n, b: String(fd.get('b') || '').trim() || undefined, k, p: pr || 0, f: fa || 0, c: ca || 0, q: num(fd.get('q')) || undefined, u: p.u, ug: p.ug, s: p.s, src: 'my' });
      if (!saved) return;
      haptic.ok();
      sh.close();
      if (entry) {
        Object.assign(entry, { pid: saved.id, n: saved.n, b: saved.b, k: saved.k, p: saved.p, f: saved.f, c: saved.c });
        await saveDay();
        closeAll();
        render();
        return toast('КБЖУ исправлено');
      }
      toast('Продукт сохранён');
      if (standalone) { if (S.tab === 'dishes') renderDishes(); return; }
      openProduct(saved, ctx);
    });
  }

  /* ================= dishes ================= */
  function openDish(dish, ctx) {
    ctx = ctx || {};
    const st = { ing: dish && dish.ing ? dish.ing.map((x) => Object.assign({}, x)) : [] };
    const sh = openSheet({
      title: dish ? 'Блюдо' : 'Новое блюдо',
      body: `
        <form class="stack" id="df" novalidate>
          <label class="fld"><span>Название</span><div class="inp"><input name="n" value="${esc(dish ? dish.n : ctx.name || '')}" placeholder="Например, гречка с курицей" maxlength="40" autocomplete="off"></div></label>
          <div>
            <p class="fld-title">Ингредиенты</p>
            <div id="ingList"></div>
            <button type="button" class="btn ghost" data-act="ing-add">${ICON.plus}<span>Добавить ингредиент</span></button>
          </div>
          <div class="dish-sum" id="dsum"></div>
          <div class="row2">
            <label class="fld"><span>Вес готового блюда</span><div class="inp"><input name="cw" inputmode="decimal" value="${dish && dish.cw ? fmt1(dish.cw) : ''}" autocomplete="off"><em>г</em></div></label>
            <label class="fld"><span>Порций</span><div class="inp"><input name="sv" inputmode="numeric" value="${dish && dish.sv ? dish.sv : ''}" placeholder="—" autocomplete="off"></div></label>
          </div>
          <p class="muted small">Крупы и макароны при варке тяжелеют, мясо при жарке становится легче. Взвесь готовое блюдо, и КБЖУ на 100 г посчитаются точно. Если не взвешивать, возьму сумму ингредиентов.</p>
          <div id="dper"></div>
          <button type="submit" class="btn primary">${ctx.meal != null ? 'Сохранить и добавить в дневник' : 'Сохранить блюдо'}</button>
          ${dish ? `<button type="button" class="btn danger" data-act="dish-del">${ICON.trash}<span>Удалить блюдо</span></button>` : ''}
        </form>`,
    });
    const form = $('#df', sh.body);
    function calc() {
      const raw = st.ing.reduce((a, x) => a + (x.g || 0), 0);
      const tot = totals(st.ing);
      const cw = num(form.cw.value) || raw;
      const sv = r0(num(form.sv.value)) || 0;
      return { raw, tot, cw, sv };
    }
    function drawIng() {
      $('#ingList', sh.body).innerHTML = st.ing.length
        ? st.ing.map((x, i) => `<div class="ing">
            <span class="res-name">${esc(x.n)}<small data-ik="${i}">${fmt((x.k * x.g) / 100)} ккал</small></span>
            <div class="inp ing-g"><input data-ig="${i}" inputmode="decimal" value="${fmt1(x.g)}" aria-label="Граммы: ${esc(x.n)}"><em>г</em></div>
            <button type="button" class="icon-btn" data-ing-del="${i}" aria-label="Убрать ${esc(x.n)}">${ICON.close}</button>
          </div>`).join('')
        : '<p class="empty-text">Добавь продукты, из которых состоит блюдо, и сколько грамм каждого.</p>';
      upd();
    }
    function upd() {
      const { raw, tot, cw, sv } = calc();
      form.cw.placeholder = raw ? fmt(raw) : '—';
      $('#dsum', sh.body).innerHTML = st.ing.length ? `
        <div class="ds-row"><span>Всё блюдо</span><b>${fmt(tot.k)} ккал</b></div>
        <div class="ds-row small"><span>Б ${fmt1(tot.p)}, Ж ${fmt1(tot.f)}, У ${fmt1(tot.c)}</span><span>${fmt(raw)} г продуктов</span></div>
        ${sv ? `<div class="ds-row"><span>Порция, ${fmt(cw / sv)} г</span><b>${fmt(tot.k / sv)} ккал</b></div>` : ''}` : '';
      const per = (v) => (cw ? (v / cw) * 100 : 0);
      $('#dper', sh.body).innerHTML = st.ing.length ? `
        <div class="per100">
          <div><b>${fmt(per(tot.k))}</b><span>ккал</span></div>
          <div class="p"><b>${fmt1(per(tot.p))}</b><span>белки</span></div>
          <div class="f"><b>${fmt1(per(tot.f))}</b><span>жиры</span></div>
          <div class="c"><b>${fmt1(per(tot.c))}</b><span>углеводы</span></div>
        </div>
        <p class="per100-note">в 100 г готового блюда</p>` : '';
    }
    form.addEventListener('input', (e) => {
      const i = e.target.dataset.ig;
      if (i != null) {
        st.ing[+i].g = num(e.target.value) || 0;
        const s = $(`[data-ik="${i}"]`, sh.body);
        if (s) s.textContent = `${fmt((st.ing[+i].k * st.ing[+i].g) / 100)} ккал`;
      }
      upd();
    });
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.ingDel != null) { st.ing.splice(+b.dataset.ingDel, 1); haptic.tap(); return drawIng(); }
      if (b.dataset.act === 'ing-add') {
        return openAdd({
          base: sh,
          pick: (prod, g) => {
            st.ing.push({ n: String(prod.n).slice(0, 40), g, k: r1(prod.k), p: r1(prod.p), f: r1(prod.f), c: r1(prod.c) });
            closeAbove(sh);
            drawIng();
            toast(`Добавлено: ${clip(prod.n, 30)}`);
          },
        });
      }
      if (b.dataset.act === 'dish-del') {
        if (!(await confirmBox(`Удалить блюдо «${dish.n}»? Записи в дневнике останутся.`))) return;
        await deleteMy(dish.id);
        sh.close();
        if (S.tab === 'dishes') renderDishes();
        toast('Блюдо удалено');
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = form.n.value.trim();
      const { raw, tot, cw, sv } = calc();
      const err = (msg) => { haptic.err(); toast(msg); };
      if (!n) return err('Напиши название блюда');
      if (!st.ing.length) return err('Добавь хотя бы один ингредиент');
      if (!raw || st.ing.some((x) => !x.g || x.g <= 0)) return err('У каждого ингредиента должен быть вес');
      if (cw <= 0 || cw > 20000) return err('Вес готового блюда — до 20 кг');
      if (sv && (sv < 1 || sv > 50)) return err('Порций — от 1 до 50');
      const per = (v) => (v / cw) * 100;
      const saved = await saveMy({
        id: dish ? dish.id : 'd' + uid(), n, src: 'dish',
        k: per(tot.k), p: per(tot.p), f: per(tot.f), c: per(tot.c),
        q: r0(cw), s: sv ? r0(cw / sv) : undefined, sv: sv || undefined, cw: num(form.cw.value) ? r0(cw) : undefined,
        ing: st.ing.map((x) => ({ n: x.n, g: r1(x.g), k: x.k, p: x.p, f: x.f, c: x.c })),
      });
      if (!saved) return;
      haptic.ok();
      sh.close();
      toast('Блюдо сохранено');
      if (ctx.meal != null) return openProduct(saved, { meal: ctx.meal });
      if (S.tab === 'dishes') renderDishes();
    });
    drawIng();
    if (!dish && !ctx.name) setTimeout(() => { if (!inTG) form.n.focus(); }, 300);
  }

  async function renderDishes() {
    view.innerHTML = `
      <header class="page-head">
        <h1>Блюда</h1>
        <p>Собери блюдо из продуктов один раз — потом добавляй его в дневник одним касанием.</p>
      </header>
      <button class="btn primary" data-act="new-dish">${ICON.plus}<span>Новое блюдо</span></button>
      <section class="card" id="dishList"><h2>Мои блюда</h2><p class="muted">Загружаю…</p></section>
      <section class="card" id="prodList"></section>`;
    await ensureMy();
    if (S.tab !== 'dishes') return;
    const all = Array.from(S.my.values()).sort((a, b) => a.n.localeCompare(b.n, 'ru'));
    const dishes = all.filter((p) => p.src === 'dish');
    const prods = all.filter((p) => p.src !== 'dish');
    $('#dishList').innerHTML = '<h2>Мои блюда</h2>' + (dishes.length
      ? dishes.map((p) => `<button class="list-row" data-dish="${esc(p.id)}">
          <span class="res-name">${esc(p.n)}<small>${fmt(p.k)} ккал на 100 г${p.s ? `, порция ${fmt(p.s)} г — ${fmt((p.k * p.s) / 100)} ккал` : ''}</small></span>${ICON.right}
        </button>`).join('')
      : '<p class="muted">Пока пусто. Например, овсянка на молоке с бананом: впиши вес каждого продукта, и КБЖУ посчитаются сами.</p>');
    $('#prodList').innerHTML = '<h2>Мои продукты</h2>' + (prods.length
      ? prods.map((p) => `<div class="my-row">
          <button class="list-row" data-prod="${esc(p.id)}"><span class="res-name">${esc(p.n)}<small>${fmt(p.k)} ккал, Б ${fmt1(p.p)}, Ж ${fmt1(p.f)}, У ${fmt1(p.c)} на 100 г</small></span></button>
          <button class="icon-btn" data-del-prod="${esc(p.id)}" aria-label="Удалить «${esc(p.n)}»">${ICON.trash}</button>
        </div>`).join('')
      : '<p class="muted">Здесь появятся продукты, которые ты добавишь с упаковки. Они находятся по скану и в поиске.</p>');
  }

  /* ================= progress: weight & stats ================= */
  function weightChart(pts) {
    const W = 320, H = 120, P = 10;
    const t0 = parseD(pts[0].d).getTime(), t1 = parseD(pts[pts.length - 1].d).getTime();
    const ks = pts.map((x) => x.kg);
    let lo = Math.min(...ks), hi = Math.max(...ks);
    if (hi - lo < 1) { const mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; }
    const X = (x) => P + ((parseD(x.d).getTime() - t0) / ((t1 - t0) || 1)) * (W - 2 * P);
    const Y = (k) => P + (1 - (k - lo) / (hi - lo)) * (H - 2 * P);
    const d = pts.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(x.kg).toFixed(1)}`).join(' ');
    return `<div class="w8-chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График веса">
          <path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${pts.map((x, i) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(x.kg).toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3}" fill="currentColor"/>`).join('')}
        </svg>
        <span class="w8-hi">${fmt1(hi)}</span><span class="w8-lo">${fmt1(lo)}</span>
      </div>
      <div class="w8-dates"><span>${shortDate(pts[0].d)}</span><span>${shortDate(pts[pts.length - 1].d)}</span></div>`;
  }
  function weightCardHTML() {
    const W = S.weights;
    if (!W.length) {
      return `<h2>Вес</h2>
        <p class="muted">Записывай вес раз в день или в неделю. Здесь появится график, и станет видно, работает ли норма.</p>
        <button class="btn primary" data-act="weight-add">Записать вес</button>`;
    }
    const last = W[W.length - 1];
    const cutoff = addDays(todayStr(), -30);
    let ref = null;
    W.forEach((x) => { if (x.d <= cutoff) ref = x; });
    const span = ref ? 'за 30 дней' : 'с первой записи';
    ref = ref || W[0];
    const delta = r1(last.kg - ref.kg);
    const deltaTxt = W.length > 1 && ref !== last ? `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${fmt1(Math.abs(delta))} кг ${span}` : '';
    return `<div class="w8-head">
        <div>
          <h2>Вес</h2>
          <p class="w8-big">${fmt1(last.kg)}<span>кг</span></p>
          <p class="muted small">${esc(dateLabel(last.d))}${deltaTxt ? `. ${deltaTxt}` : ''}</p>
        </div>
        <button class="btn primary sm" data-act="weight-add">Записать</button>
      </div>
      ${W.length > 1 ? weightChart(W.slice(-60)) : '<p class="muted small">Добавь ещё одну запись, и появится график.</p>'}`;
  }

  async function renderProgress() {
    view.innerHTML = `
      <header class="page-head"><h1>Прогресс</h1></header>
      <section class="card weight" id="weightCard">${weightCardHTML()}</section>
      <div class="period">${segCtl('period', String(S.period), [['7', '7 дней'], ['30', '30 дней']])}</div>
      <section class="card stats" id="stats"><div class="loading small"><span class="spinner"></span><p>Считаю…</p></div></section>`;
    const today = todayStr();
    const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
    const vals = await Store.getMany(days.map(dayKey));
    if (S.tab !== 'progress') return;
    S.statDays = days.map((d) => {
      const day = d === S.date ? S.day : parseDay(vals[dayKey(d)]);
      const t = totals(day.e);
      return { d, k: t.k, p: t.p, f: t.f, c: t.c, w: day.w || 0, n: day.e.length };
    });
    drawStats();
  }

  function drawStats() {
    const box = $('#stats');
    if (!box || !S.statDays) return;
    const N = S.period;
    const arr = S.statDays.slice(-N);
    const g = S.goals;
    const logged = arr.filter((x) => x.n > 0);
    const avg = (key) => (logged.length ? logged.reduce((a, x) => a + x[key], 0) / logged.length : 0);
    const inNormFn = (x) => x.n > 0 && Math.abs(x.k - g.kcal) <= g.kcal * 0.1;
    const inNorm = logged.filter(inNormFn).length;
    const all = S.statDays;
    let i = all.length - 1;
    if (all[i].n === 0) i--;
    let streak = 0;
    for (; i >= 0 && all[i].n > 0; i--) streak++;
    const waterDays = arr.filter((x) => x.w > 0);
    const avgW = waterDays.length ? waterDays.reduce((a, x) => a + x.w, 0) / waterDays.length : 0;
    const max = Math.max(g.kcal * 1.25, ...arr.map((x) => x.k)) || 1;
    const today = todayStr();
    const statMac = (key, label, val, goal) => `<div class="mac ${key}">
        <span class="mac-name">${label}</span>
        <span class="mac-val"><b>${logged.length ? fmt(val) : '—'}</b> / ${fmt(goal)} г</span>
        <span class="mac-bar"><i style="width:${goal && logged.length ? Math.min(100, (val / goal) * 100).toFixed(1) : 0}%"></i></span>
      </div>`;
    box.innerHTML = `
      <div class="st-top">
        <div><span class="muted small">Среднее в день</span><b class="st-big">${logged.length ? fmt(avg('k')) : '—'}</b><span class="muted small">из ${fmt(g.kcal)} ккал</span></div>
        <div><span class="muted small">В норме, ±10%</span><b class="st-big ok">${inNorm}<small> из ${logged.length}</small></b><span class="muted small">${plural(logged.length, 'дня', 'дней', 'дней')} с записями</span></div>
      </div>
      <div class="bars n${N}">
        <span class="goal-line" style="bottom:${((g.kcal / max) * 100).toFixed(1)}%"></span>
        ${arr.map((x) => `<button class="bar${x.n === 0 ? ' empty' : inNormFn(x) ? ' ok' : x.k > g.kcal ? ' over' : ''}${x.d === today ? ' cur' : ''}" data-day="${x.d}" aria-label="${esc(dateLabel(x.d))}: ${fmt(x.k)} ккал">
          <i style="height:${Math.max(x.n ? 3 : 0, (x.k / max) * 100).toFixed(1)}%"></i>
        </button>`).join('')}
      </div>
      <div class="bars-x n${N}">${arr.map((x, j) => `<span>${N === 7 ? parseD(x.d).toLocaleDateString('ru-RU', { weekday: 'short' }) : (j % 5 === 4 || j === 0 ? parseD(x.d).getDate() : '')}</span>`).join('')}</div>
      <div class="legend"><span class="lg ok">в норме</span><span class="lg over">больше нормы</span><span class="lg under">меньше нормы</span></div>
      <div class="macros st-macros">${statMac('p', 'Белки', avg('p'), g.p)}${statMac('f', 'Жиры', avg('f'), g.f)}${statMac('c', 'Углеводы', avg('c'), g.c)}</div>
      <div class="st-row"><span>Записи подряд</span><b>${streak >= 30 ? '30+' : streak} ${plural(streak, 'день', 'дня', 'дней')}</b></div>
      <div class="st-row water-row"><span>Вода в среднем</span><b>${avgW ? fmtL(avgW) : '—'}</b></div>
      <p class="muted small">Нажми на столбик, чтобы открыть этот день.</p>`;
  }

  function openWeight() {
    const last = S.weights[S.weights.length - 1];
    const sh = openSheet({
      title: 'Вес',
      body: `<form class="stack" id="wf" novalidate>
          <div class="row2">
            <label class="fld"><span>Вес</span><div class="inp big"><input name="kg" inputmode="decimal" value="${last ? fmt1(last.kg) : ''}" placeholder="65,5" autocomplete="off"><em>кг</em></div></label>
            <label class="fld"><span>Дата</span><div class="inp big"><input type="date" name="d" value="${todayStr()}" max="${todayStr()}"></div></label>
          </div>
          <button type="submit" class="btn primary">Сохранить</button>
        </form>
        <div id="wHist"></div>`,
    });
    const form = $('#wf', sh.body);
    function drawHist() {
      $('#wHist', sh.body).innerHTML = S.weights.length
        ? '<h4 class="group">Последние записи</h4>' + S.weights.slice(-8).reverse().map((x) => `<div class="my-row">
            <span class="res-name">${fmt1(x.kg)} кг<small>${esc(dateLabel(x.d))}</small></span>
            <button type="button" class="icon-btn" data-del-w="${x.d}" aria-label="Удалить запись">${ICON.trash}</button>
          </div>`).join('')
        : '';
    }
    drawHist();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const kg = num(form.kg.value);
      const d = form.d.value || todayStr();
      if (!kg || kg < 20 || kg > 400) { haptic.err(); return toast('Вес — от 20 до 400 кг'); }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > todayStr()) { haptic.err(); return toast('Проверь дату'); }
      S.weights = S.weights.filter((x) => x.d !== d).concat([{ d, kg: r1(kg) }]).sort((a, b) => (a.d < b.d ? -1 : 1));
      await saveWeights();
      haptic.ok();
      sh.close();
      toast('Вес записан');
      if (S.tab === 'progress') { const c = $('#weightCard'); if (c) c.innerHTML = weightCardHTML(); }
    });
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-del-w]');
      if (!b) return;
      S.weights = S.weights.filter((x) => x.d !== b.dataset.delW);
      await saveWeights();
      haptic.tap();
      drawHist();
      if (S.tab === 'progress') { const c = $('#weightCard'); if (c) c.innerHTML = weightCardHTML(); }
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
      else openCustom({ prefill: { id: code }, reason: `Продукта ${code} пока нет в базе. Перепиши КБЖУ с упаковки один раз — дальше он будет находиться по скану сразу.` }, ctx);
    } catch (e) {
      if (!sheets.includes(sh)) return;
      sh.body.innerHTML = `<p class="note">Не получилось связаться с базой продуктов. Проверь интернет и попробуй ещё раз.</p>
        <button class="btn primary" data-r>Повторить</button>
        <button class="btn ghost" data-c>Ввести КБЖУ с упаковки</button>`;
      $('[data-r]', sh.body).onclick = () => { sh.close(); lookupCode(code, ctx); };
      $('[data-c]', sh.body).onclick = () => { sh.close(); openCustom({ prefill: { id: code } }, ctx); };
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
    try { scanner.detector = await detP; } catch (e) {
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
          if (!sheets.length) openAdd(ctx);
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

  /* ================= norm (profile) ================= */
  function readProfile(form) {
    const fd = new FormData(form);
    const wl = num(fd.get('water'));
    return {
      mode: fd.get('mode') || 'manual',
      sex: fd.get('sex') || 'f', age: num(fd.get('age')), height: num(fd.get('height')), weight: num(fd.get('weight')),
      act: num(fd.get('act')) || 1.375, goal: fd.get('goal') || 'keep',
      kcal: num(fd.get('kcal')), mp: num(fd.get('mp')), mf: num(fd.get('mf')), mc: num(fd.get('mc')),
      water: wl != null ? Math.round(wl * 1000) : null, glass: num(fd.get('glass')),
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
        <section class="card stack water-set">
          <h2>Вода</h2>
          <div class="row2">
            ${field('water', 'Норма в день', (p.water || 2000) / 1000, 'decimal', 'л')}
            ${field('glass', 'Мой стакан', p.glass || 250, 'numeric', 'мл')}
          </div>
        </section>
        <button type="submit" class="btn primary">Сохранить</button>
      </form>
      ${homeScreen.status && homeScreen.status !== 'unsupported' ? `<section class="card" id="homeCard">
        <h2>Главный экран телефона</h2>
        <p class="muted">${homeScreen.status === 'added' ? 'Иконка Калорийки уже на главном экране.' : 'Добавь иконку — приложение будет открываться в одно касание, без поиска бота в чатах.'}</p>
        ${homeScreen.status !== 'added' ? '<button class="btn primary" data-act="home-add">Добавить на главный экран</button>' : ''}
      </section>` : ''}
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
        hint.textContent = Math.abs(mk - o.kcal) > Math.max(50, o.kcal * 0.05)
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
      if (!bodyValid(o)) { result.innerHTML = '<p class="muted">Заполни возраст, рост и вес — сразу покажу норму.</p>'; return; }
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
      const v = segPick(form, b);
      if (b.dataset.seg === 'mode') {
        $$('[data-pane]', form).forEach((x) => { x.hidden = x.dataset.pane !== v; });
        const o = readProfile(form);
        if (v === 'manual' && o.kcal == null && o.mp == null && bodyValid(o)) {
          const g = autoGoals(o);
          form.kcal.value = g.kcal; form.mp.value = g.p; form.mf.value = g.f; form.mc.value = g.c;
        }
      }
      upd();
    });
    form.addEventListener('input', upd);
    form.addEventListener('change', upd);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const o = readProfile(form);
      const err = (msg) => { haptic.err(); toast(msg); };
      if (o.water == null || o.water < 500 || o.water > 6000) return err('Норма воды — от 0,5 до 6 л');
      if (!o.glass || o.glass < 50 || o.glass > 1000) return err('Стакан — от 50 до 1000 мл');
      if (o.mode === 'manual') {
        if (o.kcal == null) o.kcal = macroKcal(o);
        if (o.kcal != null && (o.kcal < 800 || o.kcal > 6000)) return err('Калории — от 800 до 6000 в день');
        if ([o.mp, o.mf, o.mc].some((x) => x != null && (x < 0 || x > 1000))) return err('Проверь белки, жиры и углеводы');
        if (o.kcal != null) o.kcal = r0(o.kcal);
      } else if (!bodyValid(o)) {
        return err('Проверь возраст (14–100), рост (120–230 см) и вес (30–300 кг)');
      }
      o.glass = r0(o.glass);
      S.profile = o;
      S.goals = calcGoals(o);
      await Store.setJSON('profile', o);
      haptic.ok();
      toast(S.goals.def ? 'Сохранено. Норма калорий пока по умолчанию — впиши свою' : 'Норма сохранена');
      goTab('diary');
    });
    upd();
  }

  /* ================= tabbar ================= */
  $('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    haptic.tap();
    if (b.dataset.tab === 'scan') return openScanner({ meal: defaultMeal() });
    goTab(b.dataset.tab);
  });

  /* ================= init ================= */
  async function init() {
    applyTheme();
    if (inTG) {
      try { tg.ready(); tg.expand(); } catch (e) {}
      if (ver('7.7')) { try { tg.disableVerticalSwipes(); } catch (e) {} }
      if (ver('6.1')) tg.BackButton.onClick(goBack);
      try { tg.onEvent('themeChanged', applyTheme); } catch (e) {}
      document.documentElement.classList.add('in-tg');
    } else if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', applyTheme);
    }
    const k = dayKey(S.date), kp = dayKey(addDays(S.date, -1));
    const v = await Store.getMany(['profile', 'recent', 'meals', 'weight', k, kp]);
    const meals = parseJSON(v.meals, null);
    if (Array.isArray(meals) && meals.length && meals.every((m) => typeof m.id === 'number' && m.n)) S.meals = meals;
    S.profile = parseJSON(v.profile, null);
    S.goals = calcGoals(S.profile);
    S.recent = parseJSON(v.recent, []) || [];
    S.weights = (parseJSON(v.weight, []) || [])
      .filter((x) => Array.isArray(x) && /^\d{4}-\d{2}-\d{2}$/.test(x[0]) && +x[1] > 0)
      .map((x) => ({ d: x[0], kg: +x[1] }))
      .sort((a, b) => (a.d < b.d ? -1 : 1));
    S.day = parseDay(v[k]);
    S.prev = parseDay(v[kp]).e;
    render();
    ensureMy();
    checkHome(() => { if (homeScreen.status !== 'unsupported' && S.tab === 'diary' && !sheets.length) render(); });
  }

  window.__kbju = { normalizeCode, calcGoals, autoGoals, S };
  init();
})();
