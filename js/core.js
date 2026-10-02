/* Tolerance Handbook — core: namespace, i18n, DOM helpers, router, shell.
   Classic script (no ES modules) so the app runs straight from file://. */
(function (g) {
  'use strict';
  var TH = g.TH = g.TH || {};
  TH.engine = TH.engine || {};
  TH.modules = [];
  TH.lang = 'en';

  /* ---------- storage (best effort: file:// and private windows may refuse) ---------- */
  TH.store = {
    get: function (k, def) {
      try { var v = g.localStorage.getItem('th.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) { try { g.localStorage.setItem('th.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- i18n ----------
     TH.t({en:'..', fr:'..'})  or  TH.t('english', 'français') */
  TH.t = function (en, fr) {
    if (en && typeof en === 'object') return en[TH.lang] != null ? en[TH.lang] : en.en;
    return TH.lang === 'fr' && fr != null ? fr : en;
  };

  /* ---------- numbers ---------- */
  // Locale-aware number: French uses a decimal comma. Trailing zeros trimmed unless fixed.
  TH.num = function (x, dec, fixed) {
    if (x == null || x === '' || (typeof x === 'number' && !isFinite(x))) return '—';
    if (typeof x !== 'number') return String(x);
    dec = dec == null ? 3 : dec;
    var s = x.toFixed(dec);
    if (!fixed && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return TH.lang === 'fr' ? s.replace('.', ',') : s;
  };
  // Signed deviation in mm from micrometres: +25 -> "+0.025", 0 -> "0".
  TH.devmm = function (um) {
    if (um == null || !isFinite(um)) return '—';
    if (um === 0) return '0';
    var s = (um / 1000).toFixed(3);
    s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (um > 0) s = '+' + s;
    s = s.replace('-', '−');
    return TH.lang === 'fr' ? s.replace('.', ',') : s;
  };
  // Signed micrometres: +25 -> "+25", -9 -> "−9".
  TH.devum = function (um) {
    if (um == null || !isFinite(um)) return '—';
    if (um === 0) return '0';
    var s = TH.num(Math.abs(um), 1);
    return (um > 0 ? '+' : '−') + s;
  };
  // Parse user input that may use a decimal comma.
  TH.parse = function (s) {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    s = String(s).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
  };

  /* ---------- size ranges ----------
     Standards tabulate "over a up to and including b". bounds = [b0, b1, ...] upper limits.
     Returns index i where (bounds[i-1] < x <= bounds[i]); -1 if out of range.
     lower: smallest accepted value (the first range includes it). */
  TH.rangeIndex = function (bounds, x, lower) {
    if (!isFinite(x)) return -1;
    if (x < (lower == null ? 0 : lower)) return -1;
    for (var i = 0; i < bounds.length; i++) if (x <= bounds[i]) return i;
    return -1;
  };
  // Label for a range i of bounds with lower start: "over 3 to 6"
  TH.rangeLabel = function (bounds, i, lower) {
    var a = i === 0 ? (lower == null ? 0 : lower) : bounds[i - 1];
    var b = bounds[i];
    if (i === 0 && !a) return '≤ ' + TH.num(b);
    return TH.num(a) + ' – ' + TH.num(b);
  };

  /* ---------- DOM ---------- */
  // TH.h('div', {class:'x', on:{click:fn}, attrs:{...}, text:'..'}, child, [children]...)
  TH.h = function (tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    for (var k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // only for trusted, static markup
      else if (k === 'on') for (var ev in v) el.addEventListener(ev, v[ev]);
      else if (k === 'style' && typeof v === 'object') for (var s in v) el.style[s] = v[s];
      else if (k === 'dataset') for (var d in v) el.dataset[d] = v[d];
      else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  TH.append = append;
  TH.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  var uid = 0;
  TH.uid = function (p) { return (p || 'f') + (++uid); };

  /* Page header: title, standard badges, lede. */
  TH.pageHead = function (o) {
    return TH.h('header', { class: 'page-head' },
      TH.h('h1', { text: TH.t(o.title) }),
      o.std ? TH.h('div', { class: 'std-row' }, o.std.map(function (s) { return TH.h('span', { class: 'badge', text: s }); })) : null,
      o.lede ? TH.h('p', { class: 'lede', text: TH.t(o.lede) }) : null);
  };

  /* Card with optional heading. */
  TH.card = function (title, body, opts) {
    opts = opts || {};
    return TH.h('section', { class: 'card' + (opts.class ? ' ' + opts.class : '') },
      title ? TH.h('h2', { text: TH.t(title) }) : null,
      body);
  };

  /* Form field.
     o = { label, value, type:'number'|'text'|'select', options:[{value,label}]|[v..],
           onInput(value, el), unit, help, step, min, max, id, width:'sm'|'md' } */
  TH.field = function (o) {
    var id = o.id || TH.uid('in');
    var ctl;
    if (o.type === 'select') {
      ctl = TH.h('select', { id: id });
      (o.options || []).forEach(function (op) {
        if (op && op.group) {
          var og = TH.h('optgroup', { label: TH.t(op.group) });
          op.options.forEach(function (x) { og.appendChild(opt(x)); });
          ctl.appendChild(og);
        } else ctl.appendChild(opt(op));
      });
      if (o.value != null) ctl.value = String(o.value);
      ctl.addEventListener('change', function () { o.onInput && o.onInput(ctl.value, ctl); });
    } else {
      ctl = TH.h('input', {
        id: id, type: 'text', inputmode: o.type === 'number' ? 'decimal' : null,
        autocomplete: 'off', spellcheck: 'false'
      });
      if (o.value != null) ctl.value = o.type === 'number' ? String(o.value).replace('.', TH.lang === 'fr' ? ',' : '.') : o.value;
      ctl.addEventListener('input', function () {
        var v = o.type === 'number' ? TH.parse(ctl.value) : ctl.value;
        if (o.type === 'number') {
          var bad = ctl.value.trim() !== '' && !isFinite(v);
          ctl.setAttribute('aria-invalid', bad ? 'true' : 'false');
        }
        o.onInput && o.onInput(v, ctl);
      });
    }
    var helpId = o.help ? id + '-help' : null;
    if (helpId) ctl.setAttribute('aria-describedby', helpId);
    return TH.h('div', { class: 'field' + (o.width ? ' w-' + o.width : '') },
      TH.h('label', { for: id, text: TH.t(o.label) }),
      o.unit ? TH.h('div', { class: 'with-unit' }, ctl, TH.h('span', { class: 'unit', text: TH.t(o.unit) })) : ctl,
      o.help ? TH.h('div', { class: 'help', id: helpId, text: TH.t(o.help) }) : null);
    function opt(x) {
      if (typeof x !== 'object') x = { value: x, label: String(x) };
      return TH.h('option', { value: String(x.value), text: TH.t(x.label) });
    }
  };

  /* Segmented control. o = { label, options:[{value,label}], value, onInput } */
  TH.seg = function (o) {
    var wrap = TH.h('div', { class: 'seg', role: 'group', 'aria-label': TH.t(o.label) });
    o.options.forEach(function (op) {
      var b = TH.h('button', { type: 'button', text: TH.t(op.label), 'aria-pressed': String(String(op.value) === String(o.value)) });
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(wrap.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        o.onInput && o.onInput(op.value);
      });
      wrap.appendChild(b);
    });
    if (!o.label) return wrap;
    return TH.h('div', { class: 'field' }, TH.h('span', { class: 'label', text: TH.t(o.label) }), wrap);
  };

  TH.row = function () { var r = TH.h('div', { class: 'form-row' }); TH.append(r, Array.prototype.slice.call(arguments)); return r; };

  /* Key/value result tiles. items = [[label, value, sub?, kind?]] */
  TH.kv = function (items) {
    return TH.h('dl', { class: 'kv' }, items.filter(Boolean).map(function (it) {
      return TH.h('div', { class: 'kv-item' + (it[3] ? ' ' + it[3] : '') },
        TH.h('dt', { text: TH.t(it[0]) }),
        TH.h('dd', null, TH.h('span', { class: 'v', text: it[1] }), it[2] ? TH.h('span', { class: 's', text: TH.t(it[2]) }) : null));
    }));
  };

  /* Note box. kind: 'info' | 'warn' */
  TH.note = function (text, kind) {
    return TH.h('p', { class: 'note ' + (kind || 'info') }, TH.t(text));
  };

  /* Data table.
     o = { caption, cols:[{label, num:bool, cls}], rows:[[cell..]], hlRow, hlCol, hlCell:[r,c], compact, rowHead:bool }
     A cell may be a string/number or {text, cls}. Numbers are rendered with TH.num. */
  TH.table = function (o) {
    var t = TH.h('table', { class: 'data' + (o.compact ? ' compact' : '') });
    if (o.caption) t.appendChild(TH.h('caption', { text: TH.t(o.caption) }));
    var thead = TH.h('thead'), tr = TH.h('tr');
    o.cols.forEach(function (c, j) {
      tr.appendChild(TH.h('th', { scope: 'col', class: (c.num ? 'num' : '') + (o.hlCol === j ? ' hl' : '') + (c.cls ? ' ' + c.cls : ''), text: TH.t(c.label) }));
    });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = TH.h('tbody');
    o.rows.forEach(function (r, i) {
      var row = TH.h('tr', { class: o.hlRow === i ? 'hl' : null });
      r.forEach(function (cell, j) {
        var c = o.cols[j] || {};
        var isHead = o.rowHead && j === 0;
        var text = cell, cls = '';
        // A cell is a value, a bilingual {en, fr} object, or {text, cls} where text may itself be bilingual.
        if (cell && typeof cell === 'object' && ('text' in cell || 'cls' in cell)) { text = cell.text; cls = cell.cls || ''; }
        if (typeof text === 'number') text = TH.num(text, c.dec == null ? 3 : c.dec);
        if (text == null) text = '—';
        var hl = (o.hlCol === j && o.hlRow === i) || (o.hlCell && o.hlCell[0] === i && o.hlCell[1] === j);
        row.appendChild(TH.h(isHead ? 'th' : 'td', {
          scope: isHead ? 'row' : null,
          class: [(c.num ? 'num' : ''), cls, hl ? 'hit' : '', (o.hlCol === j ? 'hlc' : '')].join(' ').trim() || null,
          text: TH.t(text)
        }));
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    return TH.h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': TH.t(o.caption || '') || null }, t);
  };

  /* Scroll highlighted row into view inside its table wrapper (no page jump). */
  TH.revealHit = function (root) {
    var hit = root.querySelector('tr.hl, td.hit');
    if (!hit) return;
    var wrap = hit.closest('.table-wrap');
    if (!wrap) return;
    var top = hit.offsetTop - wrap.clientHeight / 2;
    if (wrap.scrollHeight > wrap.clientHeight) wrap.scrollTop = Math.max(0, top);
  };

  /* ---------- module registry & router ---------- */
  TH.groups = [
    { id: 'start', title: { en: 'Start', fr: 'Accueil' } },
    { id: 'tolerances', title: { en: 'Tolerances', fr: 'Tolérances' } },
    { id: 'threads', title: { en: 'Threads', fr: 'Filetages' } },
    { id: 'elements', title: { en: 'Machine elements', fr: 'Éléments de machines' } },
    { id: 'appendix', title: { en: 'Appendix', fr: 'Annexes' } }
  ];

  /* m = { id, group, order, title:{en,fr}, short?:{en,fr}, keywords:'..', render(root) } */
  TH.register = function (m) { TH.modules.push(m); };
  TH.module = function (id) { for (var i = 0; i < TH.modules.length; i++) if (TH.modules[i].id === id) return TH.modules[i]; return null; };

  var current = null;
  function route() {
    var id = (g.location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'home';
    var m = TH.module(id) || TH.module('home') || TH.modules[0];
    current = m;
    TH.store.set('route', m.id);
    renderNav();
    var main = document.getElementById('main');
    TH.clear(main);
    var page = TH.h('div', { class: 'page', 'data-module': m.id });
    main.appendChild(page);
    try { m.render(page); }
    catch (e) {
      page.appendChild(TH.note({ en: 'This page failed to render: ' + e.message, fr: 'Erreur d’affichage : ' + e.message }, 'warn'));
      if (g.console) console.error(e);
    }
    document.title = TH.t(m.title) + ' · ' + TH.t('Tolerance Handbook', 'Manuel des tolérances');
    closeNav();
  }
  TH.rerender = function () { if (current) route(); };

  function renderNav() {
    var list = document.getElementById('navList');
    var q = (document.getElementById('navSearch').value || '').trim().toLowerCase();
    TH.clear(list);
    var any = false;
    TH.groups.forEach(function (gr) {
      var items = TH.modules.filter(function (m) { return m.group === gr.id; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
        .filter(function (m) {
          if (!q) return true;
          var hay = [m.title.en, m.title.fr, m.keywords || ''].join(' ').toLowerCase();
          return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
        });
      if (!items.length) return;
      any = true;
      var ul = TH.h('ul');
      items.forEach(function (m) {
        ul.appendChild(TH.h('li', null, TH.h('a', {
          href: '#/' + m.id, text: TH.t(m.short || m.title),
          'aria-current': current && current.id === m.id ? 'page' : null
        })));
      });
      list.appendChild(TH.h('div', { class: 'nav-group' }, TH.h('h3', { text: TH.t(gr.title) }), ul));
    });
    if (!any) list.appendChild(TH.h('p', { class: 'nav-empty', text: TH.t('No section matches.', 'Aucune rubrique ne correspond.') }));
  }

  function applyLang(l) {
    TH.lang = l === 'fr' ? 'fr' : 'en';
    TH.store.set('lang', TH.lang);
    document.documentElement.lang = TH.lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === TH.lang));
    });
    document.getElementById('brandName').textContent = TH.t('Tolerance Handbook', 'Manuel des tolérances');
    document.getElementById('navSearch').placeholder = TH.t('Search sections…', 'Rechercher…');
    document.getElementById('navSearchLabel').textContent = TH.t('Search sections', 'Rechercher une rubrique');
    document.querySelector('.skip').textContent = TH.t('Skip to content', 'Aller au contenu');
    document.getElementById('menuBtn').setAttribute('aria-label', TH.t('Menu', 'Menu'));
    document.getElementById('themeBtn').setAttribute('aria-label', TH.t('Toggle dark mode', 'Basculer le thème sombre'));
    document.getElementById('printBtn').setAttribute('aria-label', TH.t('Print this page', 'Imprimer la page'));
    document.getElementById('sidebar').setAttribute('aria-label', TH.t('Sections', 'Rubriques'));
  }
  TH.setLang = function (l) { applyLang(l); TH.rerender(); };

  function openNav() {
    document.body.classList.add('nav-open');
    document.getElementById('scrim').hidden = false;
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    var s = document.getElementById('scrim'); if (s) s.hidden = true;
    var b = document.getElementById('menuBtn'); if (b) b.setAttribute('aria-expanded', 'false');
  }

  TH.start = function () {
    applyLang(TH.store.get('lang', (navigator.language || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.addEventListener('click', function () { TH.setLang(b.dataset.lang); });
    });
    document.getElementById('themeBtn').addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.dataset.theme ? root.dataset.theme === 'dark' : g.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('th.theme', root.dataset.theme); } catch (e) {}
    });
    document.getElementById('printBtn').addEventListener('click', function () { g.print(); });
    document.getElementById('menuBtn').addEventListener('click', function () {
      document.body.classList.contains('nav-open') ? closeNav() : openNav();
    });
    document.getElementById('scrim').addEventListener('click', closeNav);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
      if (e.key === '/' && document.activeElement && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); document.getElementById('navSearch').focus();
      }
    });
    document.getElementById('navSearch').addEventListener('input', renderNav);
    document.getElementById('navSearch').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var a = document.querySelector('#navList a'); if (a) { g.location.hash = a.getAttribute('href'); } }
    });
    g.addEventListener('hashchange', function () {
      route();
      var main = document.getElementById('main');
      main.focus({ preventScroll: true });
      g.scrollTo(0, 0);
    });
    if (!g.location.hash) {
      var last = TH.store.get('route', 'home');
      if (TH.module(last)) history.replaceState(null, '', '#/' + last);
    }
    route();
  };
})(typeof window !== 'undefined' ? window : globalThis);
