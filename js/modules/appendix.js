/* Appendix pages: fastener holes, tapers, lifting eyes, materials & blank weight, units, surface roughness. */
(function (TH) {
  'use strict';
  var h = TH.h, A = TH.engine.appendix;

  /* ---------- shared helpers ---------- */
  function st(page, key, def) { return TH.store.get(page + '.' + key, def); }
  function put(page, key, v) { TH.store.set(page + '.' + key, v); }
  // Number with ~n significant digits, locale aware.
  function sig(x, n) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var mag = Math.floor(Math.log10(Math.abs(x)));
    var dec = Math.max(0, Math.min(12, (n || 6) - 1 - mag));
    return TH.num(x, dec);
  }
  function dmsText(deg) {
    var r = A.dms(deg);
    return (r.sign < 0 ? '−' : '') + r.d + '° ' + r.m + '′ ' + TH.num(r.s, 1) + '″';
  }
  function live() { return h('div', { class: 'stack', 'aria-live': 'polite' }); }
  function bad(msg) { return TH.note(msg, 'warn'); }
  // Rebuild a whole page in place (used when a picker loads several inputs at once).
  function rebuild(root, render) { TH.clear(root); render(root); }

  var MSG_NUM = { en: 'Enter positive numbers (decimal point or comma).', fr: 'Saisir des nombres positifs (point ou virgule décimale).' };

  /* =====================================================================
     1. Clearance holes, counterbores, countersinks
     ===================================================================== */
  var SERIES = [
    { value: 'fine', label: { en: 'Fine', fr: 'Fine' } },
    { value: 'medium', label: { en: 'Medium', fr: 'Moyenne' } },
    { value: 'coarse', label: { en: 'Coarse', fr: 'Grossière' } }
  ];

  function renderHoles(root) {
    var P = 'counterbores';
    var size = st(P, 'size', 'M8');
    var series = st(P, 'series', 'medium');
    if (!A.holesFor(size)) size = 'M8';

    root.appendChild(TH.pageHead({
      title: { en: 'Clearance holes, counterbores & countersinks', fr: 'Trous de passage, lamages et fraisures' },
      std: ['ISO 273', 'ISO 4762', 'DIN 974-1', 'ISO 10642', 'DIN 74'],
      lede: {
        en: 'Pick a metric thread to get the clearance hole for the chosen series, the counterbore for a socket head cap screw and the 90° countersink for a socket countersunk screw.',
        fr: 'Choisir un filetage métrique pour obtenir le trou de passage de la série choisie, le lamage pour une vis CHC et la fraisure à 90° pour une vis FHC.'
      }
    }));

    var out = live();
    var tables = h('div');
    root.appendChild(TH.card({ en: 'Hole calculator', fr: 'Calcul des trous' }, [
      TH.row(
        TH.field({
          label: { en: 'Thread', fr: 'Filetage' }, type: 'select', value: size, width: 'sm',
          options: A.CLEARANCE.map(function (r) { return r.size; }),
          onInput: function (v) { size = v; put(P, 'size', v); update(); }
        }),
        TH.seg({
          label: { en: 'Clearance series (ISO 273)', fr: 'Série de passage (ISO 273)' }, value: series, options: SERIES,
          onInput: function (v) { series = v; put(P, 'series', v); update(); }
        })),
      out
    ]));
    root.appendChild(tables);
    root.appendChild(TH.note({
      en: 'Sources: ISO 273 (clearance holes, fine/medium/coarse = H12/H13/H14 class of use), ISO 4762 and ISO 10642 (head dimensions), DIN 974-1 row 1 (counterbore Ø, H13) and DIN 74 (countersinks for ISO 10642). Counterbore depths are the usual flush-head values (head height + allowance). Check the current editions and allow extra depth for washers.',
      fr: 'Sources : ISO 273 (trous de passage, séries fine/moyenne/grossière ≈ H12/H13/H14), ISO 4762 et ISO 10642 (dimensions des têtes), DIN 974-1 rangée 1 (Ø de lamage, H13) et DIN 74 (fraisures pour ISO 10642). Les profondeurs de lamage sont les valeurs usuelles pour une tête affleurante (hauteur de tête + jeu). Vérifier les éditions en vigueur et prévoir plus de profondeur en cas de rondelle.'
    }));

    function update() {
      var r = A.holesFor(size);
      TH.clear(out);
      var sLabel = TH.t(SERIES.filter(function (s) { return s.value === series; })[0].label);
      out.appendChild(h('h3', { text: TH.t('Clearance hole', 'Trou de passage') }));
      out.appendChild(TH.kv([
        [{ en: 'Hole Ø — ' + sLabel, fr: 'Ø de passage — ' + sLabel }, TH.num(r.clearance[series]) + ' mm', null, 'primary'],
        [{ en: 'Fine', fr: 'Fine' }, TH.num(r.clearance.fine) + ' mm'],
        [{ en: 'Medium', fr: 'Moyenne' }, TH.num(r.clearance.medium) + ' mm'],
        [{ en: 'Coarse', fr: 'Grossière' }, TH.num(r.clearance.coarse) + ' mm']
      ]));
      out.appendChild(h('h3', { text: TH.t('Counterbore — socket head cap screw ISO 4762', 'Lamage — vis CHC ISO 4762') }));
      if (r.cbore) {
        out.appendChild(TH.kv([
          [{ en: 'Counterbore Ø d1 (H13)', fr: 'Ø de lamage d1 (H13)' }, TH.num(r.cbore.d1) + ' mm', null, 'primary'],
          [{ en: 'Counterbore depth t', fr: 'Profondeur de lamage t' }, r.cbore.t != null ? TH.num(r.cbore.t) + ' mm' : '—',
            r.cbore.t != null ? null : { en: 'k + allowance', fr: 'k + jeu' }],
          [{ en: 'Head Ø dk max', fr: 'Ø de tête dk max' }, TH.num(r.cbore.dk) + ' mm'],
          [{ en: 'Head height k max', fr: 'Hauteur de tête k max' }, TH.num(r.cbore.k) + ' mm']
        ]));
      } else out.appendChild(TH.note({ en: 'No counterbore data tabulated for ' + size + '.', fr: 'Pas de données de lamage pour ' + size + '.' }));
      out.appendChild(h('h3', { text: TH.t('Countersink 90° — socket countersunk screw ISO 10642', 'Fraisure 90° — vis FHC ISO 10642') }));
      if (r.csink) {
        out.appendChild(TH.kv([
          [{ en: 'Countersink Ø d2', fr: 'Ø de fraisure d2' }, TH.num(r.csink.d2) + ' mm', null, 'primary'],
          [{ en: 'Depth t (flush)', fr: 'Profondeur t (affleurant)' }, TH.num(r.csink.t) + ' mm'],
          [{ en: 'Head Ø dk theor. max', fr: 'Ø de tête dk théor. max' }, TH.num(r.csink.dkTh) + ' mm'],
          [{ en: 'Head height k max', fr: 'Hauteur de tête k max' }, TH.num(r.csink.k) + ' mm']
        ]));
      } else out.appendChild(TH.note({ en: 'ISO 10642 countersink data is tabulated for M3 to M20.', fr: 'Les fraisures ISO 10642 sont données de M3 à M20.' }));

      // Tables with the current size highlighted.
      TH.clear(tables);
      var si = A.CLEARANCE.map(function (c) { return c.size; }).indexOf(size);
      var col = { fine: 1, medium: 2, coarse: 3 }[series];
      tables.appendChild(TH.card({ en: 'Clearance holes — ISO 273 (mm)', fr: 'Trous de passage — ISO 273 (mm)' }, TH.table({
        cols: [{ label: { en: 'Thread', fr: 'Filetage' } }, { label: { en: 'Fine', fr: 'Fine' }, num: true },
          { label: { en: 'Medium', fr: 'Moyenne' }, num: true }, { label: { en: 'Coarse', fr: 'Grossière' }, num: true }],
        rows: A.CLEARANCE.map(function (c) { return [c.size, c.fine, c.medium, c.coarse]; }),
        rowHead: true, compact: true, hlRow: si, hlCell: [si, col], hlCol: col
      })));
      var cb = Object.keys(A.CBORE);
      var cs = Object.keys(A.CSINK);
      tables.appendChild(h('div', { class: 'grid-2' },
        TH.card({ en: 'Counterbores for ISO 4762 (mm)', fr: 'Lamages pour ISO 4762 (mm)' }, TH.table({
          cols: [{ label: { en: 'Thread', fr: 'Filetage' } }, { label: 'dk', num: true }, { label: 'k', num: true },
            { label: 'd1 H13', num: true }, { label: 't', num: true }],
          rows: cb.map(function (s) { var c = A.CBORE[s]; return [s, c.dk, c.k, c.d1, c.t]; }),
          rowHead: true, compact: true, hlRow: cb.indexOf(size), hlCell: [cb.indexOf(size), 3]
        })),
        TH.card({ en: 'Countersinks for ISO 10642 (mm)', fr: 'Fraisures pour ISO 10642 (mm)' }, TH.table({
          cols: [{ label: { en: 'Thread', fr: 'Filetage' } }, { label: { en: 'dk theor.', fr: 'dk théor.' }, num: true },
            { label: 'k', num: true }, { label: 'd2', num: true }, { label: 't', num: true }],
          rows: cs.map(function (s) { var c = A.CSINK[s]; return [s, c.dkTh, c.k, c.d2, c.t]; }),
          rowHead: true, compact: true, hlRow: cs.indexOf(size), hlCell: [cs.indexOf(size), 3]
        }))));
      TH.revealHit(tables);
      Array.prototype.forEach.call(tables.querySelectorAll('.table-wrap'), function (w) {
        var hit = w.querySelector('tr.hl'); if (hit && w.scrollHeight > w.clientHeight) w.scrollTop = Math.max(0, hit.offsetTop - w.clientHeight / 2);
      });
    }
    update();
  }

  TH.register({
    id: 'counterbores', group: 'appendix', order: 10,
    title: { en: 'Clearance holes, counterbores & countersinks', fr: 'Trous de passage, lamages et fraisures' },
    short: { en: 'Holes, counterbores, countersinks', fr: 'Passages, lamages, fraisures' },
    keywords: 'clearance hole counterbore countersink socket head cap screw iso 273 4762 10642 din 974 din 74 trou de passage lamage fraisure vis chc fhc',
    render: renderHoles
  });

  /* =====================================================================
     2. Tapers
     ===================================================================== */
  function renderTapers(root) {
    var P = 'tapers';
    var mode = st(P, 'mode', 'dims');
    var D = st(P, 'D', 20), d = st(P, 'd', 15), L = st(P, 'L', 100), x = st(P, 'x', 20), Lw = st(P, 'Lw', '');

    root.appendChild(TH.pageHead({
      title: { en: 'Tapers', fr: 'Cônes' },
      std: ['ISO 296', 'ISO 297', 'ISO 1119', 'ISO 7388-1'],
      lede: {
        en: 'Taper ratio, included and half angle (compound-rest setting) and tailstock set-over, plus Morse, metric and 7:24 steep tapers.',
        fr: 'Conicité, angle au sommet et demi-angle (inclinaison du chariot), désaxage de la contre-pointe, ainsi que les cônes Morse, métriques et 7/24.'
      }
    }));

    var out = live();
    var stdPick = TH.field({
      label: { en: 'Load a standard taper', fr: 'Charger un cône normalisé' }, type: 'select', value: '', width: 'md',
      options: [{ value: '', label: { en: '— choose —', fr: '— choisir —' } },
        { group: { en: 'Morse (ISO 296)', fr: 'Morse (ISO 296)' }, options: A.MORSE.map(function (m) { return { value: 'm:' + m.id, label: m.id }; }) },
        { group: { en: 'Metric 1:20 (ISO 296)', fr: 'Métrique 1:20 (ISO 296)' }, options: A.METRIC_TAPER.map(function (m) { return { value: 'e:' + m.id, label: m.id }; }) },
        { group: { en: 'Steep taper 7:24', fr: 'Cône 7/24' }, options: A.STEEP.map(function (m) { return { value: 's:' + m.id, label: 'SK / ISO ' + m.id }; }) }],
      onInput: function (v) {
        if (!v) return;
        var kind = v.slice(0, 1), id = v.slice(2), t;
        if (kind === 'm') t = A.MORSE.filter(function (m) { return m.id === id; })[0];
        if (kind === 'e') t = A.METRIC_TAPER.filter(function (m) { return m.id === id; })[0];
        if (kind === 's') { t = A.STEEP.filter(function (m) { return m.id === id; })[0]; t = { D: t.D, x: A.STEEP_RATIO }; }
        put(P, 'mode', 'ratio'); put(P, 'D', t.D); put(P, 'x', Math.round(t.x * 1e6) / 1e6);
        rebuild(root, renderTapers);
      }
    });

    var fields = [
      TH.field({ label: { en: 'Large Ø D', fr: 'Grand Ø D' }, type: 'number', value: D, unit: 'mm', width: 'sm', onInput: function (v) { D = v; put(P, 'D', v); update(); } }),
      mode === 'dims'
        ? TH.field({ label: { en: 'Small Ø d', fr: 'Petit Ø d' }, type: 'number', value: d, unit: 'mm', width: 'sm', onInput: function (v) { d = v; put(P, 'd', v); update(); } })
        : TH.field({ label: { en: 'Taper 1 : x', fr: 'Conicité 1 : x' }, type: 'number', value: x, width: 'sm', onInput: function (v) { x = v; put(P, 'x', v); update(); } }),
      TH.field({ label: { en: 'Taper length L', fr: 'Longueur du cône L' }, type: 'number', value: L, unit: 'mm', width: 'sm', onInput: function (v) { L = v; put(P, 'L', v); update(); } }),
      TH.field({
        label: { en: 'Workpiece length (set-over)', fr: 'Longueur de la pièce (désaxage)' }, type: 'number', value: Lw, unit: 'mm', width: 'md',
        help: { en: 'Optional — between centres', fr: 'Facultatif — entre pointes' },
        onInput: function (v) { Lw = v; put(P, 'Lw', isFinite(v) ? v : ''); update(); }
      })
    ];

    root.appendChild(TH.card({ en: 'Taper calculator', fr: 'Calcul de cône' }, [
      TH.row(
        TH.seg({
          label: { en: 'Input', fr: 'Saisie' }, value: mode,
          options: [{ value: 'dims', label: { en: 'Two diameters', fr: 'Deux diamètres' } }, { value: 'ratio', label: { en: 'Diameter + taper', fr: 'Diamètre + conicité' } }],
          onInput: function (v) { put(P, 'mode', v); rebuild(root, renderTapers); }
        }),
        stdPick),
      TH.row.apply(null, fields),
      out
    ]));

    function update() {
      TH.clear(out);
      var Dv = TH.parse(D), Lv = TH.parse(L), dv, lw = TH.parse(Lw);
      if (mode === 'ratio') {
        var xv = TH.parse(x);
        dv = A.smallDia(Dv, xv, Lv);
        if (!(xv > 0)) { out.appendChild(bad(MSG_NUM)); return; }
      } else dv = TH.parse(d);
      var r = A.taper(Dv, dv, Lv, lw);
      if (!r) {
        out.appendChild(bad(mode === 'ratio' && Dv > 0 && Lv > 0 && !(dv > 0)
          ? { en: 'The taper length is too long for this diameter: the small end would be ' + TH.num(dv) + ' mm.', fr: 'Longueur trop grande pour ce diamètre : le petit Ø serait ' + TH.num(dv) + ' mm.' }
          : { en: 'Enter D greater than d, and a positive length.', fr: 'Saisir D supérieur à d et une longueur positive.' }));
        return;
      }
      out.appendChild(TH.kv([
        [{ en: 'Taper', fr: 'Conicité' }, '1 : ' + TH.num(r.ratio, 3), { en: 'C = ' + TH.num(r.C, 5), fr: 'C = ' + TH.num(r.C, 5) }, 'primary'],
        mode === 'ratio' ? [{ en: 'Small Ø d', fr: 'Petit Ø d' }, TH.num(dv, 3) + ' mm', null, 'primary'] : null,
        [{ en: 'Included angle α', fr: 'Angle au sommet α' }, dmsText(r.angle), TH.num(r.angle, 4) + '°'],
        [{ en: 'Half angle α/2 (compound rest)', fr: 'Demi-angle α/2 (chariot)' }, dmsText(r.halfAngle), TH.num(r.halfAngle, 4) + '°'],
        [{ en: 'Slope (radial)', fr: 'Pente (radiale)' }, '1 : ' + TH.num(1 / r.slope, 3)],
        r.setOver != null ? [{ en: 'Tailstock set-over', fr: 'Désaxage contre-pointe' }, TH.num(r.setOver, 3) + ' mm',
          { en: '(D − d)/2 · workpiece/L', fr: '(D − d)/2 · pièce/L' }] : null
      ]));
    }
    update();

    // Standard taper tables.
    function stdRow(id, Dg, xr) {
      var a = A.angleFromRatio(xr);
      return [id, Dg, '1 : ' + TH.num(xr, 3), dmsText(a / 2), dmsText(a)];
    }
    var cols = [{ label: { en: 'Size', fr: 'Taille' } }, { label: { en: 'Gauge Ø D (mm)', fr: 'Ø de jauge D (mm)' }, num: true },
      { label: { en: 'Taper', fr: 'Conicité' }, num: true }, { label: { en: 'Half angle', fr: 'Demi-angle' }, num: true },
      { label: { en: 'Included angle', fr: 'Angle au sommet' }, num: true }];
    root.appendChild(h('div', { class: 'grid-2' },
      TH.card({ en: 'Morse tapers — ISO 296', fr: 'Cônes Morse — ISO 296' }, TH.table({
        cols: cols, rowHead: true, compact: true,
        rows: A.MORSE.map(function (m) { return stdRow(m.id, m.D, m.x); })
      })),
      TH.card({ en: 'Metric tapers 1:20 & steep tapers 7:24', fr: 'Cônes métriques 1:20 et cônes 7/24' }, TH.table({
        cols: cols, rowHead: true, compact: true,
        rows: A.METRIC_TAPER.map(function (m) { return stdRow(m.id, m.D, m.x); })
          .concat(A.STEEP.map(function (m) { return stdRow('7:24 — ' + m.id, m.D, A.STEEP_RATIO); }))
      }))));
    root.appendChild(TH.card({ en: 'Series of conical tapers — ISO 1119', fr: 'Série de conicités — ISO 1119' }, TH.table({
      cols: [{ label: { en: 'Designation', fr: 'Désignation' } }, { label: { en: 'Taper C = 1 : x', fr: 'Conicité C = 1 : x' }, num: true },
        { label: { en: 'Included angle', fr: 'Angle au sommet' }, num: true }, { label: { en: 'Half angle', fr: 'Demi-angle' }, num: true },
        { label: { en: 'Angle (decimal °)', fr: 'Angle (° décimaux)' }, num: true }],
      rowHead: true, compact: true,
      rows: A.ISO1119.map(function (t) { return [t.label, '1 : ' + TH.num(t.x, 4), dmsText(t.angle), dmsText(t.angle / 2), TH.num(t.angle, 5)]; })
    })));
    root.appendChild(TH.note({
      en: 'Taper C = (D − d) / L; tan(α/2) = (D − d) / 2L. Morse and metric tapers per ISO 296, 7:24 steep tapers per ISO 297 / ISO 7388-1 (SK, also DIN 69871 and CAT), series per ISO 1119. Check the current editions.',
      fr: 'Conicité C = (D − d) / L ; tan(α/2) = (D − d) / 2L. Cônes Morse et métriques selon ISO 296, cônes 7/24 selon ISO 297 / ISO 7388-1 (SA, aussi DIN 69871 et CAT), série selon ISO 1119. Vérifier les éditions en vigueur.'
    }));
  }

  TH.register({
    id: 'tapers', group: 'appendix', order: 20,
    title: { en: 'Tapers', fr: 'Cônes' },
    keywords: 'taper morse metric 7:24 steep sk iso 296 1119 angle set-over compound rest cône conicité morse métrique angle au sommet désaxage chariot',
    render: renderTapers
  });

  /* =====================================================================
     3. Lifting eye bolts / eye nuts
     ===================================================================== */
  function renderLifting(root) {
    var P = 'lifting';
    var size = st(P, 'size', 'M12');
    var sizes = A.EYEBOLT.map(function (e) { return e.size; });
    if (sizes.indexOf(size) < 0) size = 'M12';

    root.appendChild(TH.pageHead({
      title: { en: 'Lifting eye bolts & eye nuts', fr: 'Anneaux de levage' },
      std: ['DIN 580', 'DIN 582'],
      lede: {
        en: 'Working load limit of collar eye bolts (DIN 580) and eye nuts (DIN 582) in C15E steel, for a single eye loaded straight along its axis.',
        fr: 'Charge maximale d’utilisation (CMU) des anneaux de levage mâles (DIN 580) et femelles (DIN 582) en acier C15E, pour un anneau seul chargé dans l’axe.'
      }
    }));
    var out = live();
    var tbl = h('div');
    root.appendChild(TH.card({ en: 'Working load limit', fr: 'Charge maximale d’utilisation' }, [
      TH.row(TH.field({
        label: { en: 'Thread', fr: 'Filetage' }, type: 'select', value: size, width: 'sm', options: sizes,
        onInput: function (v) { size = v; put(P, 'size', v); update(); }
      })),
      out
    ]));
    root.appendChild(tbl);
    root.appendChild(TH.note({
      en: 'Safety: these values apply only to ONE eye loaded vertically along the bolt axis, screwed fully down so the collar bears flat on a machined face, with full thread engagement. Angled, paired or side loading reduces the permissible load considerably — use the reduced values printed in the manufacturer’s instructions, never load across the plane of the ring, and use swivel lifting points for angled lifts. Eye nuts DIN 582 carry the same axial values (verified up to M36).',
      fr: 'Sécurité : ces valeurs ne valent que pour UN anneau chargé verticalement dans l’axe, vissé à fond avec la collerette en appui plan sur une face usinée et une longueur de filetage en prise complète. Une traction inclinée, à deux anneaux ou latérale réduit fortement la charge admissible : utiliser les valeurs réduites de la notice du fabricant, ne jamais charger perpendiculairement au plan de l’anneau et préférer des points de levage articulés pour les levages inclinés. Les anneaux femelles DIN 582 ont les mêmes valeurs axiales (vérifiées jusqu’à M36).'
    }, 'warn'));
    root.appendChild(TH.note({
      en: 'Source: DIN 580 / DIN 582 (C15E, safety factor 6:1) as published in manufacturer data. Always check the marking on the part and the current edition.',
      fr: 'Source : DIN 580 / DIN 582 (C15E, coefficient de sécurité 6:1) d’après les données fabricants. Toujours vérifier le marquage de la pièce et l’édition en vigueur.'
    }));

    function update() {
      var e = A.EYEBOLT[sizes.indexOf(size)];
      TH.clear(out);
      out.appendChild(TH.kv([
        [{ en: 'WLL, axial', fr: 'CMU, dans l’axe' }, TH.num(e.wll, 0) + ' kg', null, 'primary'],
        [{ en: 'In tonnes', fr: 'En tonnes' }, TH.num(e.wll / 1000, 3) + ' t'],
        [{ en: 'Force', fr: 'Effort' }, TH.num(e.wll * 9.80665 / 1000, 2) + ' kN']
      ]));
      TH.clear(tbl);
      var i = sizes.indexOf(size);
      tbl.appendChild(TH.card({ en: 'DIN 580 / DIN 582 — single eye, axial load', fr: 'DIN 580 / DIN 582 — anneau seul, charge axiale' }, TH.table({
        cols: [{ label: { en: 'Thread', fr: 'Filetage' } }, { label: { en: 'WLL (kg)', fr: 'CMU (kg)' }, num: true },
          { label: { en: 'WLL (t)', fr: 'CMU (t)' }, num: true }, { label: { en: 'Force (kN)', fr: 'Effort (kN)' }, num: true }],
        rows: A.EYEBOLT.map(function (b) { return [b.size, TH.num(b.wll, 0), TH.num(b.wll / 1000, 3), TH.num(b.wll * 9.80665 / 1000, 2)]; }),
        rowHead: true, compact: true, hlRow: i, hlCell: [i, 1]
      })));
      TH.revealHit(tbl);
    }
    update();
  }

  TH.register({
    id: 'lifting', group: 'appendix', order: 30,
    title: { en: 'Lifting eye bolts & eye nuts', fr: 'Anneaux de levage' },
    short: { en: 'Lifting eyes', fr: 'Anneaux de levage' },
    keywords: 'lifting eye bolt eye nut din 580 582 wll working load limit anneau de levage mâle femelle cmu charge maximale',
    render: renderLifting
  });

  /* =====================================================================
     4. Materials & blank weight
     ===================================================================== */
  var SHAPES = [
    { value: 'round', label: { en: 'Round bar', fr: 'Rond' }, dims: [['d', { en: 'Diameter d', fr: 'Diamètre d' }], ['L', { en: 'Length L', fr: 'Longueur L' }]] },
    { value: 'tube', label: { en: 'Tube', fr: 'Tube' }, dims: [['D', { en: 'Outside Ø D', fr: 'Ø extérieur D' }], ['d', { en: 'Inside Ø d', fr: 'Ø intérieur d' }], ['L', { en: 'Length L', fr: 'Longueur L' }]] },
    { value: 'flat', label: { en: 'Flat / plate', fr: 'Plat / tôle' }, dims: [['a', { en: 'Width a', fr: 'Largeur a' }], ['b', { en: 'Thickness b', fr: 'Épaisseur b' }], ['L', { en: 'Length L', fr: 'Longueur L' }]] },
    { value: 'square', label: { en: 'Square', fr: 'Carré' }, dims: [['a', { en: 'Side a', fr: 'Côté a' }], ['L', { en: 'Length L', fr: 'Longueur L' }]] },
    { value: 'hex', label: { en: 'Hexagon', fr: 'Hexagone' }, dims: [['s', { en: 'Across flats s', fr: 'Sur plats s' }], ['L', { en: 'Length L', fr: 'Longueur L' }]] },
    { value: 'ring', label: { en: 'Ring / disc', fr: 'Bague / disque' }, dims: [['D', { en: 'Outside Ø D', fr: 'Ø extérieur D' }], ['d', { en: 'Bore d (0 = disc)', fr: 'Alésage d (0 = disque)' }], ['h', { en: 'Thickness h', fr: 'Épaisseur h' }]] }
  ];
  var DEF_DIMS = { d: 50, D: 60, L: 1000, a: 100, b: 10, s: 30, h: 20 };

  function renderMaterials(root) {
    var P = 'materials';
    var shape = st(P, 'shape', 'round');
    var dims = st(P, 'dims', DEF_DIMS);
    var mat = st(P, 'mat', 'steel');
    var rho = st(P, 'rho', 7.85);
    var qty = st(P, 'qty', 1);
    var sh = SHAPES.filter(function (s) { return s.value === shape; })[0] || SHAPES[0];
    for (var k in DEF_DIMS) if (dims[k] == null) dims[k] = DEF_DIMS[k];

    root.appendChild(TH.pageHead({
      title: { en: 'Materials & blank weight', fr: 'Matériaux et masse du brut' },
      std: [TH.t('Typical densities', 'Masses volumiques usuelles')],
      lede: {
        en: 'Mass of a bar, tube, plate or ring from its dimensions and the material density. Pick a material or type your own density.',
        fr: 'Masse d’un rond, tube, plat ou bague à partir de ses dimensions et de la masse volumique. Choisir un matériau ou saisir sa propre masse volumique.'
      }
    }));

    var out = live();
    var tbl = h('div');
    var rhoField;
    var matOptions = A.MATERIAL_GROUPS.map(function (g) {
      return { group: g, options: A.MATERIALS.filter(function (m) { return m.g === g.id; }).map(function (m) { return { value: m.id, label: m }; }) };
    });
    matOptions.push({ value: 'custom', label: { en: 'Custom density', fr: 'Masse volumique libre' } });

    root.appendChild(TH.card({ en: 'Blank weight calculator', fr: 'Calcul de la masse du brut' }, [
      TH.row(TH.seg({
        label: { en: 'Shape', fr: 'Forme' }, value: shape, options: SHAPES,
        onInput: function (v) { put(P, 'shape', v); rebuild(root, renderMaterials); }
      })),
      TH.row.apply(null, sh.dims.map(function (dm) {
        return TH.field({
          label: dm[1], type: 'number', value: dims[dm[0]], unit: 'mm', width: 'sm',
          onInput: function (v) { dims[dm[0]] = v; put(P, 'dims', dims); update(); }
        });
      }).concat([TH.field({
        label: { en: 'Quantity', fr: 'Quantité' }, type: 'number', value: qty, width: 'sm',
        onInput: function (v) { qty = v; put(P, 'qty', v); update(); }
      })])),
      TH.row(
        TH.field({
          label: { en: 'Material', fr: 'Matériau' }, type: 'select', value: mat, width: 'lg', options: matOptions,
          onInput: function (v) {
            mat = v; put(P, 'mat', v);
            var m = A.MATERIALS.filter(function (x) { return x.id === v; })[0];
            if (m) { rho = m.rho; put(P, 'rho', rho); rhoField.querySelector('input').value = TH.num(rho, 3); rhoField.querySelector('input').setAttribute('aria-invalid', 'false'); }
            update();
          }
        }),
        (rhoField = TH.field({
          label: { en: 'Density', fr: 'Masse volumique' }, type: 'number', value: TH.num(rho, 3), unit: 'g/cm³', width: 'md',
          onInput: function (v) {
            rho = v; put(P, 'rho', v);
            var m = A.MATERIALS.filter(function (x) { return x.id === mat; })[0];
            if (m && v !== m.rho) { mat = 'custom'; put(P, 'mat', mat); rhoField.parentNode.querySelector('select').value = 'custom'; }
            update();
          }
        }))),
      out
    ]));
    root.appendChild(tbl);
    root.appendChild(TH.note({
      en: 'Densities are typical room-temperature values (g/cm³ = kg/dm³); actual values vary with grade, temper and supplier. Bar stock is usually supplied with a size tolerance — weigh or use the supplier’s data for costing.',
      fr: 'Masses volumiques usuelles à température ambiante (g/cm³ = kg/dm³) ; les valeurs réelles varient selon la nuance, l’état et le fournisseur. Les barres sont livrées avec une tolérance dimensionnelle : peser ou utiliser les données du fournisseur pour un chiffrage.'
    }));

    function update() {
      TH.clear(out);
      var p = {};
      sh.dims.forEach(function (dm) { p[dm[0]] = TH.parse(dims[dm[0]]); });
      var r = A.blank(shape, p, TH.parse(rho));
      var q = TH.parse(qty);
      if (r.error) {
        out.appendChild(bad(r.error === 'inner'
          ? { en: 'The inside diameter must be smaller than the outside diameter.', fr: 'Le diamètre intérieur doit être inférieur au diamètre extérieur.' }
          : r.error === 'rho' ? { en: 'Enter a positive density.', fr: 'Saisir une masse volumique positive.' } : MSG_NUM));
      } else {
        var total = isFinite(q) && q > 0 ? r.mass * q : null;
        out.appendChild(TH.kv([
          [{ en: 'Mass (one part)', fr: 'Masse (une pièce)' }, sig(r.mass, 5) + ' kg', null, 'primary'],
          total != null && q !== 1 ? [{ en: 'Total mass × ' + TH.num(q, 0), fr: 'Masse totale × ' + TH.num(q, 0) }, sig(total, 5) + ' kg', null, 'primary'] : null,
          r.kgPerM != null ? [{ en: 'Mass per metre', fr: 'Masse linéique' }, sig(r.kgPerM, 5) + ' kg/m'] : null,
          [{ en: 'Section area', fr: 'Section' }, sig(r.area, 5) + ' mm²'],
          [{ en: 'Volume', fr: 'Volume' }, sig(r.volume / 1000, 5) + ' cm³']
        ]));
      }
      TH.clear(tbl);
      var rows = [], hl = -1;
      A.MATERIAL_GROUPS.forEach(function (g) {
        A.MATERIALS.filter(function (m) { return m.g === g.id; }).forEach(function (m) {
          if (m.id === mat) hl = rows.length;
          rows.push([TH.t(m), TH.t(g), TH.num(m.rho, 2), TH.num(m.rho * 1000, 0)]);
        });
      });
      tbl.appendChild(TH.card({ en: 'Densities of common materials', fr: 'Masses volumiques des matériaux courants' }, TH.table({
        cols: [{ label: { en: 'Material', fr: 'Matériau' } }, { label: { en: 'Family', fr: 'Famille' } },
          { label: 'g/cm³', num: true }, { label: 'kg/m³', num: true }],
        rows: rows, rowHead: true, compact: true, hlRow: hl >= 0 ? hl : null, hlCell: hl >= 0 ? [hl, 2] : null
      })));
      TH.revealHit(tbl);
    }
    update();
  }

  TH.register({
    id: 'materials', group: 'appendix', order: 40,
    title: { en: 'Materials & blank weight', fr: 'Matériaux et masse du brut' },
    short: { en: 'Materials & weight', fr: 'Matériaux et masse' },
    keywords: 'density weight mass blank bar tube plate hexagon steel aluminium brass plastic masse volumique poids brut rond tube plat acier aluminium laiton plastique',
    render: renderMaterials
  });

  /* =====================================================================
     5. Unit converter
     ===================================================================== */
  var CATS = [
    { value: 'length', label: { en: 'Length', fr: 'Longueur' } },
    { value: 'force', label: { en: 'Force', fr: 'Force' } },
    { value: 'torque', label: { en: 'Torque', fr: 'Couple' } },
    { value: 'pressure', label: { en: 'Pressure / stress', fr: 'Pression / contrainte' } },
    { value: 'mass', label: { en: 'Mass', fr: 'Masse' } },
    { value: 'speed', label: { en: 'Cutting speed / feed rate', fr: 'Vitesse de coupe / d’avance' } },
    { value: 'angle', label: { en: 'Angle', fr: 'Angle' } },
    { value: 'temperature', label: { en: 'Temperature', fr: 'Température' } }
  ];
  var UNIT_NAMES = {
    'µm': { en: 'micrometre', fr: 'micromètre' }, 'mm': { en: 'millimetre', fr: 'millimètre' }, 'cm': { en: 'centimetre', fr: 'centimètre' },
    'm': { en: 'metre', fr: 'mètre' }, 'in': { en: 'inch', fr: 'pouce' }, 'thou': { en: 'thou / mil (0.001 in)', fr: 'millième de pouce' },
    'ft': { en: 'foot', fr: 'pied' }, 'N': { en: 'newton', fr: 'newton' }, 'daN': { en: 'decanewton', fr: 'décanewton' },
    'kN': { en: 'kilonewton', fr: 'kilonewton' }, 'kgf': { en: 'kilogram-force', fr: 'kilogramme-force' }, 'lbf': { en: 'pound-force', fr: 'livre-force' },
    'kg': { en: 'kilogram', fr: 'kilogramme' }, 'g': { en: 'gram', fr: 'gramme' }, 't': { en: 'tonne', fr: 'tonne' },
    'lb': { en: 'pound', fr: 'livre' }, 'oz': { en: 'ounce', fr: 'once' }, '°': { en: 'degree', fr: 'degré' },
    '′': { en: 'arc minute', fr: 'minute d’arc' }, '″': { en: 'arc second', fr: 'seconde d’arc' }, 'rad': { en: 'radian', fr: 'radian' },
    'mrad': { en: 'milliradian', fr: 'milliradian' }, 'gon': { en: 'gon (grade)', fr: 'grade (gon)' }, 'rev': { en: 'revolution', fr: 'tour' },
    'atm': { en: 'standard atmosphere', fr: 'atmosphère normale' }, 'psi': { en: 'pound per square inch', fr: 'livre par pouce carré' },
    'ksi': { en: '1000 psi', fr: '1000 psi' }, 'bar': { en: 'bar', fr: 'bar' },
    'N·m': { en: 'newton metre', fr: 'newton-mètre' }, 'N·cm': { en: 'newton centimetre', fr: 'newton-centimètre' },
    'kgf·m': { en: 'kilogram-force metre', fr: 'kilogramme-force mètre' }, 'kgf·cm': { en: 'kilogram-force centimetre', fr: 'kilogramme-force centimètre' },
    'lbf·ft': { en: 'pound-force foot', fr: 'livre-force pied' }, 'lbf·in': { en: 'pound-force inch', fr: 'livre-force pouce' },
    'ozf·in': { en: 'ounce-force inch', fr: 'once-force pouce' },
    'MPa': { en: 'megapascal', fr: 'mégapascal' }, 'N/mm²': { en: 'newton per mm²', fr: 'newton par mm²' },
    'kPa': { en: 'kilopascal', fr: 'kilopascal' }, 'Pa': { en: 'pascal', fr: 'pascal' }, 'GPa': { en: 'gigapascal', fr: 'gigapascal' },
    'kgf/cm²': { en: 'kilogram-force per cm²', fr: 'kilogramme-force par cm²' }, 'kgf/mm²': { en: 'kilogram-force per mm²', fr: 'kilogramme-force par mm²' },
    'm/min': { en: 'metres per minute', fr: 'mètres par minute' }, 'm/s': { en: 'metres per second', fr: 'mètres par seconde' },
    'mm/s': { en: 'millimetres per second', fr: 'millimètres par seconde' }, 'mm/min': { en: 'millimetres per minute', fr: 'millimètres par minute' },
    'ft/min': { en: 'feet per minute (SFM)', fr: 'pieds par minute (SFM)' }, 'in/min': { en: 'inches per minute (IPM)', fr: 'pouces par minute (IPM)' },
    '°C': { en: 'degree Celsius', fr: 'degré Celsius' }, '°F': { en: 'degree Fahrenheit', fr: 'degré Fahrenheit' }, 'K': { en: 'kelvin', fr: 'kelvin' }
  };

  function renderUnits(root) {
    var P = 'units';
    var cat = st(P, 'cat', 'length');
    var units = cat === 'temperature' ? A.TEMP_UNITS : A.UNITS[cat].u.map(function (u) { return u[0]; });
    var from = st(P, 'from.' + cat, units[0]);
    if (units.indexOf(from) < 0) from = units[0];
    var val = st(P, 'val', 1);

    root.appendChild(TH.pageHead({
      title: { en: 'Unit converter', fr: 'Conversion d’unités' },
      std: ['SI', 'ISO 80000'],
      lede: {
        en: 'Convert workshop units: length, force, torque, pressure and stress, mass, cutting speed, angle and temperature. Factors are exact where the unit is defined exactly (inch, pound, kgf).',
        fr: 'Convertir les unités d’atelier : longueur, force, couple, pression et contrainte, masse, vitesse de coupe, angle et température. Les facteurs sont exacts lorsque l’unité est définie exactement (pouce, livre, kgf).'
      }
    }));
    var out = live();
    root.appendChild(TH.card({ en: 'Converter', fr: 'Convertisseur' }, [
      TH.row(
        TH.field({
          label: { en: 'Quantity', fr: 'Grandeur' }, type: 'select', value: cat, options: CATS, width: 'md',
          onInput: function (v) { put(P, 'cat', v); rebuild(root, renderUnits); }
        }),
        TH.field({ label: { en: 'Value', fr: 'Valeur' }, type: 'number', value: val, width: 'md', onInput: function (v) { val = v; put(P, 'val', isFinite(v) ? v : val); update(); } }),
        TH.field({
          label: { en: 'From unit', fr: 'Unité de départ' }, type: 'select', value: from, width: 'sm', options: units,
          onInput: function (v) { from = v; put(P, 'from.' + cat, v); update(); }
        })),
      out
    ]));

    function update() {
      TH.clear(out);
      var rows = A.convert(cat, TH.parse(val), from);
      if (!rows) { out.appendChild(bad({ en: 'Enter a number.', fr: 'Saisir un nombre.' })); return; }
      var hl = -1;
      out.appendChild(TH.table({
        cols: [{ label: { en: 'Unit', fr: 'Unité' } }, { label: { en: 'Name', fr: 'Nom' } }, { label: { en: 'Value', fr: 'Valeur' }, num: true }],
        rows: rows.map(function (r, i) {
          if (r.unit === from) hl = i;
          return [r.unit, UNIT_NAMES[r.unit] ? TH.t(UNIT_NAMES[r.unit]) : (cat === 'temperature' ? TH.t('temperature', 'température') : r.unit), sig(r.value, 7)];
        }),
        rowHead: true, hlRow: hl
      }));
    }
    update();

    // Fractional inch table with nearest-fraction finder.
    var fr = A.fractions();
    var mm = st(P, 'fracmm', 6.35);
    var fout = live();
    var ftbl = h('div');
    root.appendChild(TH.card({ en: 'Fractional inches ↔ millimetres', fr: 'Fractions de pouce ↔ millimètres' }, [
      TH.row(TH.field({
        label: { en: 'Millimetres', fr: 'Millimètres' }, type: 'number', value: mm, unit: 'mm', width: 'md',
        help: { en: 'Finds the nearest 1/64"', fr: 'Cherche le 1/64" le plus proche' },
        onInput: function (v) { mm = v; put(P, 'fracmm', isFinite(v) ? v : mm); upd2(); }
      })),
      fout, ftbl
    ]));
    function upd2() {
      TH.clear(fout); TH.clear(ftbl);
      var v = TH.parse(mm), hl = -1;
      if (isFinite(v) && v > 0) {
        var inch = v / 25.4, whole = Math.floor(inch + 1e-9), rem = inch - whole;
        var n = Math.round(rem * 64), wholeAdj = whole;
        if (n === 64) { wholeAdj += 1; n = 0; }
        var lbl = n === 0 ? '' : fr[n - 1].label.replace('"', '');
        var label = (wholeAdj ? wholeAdj + (lbl ? ' ' : '') : '') + (lbl || (wholeAdj ? '' : '0')) + '"';
        var err = v - (wholeAdj + n / 64) * 25.4;
        fout.appendChild(TH.kv([
          [{ en: 'Decimal inch', fr: 'Pouce décimal' }, TH.num(inch, 4) + '"', null, 'primary'],
          [{ en: 'Nearest 1/64"', fr: '1/64" le plus proche' }, label, null, 'primary'],
          [{ en: 'Difference', fr: 'Écart' }, (err > 0 ? '+' : err < 0 ? '−' : '') + TH.num(Math.abs(err), 3) + ' mm']
        ]));
        if (whole === 0 && n > 0) hl = n - 1;
      } else fout.appendChild(bad(MSG_NUM));
      ftbl.appendChild(TH.table({
        cols: [{ label: { en: 'Fraction', fr: 'Fraction' } }, { label: { en: 'Decimal inch', fr: 'Pouce décimal' }, num: true }, { label: 'mm', num: true }],
        rows: fr.map(function (f) { return [f.label, TH.num(f.inch, 6, true), TH.num(f.mm, 4, true)]; }),
        rowHead: true, compact: true, hlRow: hl >= 0 ? hl : null, hlCell: hl >= 0 ? [hl, 2] : null
      }));
      TH.revealHit(ftbl);
    }
    upd2();
    root.appendChild(TH.note({
      en: 'Exact definitions: 1 in = 25.4 mm, 1 lb = 0.453 592 37 kg, 1 kgf = 9.806 65 N. Hardness scales (HB/HV/HRC) are not converted here: such conversions are only approximate and material-dependent (ISO 18265).',
      fr: 'Définitions exactes : 1 in = 25,4 mm, 1 lb = 0,453 592 37 kg, 1 kgf = 9,806 65 N. Les échelles de dureté (HB/HV/HRC) ne sont pas converties ici : ces conversions ne sont qu’approximatives et dépendent du matériau (ISO 18265).'
    }));
  }

  TH.register({
    id: 'units', group: 'appendix', order: 50,
    title: { en: 'Unit converter', fr: 'Conversion d’unités' },
    short: { en: 'Units', fr: 'Unités' },
    keywords: 'unit converter inch mm fraction force torque pressure psi bar mpa lbf kgf temperature angle conversion unités pouce couple pression',
    render: renderUnits
  });

  /* =====================================================================
     6. Surface roughness
     ===================================================================== */
  function renderRoughness(root) {
    var P = 'roughness';
    var ra = st(P, 'ra', 1.6);
    root.appendChild(TH.pageHead({
      title: { en: 'Surface roughness', fr: 'Rugosité de surface' },
      std: ['ISO 1302', 'ISO 21920'],
      lede: {
        en: 'Ra in micrometres and microinches, the old ISO 1302 roughness grade numbers N1 to N12, and the Ra usually obtained by each manufacturing process.',
        fr: 'Ra en micromètres et micro-pouces, anciennes classes de rugosité N1 à N12 de l’ISO 1302, et Ra habituellement obtenu par chaque procédé de fabrication.'
      }
    }));
    var out = live();
    var tbls = h('div');
    root.appendChild(TH.card({ en: 'Roughness lookup', fr: 'Recherche de rugosité' }, [
      TH.row(TH.field({
        label: 'Ra', type: 'number', value: ra, unit: 'µm', width: 'md',
        onInput: function (v) { ra = v; put(P, 'ra', isFinite(v) ? v : ra); update(); }
      })),
      out
    ]));
    root.appendChild(tbls);
    root.appendChild(TH.note({
      en: 'N grades are from ISO 1302:1992 (withdrawn; superseded by ISO 1302:2002 and now ISO 21920-1, which no longer use them) but remain common on drawings. Rz is NOT a conversion of Ra — the 4× to 7× band is a rule of thumb for machined surfaces. Process ranges are typical average values; finer or coarser results are possible with special conditions.',
      fr: 'Les classes N viennent de l’ISO 1302:1992 (annulée, remplacée par l’ISO 1302:2002 puis l’ISO 21920-1 qui ne les utilisent plus) mais restent courantes sur les plans. Rz ne se convertit PAS depuis Ra : la plage 4× à 7× est un ordre de grandeur pour les surfaces usinées. Les plages par procédé sont des valeurs moyennes usuelles ; des résultats plus fins ou plus grossiers sont possibles dans des conditions particulières.'
    }));

    function update() {
      TH.clear(out); TH.clear(tbls);
      var v = TH.parse(ra);
      var g = A.nGrade(v);
      if (!g) out.appendChild(bad(MSG_NUM));
      else {
        out.appendChild(TH.kv([
          [{ en: 'Nearest grade', fr: 'Classe la plus proche' }, g.n, { en: 'Ra ' + TH.num(g.ra) + ' µm', fr: 'Ra ' + TH.num(g.ra) + ' µm' }, 'primary'],
          [{ en: 'Ra in microinches', fr: 'Ra en micro-pouces' }, sig(v / 0.0254, 4) + ' µin'],
          [{ en: 'Rz (rough guide only)', fr: 'Rz (ordre de grandeur)' }, '≈ ' + sig(4 * v, 3) + '–' + sig(7 * v, 3) + ' µm']
        ]));
        var ps = A.processesFor(v);
        out.appendChild(h('p', null, h('strong', { text: TH.t('Processes that typically reach this Ra: ', 'Procédés qui atteignent habituellement ce Ra : ') }),
          ps.length ? ps.map(function (p) { return TH.t(p); }).join(', ') : TH.t('none in the table', 'aucun dans le tableau')));
      }
      var gi = g ? A.NGRADES.indexOf(g) : -1;
      tbls.appendChild(TH.card({ en: 'Roughness grades — ISO 1302', fr: 'Classes de rugosité — ISO 1302' }, TH.table({
        cols: [{ label: { en: 'Grade', fr: 'Classe' } }, { label: 'Ra (µm)', num: true }, { label: 'Ra (µin)', num: true }],
        rows: A.NGRADES.map(function (n) { return [n.n, TH.num(n.ra, 3), TH.num(n.uin, 0)]; }),
        rowHead: true, compact: true, hlRow: gi >= 0 ? gi : null, hlCell: gi >= 0 ? [gi, 1] : null
      }), { class: 'ap-narrow' }));
      tbls.appendChild(TH.card({ en: 'Typical Ra by process (µm)', fr: 'Ra usuel par procédé (µm)' }, processChart(gi)));
      TH.revealHit(tbls);
    }
    update();
  }

  // Classic range chart: one row per process, one column per N grade (coarse → fine).
  function processChart(gi) {
    var grades = A.NGRADES.slice().reverse();
    var hitCol = gi >= 0 ? grades.indexOf(A.NGRADES[gi]) + 1 : null;
    var rows = A.PROCESSES.map(function (p) {
      return [TH.t(p) + ' — ' + TH.num(p.lo) + '…' + TH.num(p.hi)].concat(grades.map(function (g) {
        var on = g.ra >= p.lo - 1e-9 && g.ra <= p.hi + 1e-9;
        return { text: on ? '■' : '', cls: on ? 'ap-rng' : '' };
      }));
    });
    var t = TH.table({
      cols: [{ label: { en: 'Process — Ra range', fr: 'Procédé — plage de Ra' } }].concat(grades.map(function (g) { return { label: g.n, cls: 'ap-gcol' }; })),
      rows: rows, rowHead: true, compact: true, hlCol: hitCol
    });
    t.classList.add('ap-chart');
    t.setAttribute('aria-label', TH.t('Typical Ra range per process; filled cells mark the grades the process reaches.', 'Plage de Ra usuelle par procédé ; les cases pleines indiquent les classes atteintes.'));
    var legend = h('p', { class: 'help', text: TH.t('■ = grade typically reached by the process.', '■ = classe habituellement atteinte par le procédé.') });
    return [t, legend];
  }

  TH.register({
    id: 'roughness', group: 'appendix', order: 60,
    title: { en: 'Surface roughness', fr: 'Rugosité de surface' },
    short: { en: 'Roughness', fr: 'Rugosité' },
    keywords: 'surface roughness ra rz n grade iso 1302 finish machining process rugosité état de surface classe usinage',
    render: renderRoughness
  });
})(window.TH);
