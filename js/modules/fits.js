/* ISO 286 pages: fit calculator, hole/shaft limit tables, IT grades, preferred fits. */
(function (TH) {
  'use strict';
  var iso = TH.engine.iso286;
  var h = TH.h;

  var TYPE = {
    clearance: { en: 'Clearance fit', fr: 'Ajustement avec jeu' },
    transition: { en: 'Transition fit', fr: 'Ajustement incertain' },
    interference: { en: 'Interference fit', fr: 'Ajustement avec serrage' }
  };
  var ERR = {
    size: { en: 'Not defined for this size (see the ISO 286 tables).', fr: 'Non défini pour cette dimension (voir les tableaux ISO 286).' },
    range: { en: 'ISO 286 covers nominal sizes up to 3150 mm.', fr: 'L’ISO 286 couvre les dimensions nominales jusqu’à 3150 mm.' },
    grade: { en: 'This grade is not defined for this letter or size.', fr: 'Ce degré n’est pas défini pour cette lettre ou cette dimension.' },
    letter: { en: 'Unknown tolerance position.', fr: 'Position de tolérance inconnue.' }
  };
  var STD = ['ISO 286-1:2010', 'ISO 286-2:2010'];
  var NOTE = {
    en: 'Values computed from the ISO 286-1 tables and rules (shaft fundamental deviations, Δ for K–ZC, JS rounding, M6 special case) and checked against ISO 286-2. Check the current edition for contractual use.',
    fr: 'Valeurs calculées à partir des tableaux et règles de l’ISO 286-1 (écarts fondamentaux des arbres, Δ pour K–ZC, arrondi JS, cas particulier M6) et contrôlées avec l’ISO 286-2. Vérifier l’édition en vigueur pour un usage contractuel.'
  };

  function gradeOptions() { return iso.GRADES.map(function (g) { return { value: String(g), label: 'IT' + g }; }); }
  function letterOptions(hole) { return (hole ? iso.HOLE_LETTERS : iso.SHAFT_LETTERS).map(function (l) { return { value: l, label: l }; }); }
  function cls(letter, grade) { return letter + grade; }

  /* Tolerance-zone diagram (SVG). zones = [{dev, kind:'hole'|'shaft', label}] */
  function zoneDiagram(zones, size) {
    var NS = 'http://www.w3.org/2000/svg';
    var W = 640, H = 280, top = 24, bottom = 256, x0 = 120;
    var vals = [0];
    zones.forEach(function (z) { vals.push(z.dev.upper, z.dev.lower); });
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var pad = (max - min) * 0.12 || 10;
    max += pad; min -= pad;
    var y = function (v) { return top + (max - v) / (max - min) * (bottom - top); };
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'diagram');
    svg.setAttribute('role', 'img');
    var desc = zones.map(function (z) { return z.label + ' ' + TH.devum(z.dev.upper) + ' / ' + TH.devum(z.dev.lower) + ' µm'; }).join('; ');
    svg.setAttribute('aria-label', TH.t('Tolerance zones: ', 'Zones de tolérance : ') + desc);
    function el(tag, attrs, text) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      svg.appendChild(e); return e;
    }
    // Scale ticks
    var step = niceStep((max - min) / 5);
    for (var v = Math.ceil(min / step) * step; v <= max; v += step) {
      el('line', { x1: x0 - 6, x2: W - 16, y1: y(v), y2: y(v), class: 'grid' });
      el('text', { x: x0 - 10, y: y(v) + 4, 'text-anchor': 'end' }, TH.devum(Math.round(v * 10) / 10));
    }
    el('text', { x: 10, y: 16 }, 'µm');
    // Zones
    var n = zones.length, slot = (W - 16 - x0 - 20) / n;
    zones.forEach(function (z, i) {
      var x = x0 + 20 + i * slot + slot * 0.18, w = slot * 0.64;
      var y1 = y(z.dev.upper), y2 = y(z.dev.lower);
      el('rect', { x: x, y: y1, width: w, height: Math.max(2, y2 - y1), class: z.kind, rx: 2 });
      el('text', { x: x + w / 2, y: Math.max(14, y1 - 6), 'text-anchor': 'middle', style: 'font-weight:600;fill:var(--c-fg)' }, z.label);
    });
    // Zero line = nominal size
    el('line', { x1: x0 - 6, x2: W - 16, y1: y(0), y2: y(0), class: 'axis' });
    el('text', { x: W - 18, y: y(0) - 6, 'text-anchor': 'end', style: 'fill:var(--c-fg)' }, '0 = Ø' + TH.num(size));
    return svg;
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  function limitsTable(rows) {
    return TH.table({
      cols: [
        { label: { en: 'Part', fr: 'Pièce' } }, { label: { en: 'Class', fr: 'Classe' } },
        { label: { en: 'Upper dev. (µm)', fr: 'Écart sup. (µm)' }, num: true },
        { label: { en: 'Lower dev. (µm)', fr: 'Écart inf. (µm)' }, num: true },
        { label: { en: 'Upper dev. (mm)', fr: 'Écart sup. (mm)' }, num: true },
        { label: { en: 'Lower dev. (mm)', fr: 'Écart inf. (mm)' }, num: true },
        { label: { en: 'Max size (mm)', fr: 'Cote max (mm)' }, num: true },
        { label: { en: 'Min size (mm)', fr: 'Cote min (mm)' }, num: true },
        { label: 'IT (µm)', num: true }
      ],
      rows: rows.map(function (r) {
        var d = r.dev;
        return [TH.t(r.part), r.cls, TH.devum(d.upper), TH.devum(d.lower), TH.devmm(d.upper), TH.devmm(d.lower),
          TH.num(d.max, 4, true), TH.num(d.min, 4, true), TH.num(d.it, 1)];
      })
    });
  }

  /* ================= Fit calculator ================= */
  TH.register({
    id: 'fits', group: 'tolerances', order: 10,
    title: { en: 'Fits — hole & shaft (ISO 286)', fr: 'Ajustements alésage / arbre (ISO 286)' },
    short: { en: 'Fit calculator', fr: 'Calcul d’ajustement' },
    keywords: 'iso 286 fit fits hole shaft clearance interference transition h7 g6 ajustement alésage arbre jeu serrage incertain tolerance',
    render: function (root) {
      var st = {
        size: TH.store.get('fits.size', 50),
        hl: TH.store.get('fits.hl', 'H'), hg: TH.store.get('fits.hg', '7'),
        sl: TH.store.get('fits.sl', 'g'), sg: TH.store.get('fits.sg', '6')
      };
      root.appendChild(TH.pageHead({
        title: { en: 'Fit calculator', fr: 'Calcul d’ajustement' }, std: STD,
        lede: { en: 'Enter a nominal size and the hole and shaft tolerance classes to get the limits, the fit type and the clearance or interference.', fr: 'Saisir la dimension nominale et les classes de tolérance de l’alésage et de l’arbre pour obtenir les écarts, le type d’ajustement et le jeu ou le serrage.' }
      }));

      var out = h('div', { class: 'stack' });
      var sizeMsg = h('div', { class: 'help', 'aria-live': 'polite' });
      function save() { for (var k in st) TH.store.set('fits.' + k, st[k]); }

      var designation = h('input', { id: 'fitDesig', type: 'text', autocomplete: 'off', spellcheck: 'false', value: st.hl + st.hg + '/' + st.sl + st.sg });
      var holeL, holeG, shaftL, shaftG;
      function syncSelects() { holeL.value = st.hl; holeG.value = st.hg; shaftL.value = st.sl; shaftG.value = st.sg; designation.value = st.hl + st.hg + '/' + st.sl + st.sg; }

      var fSize = TH.field({ label: { en: 'Nominal size', fr: 'Dimension nominale' }, type: 'number', value: st.size, unit: 'mm', width: 'md',
        onInput: function (v) { st.size = v; save(); update(); } });
      var fHL = TH.field({ label: { en: 'Hole', fr: 'Alésage' }, type: 'select', options: letterOptions(true), value: st.hl, width: 'sm',
        onInput: function (v) { st.hl = v; save(); syncSelects(); update(); } });
      var fHG = TH.field({ label: { en: 'Hole grade', fr: 'Degré alésage' }, type: 'select', options: gradeOptions(), value: st.hg, width: 'sm',
        onInput: function (v) { st.hg = v; save(); syncSelects(); update(); } });
      var fSL = TH.field({ label: { en: 'Shaft', fr: 'Arbre' }, type: 'select', options: letterOptions(false), value: st.sl, width: 'sm',
        onInput: function (v) { st.sl = v; save(); syncSelects(); update(); } });
      var fSG = TH.field({ label: { en: 'Shaft grade', fr: 'Degré arbre' }, type: 'select', options: gradeOptions(), value: st.sg, width: 'sm',
        onInput: function (v) { st.sg = v; save(); syncSelects(); update(); } });
      holeL = fHL.querySelector('select'); holeG = fHG.querySelector('select');
      shaftL = fSL.querySelector('select'); shaftG = fSG.querySelector('select');

      var desigField = h('div', { class: 'field w-md' },
        h('label', { for: 'fitDesig', text: TH.t('or type a fit', 'ou saisir un ajustement') }), designation,
        h('div', { class: 'help', id: 'fitDesigHelp', text: TH.t('e.g. H7/g6, Ø25 H8/f7', 'ex. H7/g6, Ø25 H8/f7') }));
      designation.setAttribute('aria-describedby', 'fitDesigHelp');
      designation.addEventListener('input', function () {
        var p = iso.parseFit(designation.value);
        designation.setAttribute('aria-invalid', p || !designation.value.trim() ? 'false' : 'true');
        if (!p) return;
        st.hl = p.hole.letter; st.hg = p.hole.grade; st.sl = p.shaft.letter; st.sg = p.shaft.grade;
        if (p.size) { st.size = p.size; fSize.querySelector('input').value = TH.num(p.size, 4); }
        holeL.value = st.hl; holeG.value = st.hg; shaftL.value = st.sl; shaftG.value = st.sg;
        save(); update();
      });
      fSize.appendChild(sizeMsg);

      var presets = h('div', { class: 'chips', role: 'group', 'aria-label': TH.t('Preferred fits', 'Ajustements recommandés') });
      iso.PREFERRED.forEach(function (pf) {
        presets.appendChild(h('button', {
          type: 'button', class: 'chip', title: TH.t(pf.name), text: pf.h + '/' + pf.s,
          on: { click: function () {
            var a = iso.parseClass(pf.h), b = iso.parseClass(pf.s);
            st.hl = a.letter; st.hg = a.grade; st.sl = b.letter; st.sg = b.grade;
            save(); syncSelects(); update();
          } }
        }));
      });

      root.appendChild(TH.card({ en: 'Input', fr: 'Données' }, [
        TH.row(fSize, fHL, fHG, fSL, fSG, desigField),
        h('div', { class: 'field' }, h('span', { class: 'label', text: TH.t('Preferred fits (ISO 286-2)', 'Ajustements recommandés (ISO 286-2)') }), presets)
      ]));
      root.appendChild(out);

      function update() {
        TH.clear(out);
        var size = st.size;
        if (!(size > 0)) { sizeMsg.textContent = TH.t('Enter a size greater than 0.', 'Saisir une dimension supérieure à 0.'); sizeMsg.className = 'help err'; return; }
        if (size > 3150) { sizeMsg.textContent = TH.t(ERR.range); sizeMsg.className = 'help err'; return; }
        sizeMsg.textContent = TH.t('Range: ', 'Plage : ') + TH.rangeLabel(iso.FINE, iso.fineIndex(size)) + ' mm';
        sizeMsg.className = 'help';
        var r = iso.fit(size, { letter: st.hl, grade: st.hg }, { letter: st.sl, grade: st.sg });
        if (r.error) {
          var bad = r.error === 'hole' ? r.hole : r.shaft;
          out.appendChild(TH.card(null, TH.note({
            en: (r.error === 'hole' ? 'Hole ' + cls(st.hl, st.hg) : 'Shaft ' + cls(st.sl, st.sg)) + ' at Ø' + TH.num(size) + ' mm: ' + ERR[bad.error].en,
            fr: (r.error === 'hole' ? 'Alésage ' + cls(st.hl, st.hg) : 'Arbre ' + cls(st.sl, st.sg)) + ' à Ø' + TH.num(size) + ' mm : ' + ERR[bad.error].fr
          }, 'warn')));
          return;
        }
        var fitName = 'Ø' + TH.num(size) + ' ' + cls(st.hl, st.hg) + '/' + cls(st.sl, st.sg);
        var tiles = [[{ en: 'Fit type', fr: 'Type d’ajustement' }, TH.t(TYPE[r.type]), fitName, 'primary text']];
        if (r.type === 'clearance') {
          tiles.push([{ en: 'Max clearance', fr: 'Jeu maxi' }, TH.devmm(r.maxClearance).replace('+', '') + ' mm', TH.num(r.maxClearance, 1) + ' µm', 'pos']);
          tiles.push([{ en: 'Min clearance', fr: 'Jeu mini' }, TH.devmm(r.minClearance).replace('+', '') + ' mm', TH.num(r.minClearance, 1) + ' µm', 'pos']);
        } else if (r.type === 'interference') {
          tiles.push([{ en: 'Max interference', fr: 'Serrage maxi' }, TH.devmm(r.maxInterference).replace('+', '') + ' mm', TH.num(r.maxInterference, 1) + ' µm', 'neg']);
          tiles.push([{ en: 'Min interference', fr: 'Serrage mini' }, TH.devmm(r.minInterference).replace('+', '') + ' mm', TH.num(r.minInterference, 1) + ' µm', 'neg']);
        } else {
          tiles.push([{ en: 'Max clearance', fr: 'Jeu maxi' }, TH.devmm(r.maxClearance).replace('+', '') + ' mm', TH.num(r.maxClearance, 1) + ' µm', 'pos']);
          tiles.push([{ en: 'Max interference', fr: 'Serrage maxi' }, TH.devmm(r.maxInterference).replace('+', '') + ' mm', TH.num(r.maxInterference, 1) + ' µm', 'neg']);
        }
        tiles.push([{ en: 'Fit tolerance', fr: 'Tolérance d’ajustement' }, TH.num(r.fitTolerance, 1) + ' µm', { en: 'IT hole + IT shaft', fr: 'IT alésage + IT arbre' }]);
        tiles.push([r.mean >= 0 ? { en: 'Mean clearance', fr: 'Jeu moyen' } : { en: 'Mean interference', fr: 'Serrage moyen' }, TH.num(Math.abs(r.mean), 1) + ' µm']);
        out.appendChild(TH.card({ en: 'Result', fr: 'Résultat' }, [
          TH.kv(tiles),
          h('div', { style: { marginTop: '14px' } }, limitsTable([
            { part: { en: 'Hole', fr: 'Alésage' }, cls: cls(st.hl, st.hg), dev: r.hole },
            { part: { en: 'Shaft', fr: 'Arbre' }, cls: cls(st.sl, st.sg), dev: r.shaft }
          ]))
        ]));
        out.appendChild(TH.card({ en: 'Tolerance zones', fr: 'Zones de tolérance' }, [
          zoneDiagram([
            { dev: r.hole, kind: 'hole', label: cls(st.hl, st.hg) },
            { dev: r.shaft, kind: 'shaft', label: cls(st.sl, st.sg) }
          ], size),
          h('div', { class: 'legend' },
            h('span', null, h('i', { class: 'l-hole' }), TH.t('Hole', 'Alésage')),
            h('span', null, h('i', { class: 'l-shaft' }), TH.t('Shaft', 'Arbre')))
        ]));
        out.appendChild(TH.note(NOTE));
      }
      update();
    }
  });

  /* ================= Limit tables ================= */
  TH.register({
    id: 'limits', group: 'tolerances', order: 11,
    title: { en: 'Hole & shaft limit deviations (ISO 286-2)', fr: 'Écarts limites alésages et arbres (ISO 286-2)' },
    short: { en: 'Hole & shaft tables', fr: 'Tableaux alésages / arbres' },
    keywords: 'iso 286-2 table hole shaft deviation limit tolerance class écart limite tableau alésage arbre',
    render: function (root) {
      var st = {
        kind: TH.store.get('limits.kind', 'hole'), letter: TH.store.get('limits.letter', 'H'),
        size: TH.store.get('limits.size', 50), big: TH.store.get('limits.big', false)
      };
      root.appendChild(TH.pageHead({
        title: { en: 'Limit deviation tables', fr: 'Tableaux des écarts limites' }, std: STD,
        lede: { en: 'Upper / lower deviations in µm for one tolerance position across all size ranges and grades. The row for your size is highlighted.', fr: 'Écarts supérieur / inférieur en µm d’une position de tolérance pour toutes les plages de dimensions et tous les degrés. La ligne de votre dimension est surlignée.' }
      }));
      var out = h('div');
      function save() { for (var k in st) TH.store.set('limits.' + k, st[k]); }
      var letterWrap = h('div');
      function letterField() {
        TH.clear(letterWrap);
        letterWrap.appendChild(TH.field({ label: { en: 'Position', fr: 'Position' }, type: 'select', width: 'sm',
          options: letterOptions(st.kind === 'hole'), value: st.letter,
          onInput: function (v) { st.letter = v; save(); update(); } }));
      }
      var controls = TH.row(
        TH.seg({ label: { en: 'Part', fr: 'Pièce' }, value: st.kind,
          options: [{ value: 'hole', label: { en: 'Holes', fr: 'Alésages' } }, { value: 'shaft', label: { en: 'Shafts', fr: 'Arbres' } }],
          onInput: function (v) {
            st.kind = v;
            st.letter = v === 'hole' ? st.letter.toUpperCase() : st.letter.toLowerCase();
            save(); letterField(); update();
          } }),
        letterWrap,
        TH.field({ label: { en: 'Your size', fr: 'Votre dimension' }, type: 'number', value: st.size, unit: 'mm', width: 'md',
          onInput: function (v) { st.size = v; save(); update(); } }),
        TH.seg({ label: { en: 'Sizes', fr: 'Dimensions' }, value: String(st.big),
          options: [{ value: 'false', label: '≤ 500 mm' }, { value: 'true', label: '500 – 3150 mm' }],
          onInput: function (v) { st.big = v === 'true'; save(); update(); } })
      );
      letterField();
      root.appendChild(TH.card(null, controls));
      root.appendChild(out);

      function update() {
        TH.clear(out);
        if (st.kind === 'hole' && st.letter !== st.letter.toUpperCase()) st.letter = st.letter.toUpperCase();
        var grades = [];
        for (var g = 1; g <= 18; g++) {
          for (var i = 0; i < iso.FINE.length; i++) {
            var d = iso.deviation(iso.FINE[i], st.letter, g);
            if (!d.error) { grades.push(g); break; }
          }
        }
        var bins = [];
        for (var b = 0; b < iso.FINE.length; b++) {
          if (st.big ? iso.FINE[b] > 500 : iso.FINE[b] <= 500) bins.push(b);
        }
        var hit = iso.fineIndex(st.size);
        var rows = [], hlRow = null;
        bins.forEach(function (b) {
          var size = iso.FINE[b];
          var cells = grades.map(function (g) {
            var d = iso.deviation(size, st.letter, g);
            return d.error ? '' : TH.devum(d.upper) + ' / ' + TH.devum(d.lower);
          });
          if (cells.every(function (c) { return c === ''; })) return;
          if (b === hit) hlRow = rows.length;
          rows.push([TH.rangeLabel(iso.FINE, b)].concat(cells.map(function (c) { return c || '—'; })));
        });
        if (!rows.length) {
          out.appendChild(TH.note({ en: 'This position is not defined in this size band.', fr: 'Cette position n’est pas définie dans cette plage de dimensions.' }, 'warn'));
          return;
        }
        out.appendChild(TH.card({ en: (st.kind === 'hole' ? 'Holes ' : 'Shafts ') + st.letter + ' — deviations in µm (upper / lower)', fr: (st.kind === 'hole' ? 'Alésages ' : 'Arbres ') + st.letter + ' — écarts en µm (sup. / inf.)' },
          TH.table({
            compact: true, rowHead: true, hlRow: hlRow,
            cols: [{ label: { en: 'Size (mm)', fr: 'Dimension (mm)' } }].concat(grades.map(function (g) { return { label: st.letter + g, num: true }; })),
            rows: rows
          })));
        if (hlRow == null && st.size > 0) out.appendChild(TH.note({ en: 'Your size is outside the displayed band.', fr: 'Votre dimension est hors de la plage affichée.' }));
        out.appendChild(TH.note(NOTE));
        TH.revealHit(out);
      }
      update();
    }
  });

  /* ================= IT grades ================= */
  TH.register({
    id: 'it-grades', group: 'tolerances', order: 12,
    title: { en: 'Standard tolerance grades IT (ISO 286-1)', fr: 'Degrés de tolérance normalisés IT (ISO 286-1)' },
    short: { en: 'IT grades', fr: 'Degrés IT' },
    keywords: 'it grade standard tolerance it6 it7 it8 degré tolérance normalisée qualité',
    render: function (root) {
      var st = { size: TH.store.get('it.size', 50), grade: TH.store.get('it.grade', '7') };
      root.appendChild(TH.pageHead({
        title: { en: 'Standard tolerance grades (IT)', fr: 'Degrés de tolérance normalisés (IT)' }, std: ['ISO 286-1:2010'],
        lede: { en: 'The IT value is the width of the tolerance zone, independent of its position. Values in µm.', fr: 'La valeur IT est la largeur de la zone de tolérance, indépendamment de sa position. Valeurs en µm.' }
      }));
      var res = h('div'), tbl = h('div');
      root.appendChild(TH.card(null, [TH.row(
        TH.field({ label: { en: 'Nominal size', fr: 'Dimension nominale' }, type: 'number', value: st.size, unit: 'mm', width: 'md',
          onInput: function (v) { st.size = v; TH.store.set('it.size', v); update(); } }),
        TH.field({ label: { en: 'Grade', fr: 'Degré' }, type: 'select', options: gradeOptions(), value: st.grade, width: 'sm',
          onInput: function (v) { st.grade = v; TH.store.set('it.grade', v); update(); } })
      ), res]));
      root.appendChild(TH.card({ en: 'IT values (µm)', fr: 'Valeurs IT (µm)' }, tbl));
      root.appendChild(TH.card({ en: 'Typical use of the grades', fr: 'Emploi courant des degrés' }, TH.table({
        cols: [{ label: { en: 'Grades', fr: 'Degrés' } }, { label: { en: 'Typical use', fr: 'Emploi courant' } }],
        rows: [
          ['IT01 – IT4', { en: 'Gauges, measuring instruments, precision standards', fr: 'Calibres, instruments de mesure, étalons de précision' }],
          ['IT5 – IT7', { en: 'Precision fits: bearing seats, spindles, precise machining and grinding', fr: 'Ajustements précis : portées de roulements, broches, usinage précis et rectification' }],
          ['IT8 – IT11', { en: 'General machining fits, turning, milling, reaming', fr: 'Ajustements d’usinage courant, tournage, fraisage, alésage à l’alésoir' }],
          ['IT12 – IT18', { en: 'Non-fitting dimensions: rough machining, sheet metal, castings, forgings, cut stock', fr: 'Cotes libres : ébauche, tôlerie, fonderie, forge, débit' }]
        ]
      })));
      root.appendChild(TH.note(NOTE));
      function update() {
        TH.clear(res); TH.clear(tbl);
        var v = iso.it(st.size, st.grade);
        var mi = iso.mainIndex(st.size);
        if (!(st.size > 0) || st.size > 3150) res.appendChild(TH.note(ERR.range, 'warn'));
        else if (v == null) res.appendChild(TH.note(ERR.grade, 'warn'));
        else res.appendChild(TH.kv([
          [{ en: 'IT' + st.grade + ' at Ø' + TH.num(st.size) + ' mm', fr: 'IT' + st.grade + ' pour Ø' + TH.num(st.size) + ' mm' }, TH.num(v, 1) + ' µm', TH.num(v / 1000, 4) + ' mm', 'primary'],
          [{ en: 'Size range', fr: 'Plage de dimensions' }, TH.rangeLabel(iso.MAIN, mi) + ' mm']
        ]));
        var gi = iso.GRADES.map(String).indexOf(String(st.grade));
        tbl.appendChild(TH.table({
          compact: true, rowHead: true, hlRow: mi >= 0 ? mi : null, hlCol: gi + 1,
          cols: [{ label: { en: 'Size (mm)', fr: 'Dimension (mm)' } }].concat(iso.GRADES.map(function (g) { return { label: 'IT' + g, num: true, dec: 1 }; })),
          rows: iso.MAIN.map(function (b, i) {
            return [TH.rangeLabel(iso.MAIN, i)].concat(iso.GRADES.map(function (g) { return iso.it(b, g); }));
          })
        }));
        TH.revealHit(tbl);
      }
      update();
    }
  });

  /* ================= Preferred fits ================= */
  TH.register({
    id: 'preferred-fits', group: 'tolerances', order: 13,
    title: { en: 'Preferred fits (ISO 286-2)', fr: 'Ajustements recommandés (ISO 286-2)' },
    short: { en: 'Preferred fits', fr: 'Ajustements recommandés' },
    keywords: 'preferred fits selection hole basis shaft basis ajustements recommandés choix système alésage normal arbre normal',
    render: function (root) {
      var st = { size: TH.store.get('pf.size', 50), basis: TH.store.get('pf.basis', 'hole') };
      root.appendChild(TH.pageHead({
        title: { en: 'Preferred fits', fr: 'Ajustements recommandés' }, std: STD,
        lede: { en: 'The ISO selection of fits, from loose running to force fits, computed at your size. Select a row to open it in the fit calculator.', fr: 'La sélection ISO d’ajustements, du jeu très large au frettage, calculée à votre dimension. Choisir une ligne pour l’ouvrir dans le calcul d’ajustement.' }
      }));
      var out = h('div');
      root.appendChild(TH.card(null, TH.row(
        TH.field({ label: { en: 'Nominal size', fr: 'Dimension nominale' }, type: 'number', value: st.size, unit: 'mm', width: 'md',
          onInput: function (v) { st.size = v; TH.store.set('pf.size', v); update(); } }),
        TH.seg({ label: { en: 'System', fr: 'Système' }, value: st.basis,
          options: [{ value: 'hole', label: { en: 'Hole basis (H)', fr: 'Alésage normal (H)' } }, { value: 'shaft', label: { en: 'Shaft basis (h)', fr: 'Arbre normal (h)' } }],
          onInput: function (v) { st.basis = v; TH.store.set('pf.basis', v); update(); } })
      )));
      root.appendChild(out);
      function update() {
        TH.clear(out);
        if (!(st.size > 0) || st.size > 3150) { out.appendChild(TH.note(ERR.range, 'warn')); return; }
        var t = TH.h('table', { class: 'data' });
        var head = TH.h('tr');
        [{ en: 'Fit', fr: 'Ajustement' }, { en: 'Name', fr: 'Désignation' }, { en: 'Hole (µm)', fr: 'Alésage (µm)' }, { en: 'Shaft (µm)', fr: 'Arbre (µm)' },
          { en: 'Clearance (+) / interference (−) µm', fr: 'Jeu (+) / serrage (−) µm' }, { en: 'Use', fr: 'Emploi' }, '']
          .forEach(function (c) { head.appendChild(TH.h('th', { scope: 'col', text: TH.t(c) })); });
        t.appendChild(TH.h('thead', null, head));
        var tb = TH.h('tbody');
        iso.PREFERRED.forEach(function (pf) {
          var txt = st.basis === 'hole' ? pf.h + '/' + pf.s : pf.alt;
          var p = iso.parseFit(txt);
          var r = iso.fit(st.size, p.hole, p.shaft);
          var range = r.error ? '—' : TH.devum(r.maxClearance) + ' … ' + TH.devum(r.minClearance);
          var open = TH.h('button', { type: 'button', class: 'btn', text: TH.t('Open', 'Ouvrir'),
            'aria-label': TH.t('Open ' + txt + ' in the fit calculator', 'Ouvrir ' + txt + ' dans le calcul d’ajustement'),
            on: { click: function () {
              TH.store.set('fits.size', st.size);
              TH.store.set('fits.hl', p.hole.letter); TH.store.set('fits.hg', p.hole.grade);
              TH.store.set('fits.sl', p.shaft.letter); TH.store.set('fits.sg', p.shaft.grade);
              location.hash = '#/fits';
            } } });
          tb.appendChild(TH.h('tr', null,
            TH.h('th', { scope: 'row', text: txt }),
            TH.h('td', null, TH.h('strong', { text: TH.t(pf.name) }), TH.h('div', { class: 'help', text: TH.t(TYPE[pf.type]) })),
            TH.h('td', { class: 'num', text: r.error ? '—' : TH.devum(r.hole.upper) + ' / ' + TH.devum(r.hole.lower) }),
            TH.h('td', { class: 'num', text: r.error ? '—' : TH.devum(r.shaft.upper) + ' / ' + TH.devum(r.shaft.lower) }),
            TH.h('td', { class: 'num ' + (r.type === 'interference' ? 'neg' : r.type === 'clearance' ? 'pos' : ''), text: range }),
            TH.h('td', { class: 'wrap', text: TH.t(pf.use) }),
            TH.h('td', null, open)));
        });
        t.appendChild(tb);
        out.appendChild(TH.card({ en: 'Fits at Ø' + TH.num(st.size) + ' mm', fr: 'Ajustements pour Ø' + TH.num(st.size) + ' mm' },
          TH.h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': TH.t('Preferred fits', 'Ajustements recommandés') }, t)));
        out.appendChild(TH.note({ en: 'Clearance range = max clearance … min clearance; a negative value is an interference. Clearance and transition fits run from loose (top) to tight (bottom).', fr: 'Plage de jeu = jeu maxi … jeu mini ; une valeur négative est un serrage. Les ajustements vont du plus libre (haut) au plus serré (bas).' }));
        out.appendChild(TH.note(NOTE));
      }
      update();
    }
  });
})(window.TH);
