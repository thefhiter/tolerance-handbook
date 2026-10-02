/* Machine elements pages: keys, pins, bearings, chains & belts, gears. */
(function (TH) {
  'use strict';
  var E = TH.engine.elements;
  var h = TH.h, t = TH.t, num = TH.num;

  /* ---------- shared helpers ---------- */
  // ISO 286 limit deviations for a class like 'N9', 'JS9', 'k5' (µm) — null if the ISO 286 engine is absent.
  function iso(cls, size) {
    var m = /^([A-Za-z]{1,2})(\d{1,2})$/.exec(cls);
    if (!m || !TH.engine.iso286 || !TH.engine.iso286.deviation) return null;
    try {
      var r = TH.engine.iso286.deviation(size, m[1], +m[2]);
      return r && isFinite(r.upper) && isFinite(r.lower) ? r : null;
    } catch (e) { return null; }
  }
  function devPair(cls, size) {
    var r = iso(cls, size);
    return r ? TH.devmm(r.upper) + ' / ' + TH.devmm(r.lower) : '—';
  }
  // TH.table cells accept {text, cls}; translate bare {en, fr} cells first.
  function table(o) {
    o.rows = o.rows.map(function (r) {
      return r.map(function (c) { return c && typeof c === 'object' && c.text === undefined && c.en != null ? t(c) : c; });
    });
    return TH.table(o);
  }
  function mm(x, dec) { return num(x, dec == null ? 3 : dec) + ' mm'; }

  // Numeric input bound to TH.store; calls cb on each valid change.
  function numField(key, def, label, unit, cb, help) {
    var v = TH.store.get(key, def);
    return TH.field({
      label: label, type: 'number', value: v, unit: unit, width: 'sm', help: help,
      onInput: function (x) { if (isFinite(x)) TH.store.set(key, x); cb(isFinite(x) ? x : NaN); }
    });
  }
  function selField(key, def, label, options, cb, width) {
    return TH.field({
      label: label, type: 'select', value: TH.store.get(key, def), options: options, width: width || 'md',
      onInput: function (x) { TH.store.set(key, x); cb(x); }
    });
  }
  function bad(msg) { return TH.note(msg || { en: 'Enter a valid value within the tabulated range.', fr: 'Saisissez une valeur valide dans la plage du tableau.' }, 'warn'); }
  function sourceNote(text) { return TH.note(text, 'info'); }
  // Fit summary between a hole (upper/lower µm) and a shaft (upper/lower µm).
  function fitSummary(hole, shaft) {
    var maxCl = hole.upper - shaft.lower, minCl = hole.lower - shaft.upper;
    var type = minCl >= 0 ? { en: 'Clearance fit', fr: 'Ajustement avec jeu' }
      : maxCl <= 0 ? { en: 'Interference fit', fr: 'Ajustement serré' }
        : { en: 'Transition fit', fr: 'Ajustement incertain' };
    return { maxCl: maxCl, minCl: minCl, type: type };
  }
  function clearanceLabel(um) {
    return um >= 0 ? t('clearance ', 'jeu ') + TH.devum(um).replace('+', '') + ' µm'
      : t('interference ', 'serrage ') + TH.devum(-um).replace('+', '') + ' µm';
  }
  // Human-readable range of a fit, e.g. "interference 2 – 21 µm" or "clearance 3 µm / interference 8 µm".
  function fitRange(f) {
    var a = Math.abs(f.minCl), b = Math.abs(f.maxCl);
    if (f.minCl >= 0) return t('clearance ', 'jeu ') + num(a, 1) + ' – ' + num(b, 1) + ' µm';
    if (f.maxCl <= 0) return t('interference ', 'serrage ') + num(b, 1) + ' – ' + num(a, 1) + ' µm';
    return t('clearance ', 'jeu ') + num(b, 1) + ' µm / ' + t('interference ', 'serrage ') + num(a, 1) + ' µm';
  }
  function needIso() {
    return TH.engine.iso286 ? null : TH.note({ en: 'ISO 286 limits are unavailable (fits engine not loaded).', fr: 'Écarts ISO 286 indisponibles (moteur d’ajustements non chargé).' }, 'warn');
  }

  /* =====================================================================
     KEYS
     ===================================================================== */
  TH.register({
    id: 'keys', group: 'elements', order: 10,
    title: { en: 'Parallel keys & keyways', fr: 'Clavettes parallèles et rainures' },
    short: { en: 'Keys & keyways', fr: 'Clavettes' },
    keywords: 'key keyway parallel shaft hub feather DIN 6885 ISO 773 clavette rainure moyeu arbre clavetage',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Parallel keys & keyways', fr: 'Clavettes parallèles et rainures de clavette' },
        std: ['DIN 6885-1', 'ISO/R 773', 'GB/T 1095'],
        lede: { en: 'Pick the key section for a shaft diameter, with keyway depths and width tolerances for the chosen fit.',
          fr: 'Section de clavette selon le diamètre d’arbre, profondeurs de rainure et tolérances de largeur selon l’ajustement choisi.' }
      }));
      var out = h('div');
      var tableBox = h('div');
      var d = TH.store.get('keys.d', 40), fitId = TH.store.get('keys.fit', 'normal');
      root.appendChild(TH.card({ en: 'Key for a shaft', fr: 'Clavette pour un arbre' }, [
        TH.row(
          numField('keys.d', 40, { en: 'Shaft diameter d', fr: 'Diamètre d’arbre d' }, 'mm', function (x) { d = x; update(); }),
          selField('keys.fit', 'normal', { en: 'Fit', fr: 'Ajustement' },
            E.keyFits.map(function (f) { return { value: f.id, label: { en: f.en, fr: f.fr } }; }), function (x) { fitId = x; update(); }, 'lg')),
        out
      ]));
      root.appendChild(TH.card({ en: 'Key sizes (DIN 6885-1, form A/B/C)', fr: 'Dimensions des clavettes (DIN 6885-1, formes A/B/C)' }, tableBox));
      root.appendChild(sourceNote({
        en: 'Source: DIN 6885-1 / ISO/R 773 (same b × h, t1, t2 as GB/T 1095-2003). Shaft-diameter ranges are guidance: the key may be chosen for torque. Keyway radius per GB/T 1095. Key width b is h9 (GB/T 1096: h8); height h is h11 (square keys h9). Check the current edition before release.',
        fr: 'Source : DIN 6885-1 / ISO/R 773 (mêmes b × h, t1, t2 que GB/T 1095-2003). Les plages de diamètre sont indicatives : la clavette peut être choisie selon le couple. Rayon de fond selon GB/T 1095. Largeur b de la clavette en h9 (GB/T 1096 : h8) ; hauteur h en h11 (clavettes carrées h9). Vérifiez l’édition en vigueur.'
      }));

      function update() {
        TH.clear(out);
        var i = E.keyForShaft(d);
        if (i < 0) {
          out.appendChild(bad({ en: 'Shaft diameter must be over 6 mm and up to 500 mm.', fr: 'Le diamètre d’arbre doit être compris entre plus de 6 mm et 500 mm.' }));
        } else {
          var k = E.keys[i], tol = E.keyDepthTol(k.b), r = E.keyRadius(k.b);
          var fit = E.keyFits.filter(function (f) { return f.id === fitId; })[0] || E.keyFits[1];
          out.appendChild(TH.kv([
            [{ en: 'Key b × h', fr: 'Clavette b × h' }, num(k.b) + ' × ' + num(k.h), { en: 'mm', fr: 'mm' }, 'primary'],
            [{ en: 'Shaft keyway depth t1', fr: 'Profondeur rainure arbre t1' }, num(k.t1) + ' +' + num(tol), 'd − t1 = ' + num(d - k.t1, 2) + ' mm'],
            [{ en: 'Hub keyway depth t2', fr: 'Profondeur rainure moyeu t2' }, num(k.t2) + ' +' + num(tol), 'd + t2 = ' + num(d + k.t2, 2) + ' mm'],
            [{ en: 'Keyway radius r', fr: 'Rayon de fond r' }, num(r[0], 2) + ' – ' + num(r[1], 2), 'mm'],
            [{ en: 'Shaft keyway width', fr: 'Largeur rainure arbre' }, k.b + ' ' + fit.shaft, devPair(fit.shaft, k.b)],
            [{ en: 'Hub keyway width', fr: 'Largeur rainure moyeu' }, k.b + ' ' + fit.hub, devPair(fit.hub, k.b)],
            [{ en: 'Key width', fr: 'Largeur clavette' }, k.b + ' h9', devPair('h9', k.b)],
            [{ en: 'Key height', fr: 'Hauteur clavette' }, k.h + (k.b === k.h ? ' h9' : ' h11'), devPair(k.b === k.h ? 'h9' : 'h11', k.h)]
          ]));
          var miss = needIso(); if (miss) out.appendChild(miss);
        }
        TH.clear(tableBox);
        tableBox.appendChild(table({
          cols: [{ label: { en: 'Shaft d over – to', fr: 'Arbre d de – à' } }, { label: 'b × h' },
            { label: 't1', num: true, dec: 1 }, { label: 't2', num: true, dec: 1 },
            { label: { en: 't1, t2 tol.', fr: 'Tol. t1, t2' }, num: true, dec: 1 },
            { label: { en: 'r min – max', fr: 'r min – max' }, num: true }],
          rows: E.keys.map(function (k) {
            var rr = E.keyRadius(k.b);
            return [num(k.dOver) + ' – ' + num(k.dTo), num(k.b) + ' × ' + num(k.h), k.t1, k.t2, '+' + num(E.keyDepthTol(k.b)),
              num(rr[0], 2) + ' – ' + num(rr[1], 2)];
          }),
          hlRow: i >= 0 ? i : null, rowHead: true
        }));
        TH.revealHit(tableBox);
      }
      update();
    }
  });

  /* =====================================================================
     PINS
     ===================================================================== */
  TH.register({
    id: 'pins', group: 'elements', order: 20,
    title: { en: 'Dowel, taper & spring pins', fr: 'Goupilles cylindriques, coniques et élastiques' },
    short: { en: 'Pins', fr: 'Goupilles' },
    keywords: 'pin dowel taper spring roll ISO 2338 8734 2339 8752 13337 goupille cylindrique conique élastique pion de centrage',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Dowel, taper & spring pins', fr: 'Goupilles cylindriques, coniques et élastiques' },
        std: ['ISO 2338', 'ISO 8734', 'ISO 2339', 'ISO 8752', 'ISO 13337'],
        lede: { en: 'Pin tolerances, matching hole tolerances, and the resulting fit for a dowel pin.',
          fr: 'Tolérances des goupilles, tolérances de perçage associées et ajustement obtenu pour une goupille de positionnement.' }
      }));
      root.appendChild(TH.card({ en: 'Pin types', fr: 'Types de goupilles' }, table({
        cols: [{ label: { en: 'Standard', fr: 'Norme' } }, { label: { en: 'Type', fr: 'Type' } }, { label: { en: 'd range (mm)', fr: 'Plage d (mm)' } },
          { label: { en: 'Pin tolerance', fr: 'Tolérance goupille' } }, { label: { en: 'Hole', fr: 'Trou' } }],
        rows: E.pinTypes.map(function (p) {
          return [p.std, { en: p.en, fr: p.fr }, TH.lang === 'fr' ? p.range : p.range.replace(/,/g, '.'), p.pin, p.hole];
        }),
        rowHead: true
      })));

      var out = h('div');
      var d = TH.store.get('pins.d', '6'), pinTol = TH.store.get('pins.pin', 'm6'), holeTol = TH.store.get('pins.hole', 'H7');
      root.appendChild(TH.card({ en: 'Dowel pin fit', fr: 'Ajustement d’une goupille cylindrique' }, [
        TH.row(
          selField('pins.d', '6', { en: 'Nominal d', fr: 'd nominal' }, E.pins2338.map(function (p) { return { value: String(p.d), label: num(p.d) + ' mm' }; }),
            function (x) { d = x; update(); }, 'sm'),
          TH.seg({ label: { en: 'Pin', fr: 'Goupille' }, value: pinTol, options: [{ value: 'm6', label: 'm6' }, { value: 'h8', label: 'h8' }],
            onInput: function (x) { pinTol = x; TH.store.set('pins.pin', x); update(); } }),
          TH.seg({ label: { en: 'Hole', fr: 'Trou' }, value: holeTol, options: ['H7', 'H8', 'G7', 'F7', 'M7', 'N7'].map(function (x) { return { value: x, label: x }; }),
            onInput: function (x) { holeTol = x; TH.store.set('pins.hole', x); update(); } })),
        out
      ]));

      var c2338 = E.pins2338;
      var hit = h('div');
      root.appendChild(TH.card({ en: 'ISO 2338 / ISO 8734 sizes', fr: 'Dimensions ISO 2338 / ISO 8734' }, hit));
      root.appendChild(sourceNote({
        en: 'Source: ISO 2338 (m6 or h8, d 0.6–50), ISO 8734 (hardened, m6, d 1–20), ISO 2339 (taper 1:50, d h10), ISO 8752 / ISO 13337 (spring pins, hole H12). Typical practice: m6 pin pressed into an H7 hole; use a slip fit (e.g. F7/G7) on the side that must come apart. Lengths per the standard and supplier catalogues.',
        fr: 'Source : ISO 2338 (m6 ou h8, d 0,6–50), ISO 8734 (trempée, m6, d 1–20), ISO 2339 (conicité 1:50, d en h10), ISO 8752 / ISO 13337 (goupilles élastiques, trou H12). Pratique courante : goupille m6 emmanchée dans un trou H7 ; ajustement glissant (p. ex. F7/G7) côté démontable. Longueurs selon la norme et les catalogues fournisseurs.'
      }));

      function update() {
        TH.clear(out);
        var size = parseFloat(d);
        var pin = iso(pinTol, size), hole = iso(holeTol, size);
        if (!pin || !hole) {
          out.appendChild(needIso() || bad({ en: 'No ISO 286 data for this size / class.', fr: 'Pas de données ISO 286 pour cette dimension / classe.' }));
        } else {
          var f = fitSummary(hole, pin);
          out.appendChild(TH.kv([
            [{ en: 'Pin', fr: 'Goupille' }, num(size) + ' ' + pinTol, TH.devmm(pin.upper) + ' / ' + TH.devmm(pin.lower)],
            [{ en: 'Hole', fr: 'Trou' }, num(size) + ' ' + holeTol, TH.devmm(hole.upper) + ' / ' + TH.devmm(hole.lower)],
            [{ en: 'Fit', fr: 'Ajustement' }, t(f.type), null, 'primary text'],
            [{ en: 'Max. clearance', fr: 'Jeu maxi' }, TH.devum(f.maxCl) + ' µm', clearanceLabel(f.maxCl), f.maxCl >= 0 ? 'pos' : 'neg'],
            [{ en: 'Min. clearance', fr: 'Jeu mini' }, TH.devum(f.minCl) + ' µm', clearanceLabel(f.minCl), f.minCl >= 0 ? 'pos' : 'neg']
          ]));
        }
        TH.clear(hit);
        var idx = -1;
        c2338.forEach(function (p, i) { if (String(p.d) === String(d)) idx = i; });
        hit.appendChild(table({
          cols: [{ label: 'd (mm)', num: true }, { label: { en: 'Chamfer c ≈', fr: 'Chanfrein c ≈' }, num: true },
            { label: 'ISO 2338' }, { label: 'ISO 8734' }],
          rows: c2338.map(function (p) {
            return [p.d, p.c, 'm6 / h8', E.pins8734.indexOf(p.d) >= 0 ? 'm6' : '—'];
          }),
          hlRow: idx >= 0 ? idx : null, compact: true
        }));
        TH.revealHit(hit);
      }
      update();
    }
  });

  /* =====================================================================
     BEARINGS
     ===================================================================== */
  TH.register({
    id: 'bearings', group: 'elements', order: 30,
    title: { en: 'Rolling bearing tolerances & fits', fr: 'Tolérances et ajustements des roulements' },
    short: { en: 'Bearings', fr: 'Roulements' },
    keywords: 'bearing ball deep groove 6205 6000 6200 6300 ISO 492 shaft housing fit roulement bague intérieure extérieure logement arbre',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Rolling bearing tolerances & fits', fr: 'Tolérances et ajustements des roulements' },
        std: ['ISO 492', 'ISO 15'],
        lede: { en: 'Bore and outside diameter deviations (normal class), deep-groove ball bearing dimensions, and the resulting shaft / housing fits.',
          fr: 'Écarts d’alésage et de diamètre extérieur (classe normale), dimensions des roulements rigides à billes et ajustements arbre / logement.' }
      }));
      var out = h('div');
      var des = TH.store.get('bearings.des', '6205'), shaftCls = TH.store.get('bearings.shaft', 'k5'), houseCls = TH.store.get('bearings.house', 'H7');
      var shaftOpts = ['g6', 'h6', 'h5', 'j5', 'j6', 'js5', 'js6', 'k5', 'k6', 'm5', 'm6', 'n6', 'p6'];
      var houseOpts = ['G7', 'H7', 'H8', 'J7', 'JS7', 'K7', 'M7', 'N7', 'P7'];
      root.appendChild(TH.card({ en: 'Bearing & mounting fit', fr: 'Roulement et ajustement de montage' }, [
        TH.row(
          TH.field({ label: { en: 'Designation (60xx / 62xx / 63xx)', fr: 'Désignation (60xx / 62xx / 63xx)' }, value: des, width: 'md',
            onInput: function (x) { des = x; TH.store.set('bearings.des', x); update(); } }),
          selField('bearings.shaft', 'k5', { en: 'Shaft tolerance', fr: 'Tolérance arbre' }, shaftOpts, function (x) { shaftCls = x; update(); }, 'sm'),
          selField('bearings.house', 'H7', { en: 'Housing tolerance', fr: 'Tolérance logement' }, houseOpts, function (x) { houseCls = x; update(); }, 'sm')),
        out
      ]));
      var tabs = h('div', { class: 'grid-2' });
      root.appendChild(tabs);
      var fitsBox = h('div', { class: 'grid-2' });
      root.appendChild(fitsBox);
      var seriesBox = h('div');
      root.appendChild(TH.card({ en: 'Deep-groove ball bearings — d × D × B (mm)', fr: 'Roulements rigides à billes — d × D × B (mm)' }, seriesBox));
      root.appendChild(sourceNote({
        en: 'Source: ISO 492 normal tolerance class (radial bearings, upper deviation 0); ISO 15 boundary dimensions. Shaft and housing classes are typical catalogue guidance for ball bearings on solid steel shafts in steel or cast-iron housings — always confirm with the bearing manufacturer’s catalogue.',
        fr: 'Source : ISO 492 classe de tolérance normale (roulements radiaux, écart supérieur 0) ; ISO 15 dimensions d’encombrement. Les classes arbre et logement sont des recommandations usuelles des catalogues pour roulements à billes sur arbre plein en acier, logement acier ou fonte — confirmez toujours avec le catalogue du fabricant.'
      }));

      // Static tables (with highlight from current bearing)
      function renderTables(b) {
        TH.clear(tabs);
        var ii = b ? E.bearingInner(b.d) : null, oo = b && b.D ? E.bearingOuter(b.D) : null;
        var I = E.bearingTables.inner, O = E.bearingTables.outer;
        tabs.appendChild(TH.card({ en: 'Inner ring — Δdmp (µm)', fr: 'Bague intérieure — Δdmp (µm)' }, table({
          cols: [{ label: { en: 'd over – to (mm)', fr: 'd de – à (mm)' } }, { label: { en: 'Upper', fr: 'Sup.' }, num: true }, { label: { en: 'Lower', fr: 'Inf.' }, num: true }],
          rows: I.bounds.map(function (bd, i) { return [num(i ? I.bounds[i - 1] : I.from) + ' – ' + num(bd), '0', TH.devum(I.lower[i])]; }),
          hlRow: ii ? ii.index : null, compact: true
        })));
        tabs.appendChild(TH.card({ en: 'Outer ring — ΔDmp (µm)', fr: 'Bague extérieure — ΔDmp (µm)' }, table({
          cols: [{ label: { en: 'D over – to (mm)', fr: 'D de – à (mm)' } }, { label: { en: 'Upper', fr: 'Sup.' }, num: true }, { label: { en: 'Lower', fr: 'Inf.' }, num: true }],
          rows: O.bounds.map(function (bd, i) { return [num(i ? O.bounds[i - 1] : O.from) + ' – ' + num(bd), '0', TH.devum(O.lower[i])]; }),
          hlRow: oo ? oo.index : null, compact: true
        })));
        TH.clear(fitsBox);
        var srows = [];
        E.shaftFits.forEach(function (g) { g.rows.forEach(function (r, j) { srows.push([j ? '' : g.cond, r[0], r[1]]); }); });
        fitsBox.appendChild(TH.card({ en: 'Recommended shaft tolerances (ball bearings)', fr: 'Tolérances d’arbre recommandées (roulements à billes)' }, table({
          cols: [{ label: { en: 'Condition', fr: 'Condition' } }, { label: { en: 'Shaft Ø (mm)', fr: 'Ø arbre (mm)' } }, { label: { en: 'Class', fr: 'Classe' } }],
          rows: srows, compact: true
        })));
        fitsBox.appendChild(TH.card({ en: 'Recommended housing tolerances', fr: 'Tolérances de logement recommandées' }, table({
          cols: [{ label: { en: 'Condition', fr: 'Condition' } }, { label: { en: 'Class', fr: 'Classe' } }],
          rows: E.housingFits.map(function (f) { return [f.cond, f.fit]; }), compact: true
        })));
        TH.clear(seriesBox);
        var codes = Object.keys(E.dgbb['62']);
        var hr = b && b.D ? codes.indexOf(b.code) : -1;
        var hc = b && b.D ? ['60', '62', '63'].indexOf(b.series) + 1 : null;
        seriesBox.appendChild(table({
          cols: [{ label: { en: 'Bore code', fr: 'Code alésage' } }, { label: '60xx', num: true }, { label: '62xx', num: true }, { label: '63xx', num: true }],
          rows: codes.map(function (c) {
            return [c].concat(['60', '62', '63'].map(function (s) { var r = E.dgbb[s][c]; return num(r[0]) + ' × ' + num(r[1]) + ' × ' + num(r[2]); }));
          }),
          hlRow: hr >= 0 ? hr : null, hlCell: hr >= 0 ? [hr, hc] : null, rowHead: true, compact: true
        }));
      }

      function update() {
        TH.clear(out);
        var b = E.bearing(des);
        if (!b || !b.D) {
          out.appendChild(bad(b ? { en: 'Bore ' + b.d + ' mm — dimensions for this size are not tabulated here (6000–6320).', fr: 'Alésage ' + b.d + ' mm — dimensions non tabulées ici (6000–6320).' }
            : { en: 'Enter a deep-groove ball bearing designation such as 6205, 6004-2RS or 6310.', fr: 'Saisissez une désignation de roulement rigide à billes, p. ex. 6205, 6004-2RS ou 6310.' }));
          renderTables(null);
          TH.revealHit(root);
          return;
        }
        var ii = E.bearingInner(b.d), oo = E.bearingOuter(b.D);
        var items = [
          [{ en: 'd × D × B', fr: 'd × D × B' }, num(b.d) + ' × ' + num(b.D) + ' × ' + num(b.B), 'mm', 'primary'],
          [{ en: 'Bore Δdmp', fr: 'Alésage Δdmp' }, '0 / ' + TH.devum(ii.lower) + ' µm', { en: 'normal class', fr: 'classe normale' }],
          [{ en: 'Outside Ø ΔDmp', fr: 'Ø extérieur ΔDmp' }, '0 / ' + TH.devum(oo.lower) + ' µm', { en: 'normal class', fr: 'classe normale' }]
        ];
        var sh = iso(shaftCls, b.d), ho = iso(houseCls, b.D);
        if (sh) {
          // Inner ring is the "hole" (bore 0 / lower), the shaft is the shaft.
          var fi = fitSummary({ upper: 0, lower: ii.lower }, sh);
          items.push([{ en: 'Shaft ' + shaftCls, fr: 'Arbre ' + shaftCls }, TH.devmm(sh.upper) + ' / ' + TH.devmm(sh.lower), 'mm']);
          items.push([{ en: 'Inner ring fit', fr: 'Ajustement bague intérieure' }, t(fi.type), fitRange(fi), 'text']);
        }
        if (ho) {
          var fo = fitSummary(ho, { upper: 0, lower: oo.lower });
          items.push([{ en: 'Housing ' + houseCls, fr: 'Logement ' + houseCls }, TH.devmm(ho.upper) + ' / ' + TH.devmm(ho.lower), 'mm']);
          items.push([{ en: 'Outer ring fit', fr: 'Ajustement bague extérieure' }, t(fo.type), fitRange(fo), 'text']);
        }
        out.appendChild(TH.kv(items));
        var miss = needIso(); if (miss) out.appendChild(miss);
        renderTables(b);
        TH.revealHit(seriesBox);
      }
      update();
    }
  });

  /* =====================================================================
     CHAINS & BELTS
     ===================================================================== */
  TH.register({
    id: 'chains-belts', group: 'elements', order: 40,
    title: { en: 'Roller chains, sprockets & V-belts', fr: 'Chaînes à rouleaux, pignons et courroies trapézoïdales' },
    short: { en: 'Chains & belts', fr: 'Chaînes et courroies' },
    keywords: 'chain roller sprocket ISO 606 08B 10A V-belt SPZ SPA SPB SPC pulley chaîne à rouleaux pignon roue dentée courroie trapézoïdale poulie',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Roller chains, sprockets & V-belts', fr: 'Chaînes à rouleaux, pignons et courroies trapézoïdales' },
        std: ['ISO 606', 'ISO 4184', 'ISO 4183'],
        lede: { en: 'Chain dimensions and breaking loads, sprocket diameters for any tooth count, and V-belt section sizes.',
          fr: 'Dimensions et charges de rupture des chaînes, diamètres des pignons pour tout nombre de dents et sections de courroies trapézoïdales.' }
      }));
      var out = h('div'), chainBox = h('div');
      var chain = TH.store.get('chains.id', '08B'), z = TH.store.get('chains.z', 17);
      root.appendChild(TH.card({ en: 'Sprocket geometry', fr: 'Géométrie du pignon' }, [
        TH.row(
          selField('chains.id', '08B', { en: 'Chain', fr: 'Chaîne' }, [
            { group: { en: 'European (B series)', fr: 'Européenne (série B)' }, options: E.chains.filter(function (c) { return !c.ansi; }).map(function (c) { return { value: c.iso, label: c.iso + ' — ' + num(c.p) + ' mm' }; }) },
            { group: { en: 'American (A series)', fr: 'Américaine (série A)' }, options: E.chains.filter(function (c) { return c.ansi; }).map(function (c) { return { value: c.iso, label: c.iso + ' (ANSI ' + c.ansi + ') — ' + num(c.p) + ' mm' }; }) }
          ], function (x) { chain = x; update(); }),
          numField('chains.z', 17, { en: 'Number of teeth z', fr: 'Nombre de dents z' }, null, function (x) { z = x; update(); })),
        out
      ]));
      root.appendChild(TH.card({ en: 'Roller chains — simplex (ISO 606)', fr: 'Chaînes à rouleaux — simples (ISO 606)' }, chainBox));
      root.appendChild(TH.card({ en: 'V-belt sections (mm)', fr: 'Sections de courroies trapézoïdales (mm)' }, [
        table({
          cols: [{ label: { en: 'Section', fr: 'Section' } }, { label: { en: 'Type', fr: 'Type' } },
            { label: { en: 'Top width', fr: 'Largeur sup.' }, num: true, dec: 1 }, { label: { en: 'Height', fr: 'Hauteur' }, num: true, dec: 1 },
            { label: { en: 'Datum width', fr: 'Largeur primitive' }, num: true, dec: 1 },
            { label: { en: 'Groove 34° up to datum Ø', fr: 'Gorge 34° jusqu’au Ø primitif' }, num: true, dec: 0 },
            { label: { en: 'Groove 38° above', fr: 'Gorge 38° au-delà' } }],
          rows: E.vbelts.map(function (v) {
            return [v.section, v.narrow ? { en: 'Narrow', fr: 'Étroite' } : { en: 'Classical', fr: 'Classique' }, v.top, v.h, v.wd, v.groove34, '> ' + num(v.groove34)];
          }), rowHead: true, compact: true
        })
      ]));
      root.appendChild(sourceNote({
        en: 'Source: ISO 606 (simplex roller chains; breaking loads are minimum values, ISO 606:2004 figures), sprocket formulas from ISO 606; V-belts ISO 4184 sections and ISO 4183 groove angles. Use the chain maker’s catalogue for working loads and the current edition of the standards.',
        fr: 'Source : ISO 606 (chaînes simples ; charges de rupture minimales, valeurs ISO 606:2004), formules de pignon selon ISO 606 ; courroies ISO 4184 (sections) et ISO 4183 (angles de gorge). Utilisez le catalogue du fabricant pour les charges de service et l’édition en vigueur des normes.'
      }));

      function update() {
        TH.clear(out);
        var idx = -1;
        E.chains.forEach(function (c, i) { if (c.iso === chain) idx = i; });
        var c = E.chains[idx >= 0 ? idx : 0];
        var s = E.sprocket(c.p, z, c.d1);
        if (!s) out.appendChild(bad({ en: 'Number of teeth must be a whole number of at least 5.', fr: 'Le nombre de dents doit être un entier d’au moins 5.' }));
        else {
          out.appendChild(TH.kv([
            [{ en: 'Pitch diameter d', fr: 'Diamètre primitif d' }, mm(s.d), 'p / sin(180°/z)', 'primary'],
            [{ en: 'Root diameter df', fr: 'Diamètre de pied df' }, mm(s.df), 'd − d1'],
            [{ en: 'Tip diameter da', fr: 'Diamètre de tête da' }, num(s.daMin, 2) + ' – ' + num(s.daMax, 2), { en: 'min – max (mm)', fr: 'mini – maxi (mm)' }],
            [{ en: 'Measuring dimension', fr: 'Cote de contrôle' }, mm(s.caliper), z % 2 ? { en: 'odd z: d·cos(90°/z) − d1', fr: 'z impair : d·cos(90°/z) − d1' } : { en: 'even z: over roots', fr: 'z pair : sur fonds de dents' }],
            [{ en: 'Roller seating Ø min', fr: 'Ø de logement rouleau mini' }, mm(s.dRmin), TH.lang === 'fr' ? '1,005·d1 + 0,10' : '1.005·d1 + 0.10'],
            [{ en: 'Chain', fr: 'Chaîne' }, c.iso, num(c.p) + ' mm, d1 ' + num(c.d1) + ' mm']
          ]));
        }
        TH.clear(chainBox);
        chainBox.appendChild(table({
          cols: [{ label: 'ISO' }, { label: 'ANSI' }, { label: { en: 'Pitch p', fr: 'Pas p' }, num: true }, { label: { en: 'Inner width b1 min', fr: 'Largeur int. b1 mini' }, num: true },
            { label: { en: 'Roller d1 max', fr: 'Rouleau d1 maxi' }, num: true }, { label: { en: 'Pin d2 max', fr: 'Axe d2 maxi' }, num: true },
            { label: { en: 'Breaking load min (kN)', fr: 'Charge de rupture mini (kN)' }, num: true, dec: 1 }],
          rows: E.chains.map(function (x) { return [x.iso, x.ansi || '—', x.p, x.b1, x.d1, x.d2, x.fu]; }),
          hlRow: idx >= 0 ? idx : null, rowHead: true, compact: true
        }));
        TH.revealHit(chainBox);
      }
      update();
    }
  });

  /* =====================================================================
     GEARS
     ===================================================================== */
  TH.register({
    id: 'gears', group: 'elements', order: 50,
    title: { en: 'Spur, helical & worm gears', fr: 'Engrenages droits, hélicoïdaux et roue et vis sans fin' },
    short: { en: 'Gears', fr: 'Engrenages' },
    keywords: 'gear spur helical module profile shift span base tangent worm wheel ISO 54 DIN 780 engrenage module denture déport entraxe vis sans fin roue cote sur k dents',
    render: function (root) {
      root.appendChild(TH.pageHead({
        title: { en: 'Spur, helical & worm gears', fr: 'Engrenages droits, hélicoïdaux et roue et vis sans fin' },
        std: ['ISO 53', 'ISO 54', 'ISO 21771', 'DIN 3975'],
        lede: { en: 'Gear and gear-pair geometry with profile shift, span measurement over k teeth, and worm drive dimensions.',
          fr: 'Géométrie des roues et des engrenages avec déport, cote sur k dents et dimensions d’un couple roue et vis sans fin.' }
      }));

      var G = {
        mn: TH.store.get('gears.mn', 2), z1: TH.store.get('gears.z1', 20), z2: TH.store.get('gears.z2', 40),
        an: TH.store.get('gears.an', 20), beta: TH.store.get('gears.beta', 0), x1: TH.store.get('gears.x1', 0), x2: TH.store.get('gears.x2', 0)
      };
      function gf(key, label, unit, help) {
        return numField('gears.' + key, G[key], label, unit, function (x) { G[key] = x; updateGear(); }, help);
      }
      var gOut = h('div');
      root.appendChild(TH.card({ en: 'Cylindrical gear pair', fr: 'Engrenage cylindrique' }, [
        TH.row(
          gf('mn', { en: 'Normal module mn', fr: 'Module réel mn' }, 'mm'),
          gf('an', { en: 'Pressure angle αn', fr: 'Angle de pression αn' }, '°'),
          gf('beta', { en: 'Helix angle β', fr: 'Angle d’hélice β' }, '°', { en: '0 = spur', fr: '0 = denture droite' })),
        TH.row(
          gf('z1', { en: 'Pinion teeth z1', fr: 'Dents pignon z1' }),
          gf('x1', { en: 'Shift x1', fr: 'Déport x1' }),
          gf('z2', { en: 'Wheel teeth z2', fr: 'Dents roue z2' }),
          gf('x2', { en: 'Shift x2', fr: 'Déport x2' })),
        gOut
      ]));

      var W = {
        mx: TH.store.get('worm.mx', 4), z1: TH.store.get('worm.z1', 2), q: TH.store.get('worm.q', 10),
        z2: TH.store.get('worm.z2', 40), x2: TH.store.get('worm.x2', 0)
      };
      function wf(key, label, unit) { return numField('worm.' + key, W[key], label, unit, function (x) { W[key] = x; updateWorm(); }); }
      var wOut = h('div');
      root.appendChild(TH.card({ en: 'Worm & wormwheel', fr: 'Vis sans fin et roue' }, [
        TH.row(
          wf('mx', { en: 'Axial module mx', fr: 'Module axial mx' }, 'mm'),
          wf('z1', { en: 'Worm starts z1', fr: 'Filets z1' }),
          wf('q', { en: 'Diameter factor q', fr: 'Coefficient diamétral q' }),
          wf('z2', { en: 'Wheel teeth z2', fr: 'Dents roue z2' }),
          wf('x2', { en: 'Wheel shift x2', fr: 'Déport roue x2' })),
        wOut
      ]));

      root.appendChild(TH.card({ en: 'Standard modules (ISO 54)', fr: 'Modules normalisés (ISO 54)' }, [
        table({
          cols: [{ label: { en: 'Series', fr: 'Série' } }, { label: { en: 'Modules (mm)', fr: 'Modules (mm)' } }],
          rows: [[{ en: 'I (preferred)', fr: 'I (à privilégier)' }, E.modulesI.map(function (m) { return num(m); }).join('  ·  ')],
            ['II', E.modulesII.map(function (m) { return num(m); }).join('  ·  ')]],
          rowHead: true
        })
      ]));
      root.appendChild(sourceNote({
        en: 'Basic rack ISO 53 (ha* = 1, c* = 0.25, external gears); geometry per ISO 21771 / DIN 3960; span Wk measured in the normal plane (helical gears need face width b > Wk·sin βb). Worm proportions ha* = 1, c* = 0.2 (DIN 3975). Tip shortening, backlash allowances and accuracy grades (ISO 1328) are not applied.',
        fr: 'Crémaillère de référence ISO 53 (ha* = 1, c* = 0,25, dentures extérieures) ; géométrie selon ISO 21771 / DIN 3960 ; cote Wk mesurée dans le plan réel (en hélicoïdal, largeur b > Wk·sin βb). Vis sans fin : ha* = 1, c* = 0,2 (DIN 3975). Réduction de tête, jeu de fonctionnement et classes de qualité (ISO 1328) non pris en compte.'
      }));

      function gearCols() {
        return [{ label: '' }, { label: { en: 'Pinion', fr: 'Pignon' }, num: true }, { label: { en: 'Wheel', fr: 'Roue' }, num: true }];
      }
      function updateGear() {
        TH.clear(gOut);
        var p = E.gearPair({ mn: G.mn, z: G.z1, alphaN: G.an, beta: G.beta, x: G.x1 }, { mn: G.mn, z: G.z2, alphaN: G.an, beta: G.beta, x: G.x2 });
        if (!p || !isFinite(p.aw)) {
          gOut.appendChild(bad({ en: 'Check the inputs: module > 0, whole numbers of teeth, 0° < αn < 45°, |β| < 80°.', fr: 'Vérifiez les saisies : module > 0, nombres de dents entiers, 0° < αn < 45°, |β| < 80°.' }));
          return;
        }
        var a = p.g1, b = p.g2;
        gOut.appendChild(TH.kv([
          [{ en: 'Centre distance (reference)', fr: 'Entraxe de référence' }, mm(p.a), '(d1 + d2) / 2'],
          [{ en: 'Working centre distance aw', fr: 'Entraxe de fonctionnement aw' }, mm(p.aw), { en: 'with profile shift', fr: 'avec déport' }, 'primary'],
          [{ en: 'Working pressure angle', fr: 'Angle de pression de fonctionnement' }, num(p.alphaWt, 4) + '°', 'αwt'],
          [{ en: 'Ratio', fr: 'Rapport' }, num(p.ratio, 4), 'z2 / z1'],
          [{ en: 'Transverse contact ratio', fr: 'Rapport de conduite' }, num(p.epsAlpha, 3), 'εα', p.epsAlpha < 1.2 ? 'neg' : null]
        ]));
        var rows = [
          [{ en: 'Transverse module mt', fr: 'Module apparent mt' }, a.mt, b.mt],
          [{ en: 'Transverse pressure angle αt (°)', fr: 'Angle de pression apparent αt (°)' }, a.alphaT, b.alphaT],
          [{ en: 'Reference diameter d', fr: 'Diamètre primitif d' }, a.d, b.d],
          [{ en: 'Base diameter db', fr: 'Diamètre de base db' }, a.db, b.db],
          [{ en: 'Tip diameter da', fr: 'Diamètre de tête da' }, a.da, b.da],
          [{ en: 'Root diameter df', fr: 'Diamètre de pied df' }, a.df, b.df],
          [{ en: 'Addendum ha', fr: 'Saillie ha' }, a.ha, b.ha],
          [{ en: 'Dedendum hf', fr: 'Creux hf' }, a.hf, b.hf],
          [{ en: 'Normal tooth thickness sn', fr: 'Épaisseur réelle de dent sn' }, a.sn, b.sn],
          [{ en: 'Span over k teeth: k', fr: 'Cote sur k dents : k' }, String(a.k), String(b.k)],
          [{ en: 'Base tangent length Wk', fr: 'Cote sur k dents Wk' }, a.Wk, b.Wk],
          [{ en: 'Normal pitch pn', fr: 'Pas réel pn' }, a.pn, b.pn],
          [{ en: 'Base helix angle βb (°)', fr: 'Angle d’hélice de base βb (°)' }, a.betaB, b.betaB]
        ];
        gOut.appendChild(h('h3', { text: t('Gear data (mm)', 'Caractéristiques des roues (mm)') }));
        gOut.appendChild(table({ cols: gearCols(), rows: rows, rowHead: true, compact: true }));
        var warn = [];
        var xMin = (a.zMinUndercut - G.z1) / a.zMinUndercut;
        if (G.x1 < xMin - 1e-9)
          warn.push(t('Pinion may undercut: with z1 = ' + G.z1 + ' use a profile shift x1 ≥ ' + num(xMin, 2) + ' (theoretical limit z ≈ ' + num(a.zMinUndercut, 1) + ' for x = 0).',
            'Risque d’interférence de taillage : avec z1 = ' + G.z1 + ', prévoir un déport x1 ≥ ' + num(xMin, 2) + ' (limite théorique z ≈ ' + num(a.zMinUndercut, 1) + ' pour x = 0).'));
        if (warn.length) gOut.appendChild(TH.note(warn.join(' '), 'warn'));
      }
      function updateWorm() {
        TH.clear(wOut);
        var w = E.worm({ mx: W.mx, z1: W.z1, q: W.q, z2: W.z2, x2: W.x2 });
        if (!w) { wOut.appendChild(bad({ en: 'Check the inputs: mx > 0, q > 0, whole numbers of starts and teeth.', fr: 'Vérifiez les saisies : mx > 0, q > 0, nombres de filets et de dents entiers.' })); return; }
        wOut.appendChild(TH.kv([
          [{ en: 'Centre distance a', fr: 'Entraxe a' }, mm(w.a), null, 'primary'],
          [{ en: 'Ratio', fr: 'Rapport' }, num(w.ratio, 3), 'z2 / z1'],
          [{ en: 'Lead angle γ', fr: 'Angle d’hélice γ' }, num(w.gamma, 4) + '°', 'atan(z1 / q)'],
          [{ en: 'Lead pz', fr: 'Pas de l’hélice pz' }, mm(w.pz), 'π·mx·z1'],
          [{ en: 'Normal module mn', fr: 'Module réel mn' }, mm(w.mn, 4), 'mx·cos γ']
        ]));
        wOut.appendChild(table({
          cols: [{ label: '' }, { label: { en: 'Worm', fr: 'Vis' }, num: true }, { label: { en: 'Wheel', fr: 'Roue' }, num: true }],
          rows: [
            [{ en: 'Reference diameter (mm)', fr: 'Diamètre primitif (mm)' }, w.d1, w.d2],
            [{ en: 'Tip diameter (mm)', fr: 'Diamètre de tête (mm)' }, w.da1, w.da2],
            [{ en: 'Root diameter (mm)', fr: 'Diamètre de pied (mm)' }, w.df1, w.df2],
            [{ en: 'Axial pitch px (mm)', fr: 'Pas axial px (mm)' }, w.px, '—']
          ], rowHead: true, compact: true
        }));
      }
      updateGear();
      updateWorm();
    }
  });
})(window.TH);
