/* Pages: general tolerances (ISO 2768), geometric tolerance grades, castings & welded structures. */
(function (TH) {
  'use strict';
  var G = TH.engine.general;
  var t = TH.t, h = TH.h;

  /* ---------- shared helpers ---------- */
  function lbl(bounds, i, lower) {
    var a = i === 0 ? lower : bounds[i - 1], b = bounds[i];
    if (b === Infinity) return '> ' + TH.num(a);
    if (i === 0 && !lower) return '≤ ' + TH.num(b);
    return TH.num(a) + ' – ' + TH.num(b);
  }
  function pm(v, dec) { return v == null ? '—' : '±' + TH.num(v, dec == null ? 3 : dec); }
  function numField(page, key, def, label, opts) {
    opts = opts || {};
    var v = TH.store.get(page + '.' + key, def);
    return {
      value: v,
      el: TH.field({
        label: label, type: 'number', value: v, unit: opts.unit || 'mm', width: opts.width || 'md', help: opts.help,
        onInput: function (x) { TH.store.set(page + '.' + key, isFinite(x) ? x : ''); opts.onChange(x); }
      })
    };
  }
  function msg(r, rangeText) {
    if (r.reason === 'na') return t('Not specified by the standard for this size.', 'Non défini par la norme pour cette dimension.');
    return t('Outside the tabulated range', 'Hors du domaine tabulé') + (rangeText ? ' (' + rangeText + ')' : '') + '.';
  }
  function stdNote(text) {
    return TH.note({
      en: text.en + ' Values reproduced for quick reference — check the current edition of the standard for contractual use.',
      fr: text.fr + ' Valeurs reproduites pour consultation rapide — vérifiez l’édition en vigueur de la norme pour tout usage contractuel.'
    });
  }
  var MM = { en: 'mm', fr: 'mm' };
  var SIZE_RANGE = { en: 'Nominal size (mm)', fr: 'Dimension nominale (mm)' };

  /* =====================================================================
     ISO 2768 — general tolerances
     ===================================================================== */
  var CLS1 = ['f', 'm', 'c', 'v'], CLS2 = ['H', 'K', 'L'];

  function renderGeneral(root) {
    var P = 'general-tol';
    var st = {
      size: TH.store.get(P + '.size', 50),
      side: TH.store.get(P + '.side', 50),
      c1: TH.store.get(P + '.c1', 'm'),
      c2: TH.store.get(P + '.c2', 'K')
    };
    root.appendChild(TH.pageHead({
      title: { en: 'General tolerances', fr: 'Tolérances générales' },
      std: ['ISO 2768-1', 'ISO 2768-2', 'NF EN 22768'],
      lede: {
        en: 'Tolerances that apply to every dimension and feature without an individual tolerance, when the title block says e.g. “ISO 2768-mK”.',
        fr: 'Tolérances applicables à toutes les cotes et éléments sans tolérance individuelle, lorsque le cartouche indique par ex. « ISO 2768-mK ».'
      }
    }));

    var res = h('div'), tables = h('div', { class: 'stack' });
    function upd() { st.size = TH.parse(st.size); st.side = TH.parse(st.side); drawResult(); drawTables(); TH.revealHit(root); }

    var fSize = numField(P, 'size', st.size, { en: 'Nominal size', fr: 'Dimension nominale' }, {
      help: { en: 'Linear size, radius, chamfer, feature length', fr: 'Cote linéaire, rayon, chanfrein, longueur d’élément' },
      onChange: function (x) { st.size = x; upd(); }
    });
    var fSide = numField(P, 'side', st.side, { en: 'Shorter side', fr: 'Côté le plus court' }, {
      help: { en: 'For angles and perpendicularity', fr: 'Pour les angles et la perpendicularité' },
      onChange: function (x) { st.side = x; upd(); }
    });
    var segs = TH.row(
      TH.seg({ label: { en: 'Class (ISO 2768-1)', fr: 'Classe (ISO 2768-1)' }, value: st.c1,
        options: CLS1.map(function (c) { return { value: c, label: c }; }),
        onInput: function (v) { st.c1 = v; TH.store.set(P + '.c1', v); upd(); } }),
      TH.seg({ label: { en: 'Class (ISO 2768-2)', fr: 'Classe (ISO 2768-2)' }, value: st.c2,
        options: CLS2.map(function (c) { return { value: c, label: c }; }),
        onInput: function (v) { st.c2 = v; TH.store.set(P + '.c2', v); upd(); } })
    );
    root.appendChild(TH.card({ en: 'Calculator', fr: 'Calculateur' }, [TH.row(fSize.el, fSide.el), segs, res]));
    root.appendChild(tables);

    function drawResult() {
      TH.clear(res);
      var s = st.size, d = st.side, c1 = st.c1, c2 = st.c2;
      var lin = G.linear(c1, s), edg = G.edge(c1, s), ang = G.angular(c1, d);
      var fl = G.straightnessFlatness(c2, s), pe = G.perpendicularity(c2, d), sy = G.symmetry(c2, s), ru = G.runout(c2);
      res.appendChild(h('p', { class: 'big-result', text: 'ISO 2768-' + c1 + c2 }));
      res.appendChild(TH.kv([
        [{ en: 'Linear size', fr: 'Cote linéaire' }, lin.ok ? pm(lin.value) : '—', lin.ok ? MM : msg(lin, TH.num(0.5) + ' – 4000 mm'), 'primary'],
        [{ en: 'Radius / chamfer', fr: 'Rayon / chanfrein' }, edg.ok ? pm(edg.value) : '—', edg.ok ? MM : msg(edg, '≥ ' + TH.num(0.5) + ' mm')],
        [{ en: 'Angle', fr: 'Angle' }, ang.ok ? G.angleText(ang.minutes) : '—',
          ang.ok ? { en: 'shorter side ' + lbl(G.ISO2768_1.angular.bounds, ang.i, 0) + ' mm', fr: 'côté court ' + lbl(G.ISO2768_1.angular.bounds, ang.i, 0) + ' mm' } : msg(ang)],
        [{ en: 'Straightness / flatness', fr: 'Rectitude / planéité' }, fl.ok ? TH.num(fl.value) : '—', fl.ok ? MM : msg(fl, '≤ 3000')],
        [{ en: 'Perpendicularity', fr: 'Perpendicularité' }, pe.ok ? TH.num(pe.value) : '—', pe.ok ? { en: 'mm (shorter side)', fr: 'mm (côté court)' } : msg(pe, '≤ 3000')],
        [{ en: 'Symmetry', fr: 'Symétrie' }, sy.ok ? TH.num(sy.value) : '—', sy.ok ? MM : msg(sy, '≤ 3000')],
        [{ en: 'Circular runout', fr: 'Battement circulaire' }, TH.num(ru.value), MM]
      ]));
      if (!(s > 0) || !(d > 0)) res.appendChild(TH.note({ en: 'Enter positive sizes in millimetres.', fr: 'Saisissez des dimensions positives en millimètres.' }, 'warn'));
      else if (s < 0.5) res.appendChild(TH.note({
        en: 'Below 0.5 mm ISO 2768-1 gives no general tolerance: indicate the deviation next to the nominal size.',
        fr: 'En dessous de 0,5 mm, l’ISO 2768-1 ne donne pas de tolérance générale : indiquer l’écart à côté de la cote nominale.'
      }, 'warn'));
    }

    function drawTables() {
      TH.clear(tables);
      var L = G.ISO2768_1.linear, E = G.ISO2768_1.edges, A = G.ISO2768_1.angular;
      var c1i = CLS1.indexOf(st.c1) + 1, c2i = CLS2.indexOf(st.c2) + 1;
      var cols1 = [{ label: SIZE_RANGE }].concat(CLS1.map(function (c) { return { label: G.ISO2768_1.classNames[c], num: true }; }));

      var li = G.linear(st.c1, st.size).i, ei = G.edge(st.c1, st.size).i, ai = G.angular(st.c1, st.side).i;
      var t1 = TH.table({
        caption: { en: 'Linear dimensions — permissible deviations ± mm', fr: 'Dimensions linéaires — écarts admissibles ± mm' },
        cols: cols1, rowHead: true, hlRow: li, hlCell: li >= 0 ? [li, c1i] : null, hlCol: c1i,
        rows: L.bounds.map(function (b, i) { return [lbl(L.bounds, i, L.lower)].concat(CLS1.map(function (c) { return pm(L.classes[c][i]); })); })
      });
      var t2 = TH.table({
        caption: { en: 'Broken edges (external radii, chamfer heights) ± mm', fr: 'Arêtes abattues (rayons extérieurs, hauteurs de chanfrein) ± mm' },
        cols: cols1, rowHead: true, hlRow: ei, hlCell: ei >= 0 ? [ei, c1i] : null, hlCol: c1i,
        rows: E.bounds.map(function (b, i) { return [lbl(E.bounds, i, E.lower)].concat(CLS1.map(function (c) { return pm(E.classes[c][i]); })); })
      });
      var t3 = TH.table({
        caption: { en: 'Angular dimensions, by length of the shorter side (mm)', fr: 'Dimensions angulaires, selon la longueur du côté le plus court (mm)' },
        cols: [{ label: { en: 'Shorter side (mm)', fr: 'Côté le plus court (mm)' } }].concat(CLS1.map(function (c) { return { label: G.ISO2768_1.classNames[c], num: true }; })),
        rowHead: true, hlRow: ai, hlCell: ai >= 0 ? [ai, c1i] : null, hlCol: c1i,
        rows: A.bounds.map(function (b, i) { return [lbl(A.bounds, i, 0)].concat(CLS1.map(function (c) { return G.angleText(A.classes[c][i]); })); })
      });
      tables.appendChild(TH.card({ en: 'ISO 2768-1 — linear and angular dimensions', fr: 'ISO 2768-1 — dimensions linéaires et angulaires' },
        h('div', { class: 'stack' }, t1, h('div', { class: 'grid-2' }, t2, t3))));

      var F = G.ISO2768_2.flatness, Pp = G.ISO2768_2.perpendicularity, S = G.ISO2768_2.symmetry;
      var fi = G.straightnessFlatness(st.c2, st.size).i, pi = G.perpendicularity(st.c2, st.side).i, si = G.symmetry(st.c2, st.size).i;
      var cols2 = function (first) { return [{ label: first }].concat(CLS2.map(function (c) { return { label: c, num: true }; })); };
      var t4 = TH.table({
        caption: { en: 'Straightness and flatness (mm)', fr: 'Rectitude et planéité (mm)' },
        cols: cols2({ en: 'Nominal length (mm)', fr: 'Longueur nominale (mm)' }), rowHead: true, hlRow: fi, hlCell: fi >= 0 ? [fi, c2i] : null, hlCol: c2i,
        rows: F.bounds.map(function (b, i) { return [lbl(F.bounds, i, 0)].concat(CLS2.map(function (c) { return TH.num(F.classes[c][i]); })); })
      });
      var t5 = TH.table({
        caption: { en: 'Perpendicularity (mm)', fr: 'Perpendicularité (mm)' },
        cols: cols2({ en: 'Shorter side (mm)', fr: 'Côté le plus court (mm)' }), rowHead: true, hlRow: pi, hlCell: pi >= 0 ? [pi, c2i] : null, hlCol: c2i,
        rows: Pp.bounds.map(function (b, i) { return [lbl(Pp.bounds, i, 0)].concat(CLS2.map(function (c) { return TH.num(Pp.classes[c][i]); })); })
      });
      var t6 = TH.table({
        caption: { en: 'Symmetry (mm)', fr: 'Symétrie (mm)' },
        cols: cols2({ en: 'Nominal length (mm)', fr: 'Longueur nominale (mm)' }), rowHead: true, hlRow: si, hlCell: si >= 0 ? [si, c2i] : null, hlCol: c2i,
        rows: S.bounds.map(function (b, i) { return [lbl(S.bounds, i, 0)].concat(CLS2.map(function (c) { return TH.num(S.classes[c][i]); })); })
      });
      var t7 = TH.table({
        caption: { en: 'Circular runout (mm)', fr: 'Battement circulaire (mm)' },
        cols: [{ label: { en: 'Class', fr: 'Classe' } }, { label: { en: 'Tolerance', fr: 'Tolérance' }, num: true }], rowHead: true,
        hlRow: c2i - 1, hlCell: [c2i - 1, 1],
        rows: CLS2.map(function (c) { return [c, TH.num(G.ISO2768_2.runout[c])]; })
      });
      tables.appendChild(TH.card({ en: 'ISO 2768-2 — geometrical tolerances H / K / L', fr: 'ISO 2768-2 — tolérances géométriques H / K / L' },
        h('div', { class: 'stack' }, h('div', { class: 'grid-2' }, t4, t5), h('div', { class: 'grid-2' }, t6, t7),
          TH.note({
            en: 'Roundness: equal to the diameter tolerance but not more than the circular runout value. Cylindricity, profile, position, inclination: not covered — governed by the size tolerance or an individual tolerance.',
            fr: 'Circularité : égale à la tolérance du diamètre, sans dépasser la valeur du battement circulaire. Cylindricité, profil, localisation, inclinaison : non couverts — régis par la tolérance dimensionnelle ou une tolérance individuelle.'
          }))));
      tables.appendChild(stdNote({
        en: 'Sources: ISO 2768-1:1989 (linear and angular), ISO 2768-2:1989 (geometrical).',
        fr: 'Sources : ISO 2768-1:1989 (linéaires et angulaires), ISO 2768-2:1989 (géométriques).'
      }));
    }
    upd();
  }

  /* =====================================================================
     Geometric tolerance grades
     ===================================================================== */
  var CHARS = [
    { value: 'straightness', label: { en: 'Straightness', fr: 'Rectitude' } },
    { value: 'flatness', label: { en: 'Flatness', fr: 'Planéité' } },
    { value: 'roundness', label: { en: 'Roundness', fr: 'Circularité' } },
    { value: 'cylindricity', label: { en: 'Cylindricity', fr: 'Cylindricité' } },
    { value: 'parallelism', label: { en: 'Parallelism', fr: 'Parallélisme' } },
    { value: 'perpendicularity', label: { en: 'Perpendicularity', fr: 'Perpendicularité' } },
    { value: 'inclination', label: { en: 'Angularity (inclination)', fr: 'Inclinaison' } },
    { value: 'coaxiality', label: { en: 'Coaxiality / concentricity', fr: 'Coaxialité / concentricité' } },
    { value: 'symmetry', label: { en: 'Symmetry', fr: 'Symétrie' } },
    { value: 'circularRunout', label: { en: 'Circular runout', fr: 'Battement circulaire' } },
    { value: 'totalRunout', label: { en: 'Total runout', fr: 'Battement total' } }
  ];
  var TABLE_INFO = {
    flatness: {
      title: { en: 'Straightness and flatness (µm)', fr: 'Rectitude et planéité (µm)' },
      param: { en: 'Main parameter L: length of the line or longer side of the surface (mm)', fr: 'Paramètre principal L : longueur de la ligne ou du plus grand côté de la surface (mm)' },
      dim: { en: 'L (mm)', fr: 'L (mm)' }
    },
    roundness: {
      title: { en: 'Roundness and cylindricity (µm)', fr: 'Circularité et cylindricité (µm)' },
      param: { en: 'Main parameter d (D): diameter of the feature (mm)', fr: 'Paramètre principal d (D) : diamètre de l’élément (mm)' },
      dim: { en: 'd, D (mm)', fr: 'd, D (mm)' }
    },
    parallelism: {
      title: { en: 'Parallelism, perpendicularity, inclination (µm)', fr: 'Parallélisme, perpendicularité, inclinaison (µm)' },
      param: { en: 'Main parameter L, d (D): length of the toleranced feature, or its diameter (mm)', fr: 'Paramètre principal L, d (D) : longueur de l’élément tolérancé ou son diamètre (mm)' },
      dim: { en: 'L, d, D (mm)', fr: 'L, d, D (mm)' }
    },
    coaxiality: {
      title: { en: 'Coaxiality, symmetry, circular and total runout (µm)', fr: 'Coaxialité, symétrie, battements circulaire et total (µm)' },
      param: { en: 'Main parameter d (D), B, L: diameter for coaxiality/runout, width B or length L for symmetry (mm)', fr: 'Paramètre principal d (D), B, L : diamètre pour coaxialité/battement, largeur B ou longueur L pour la symétrie (mm)' },
      dim: { en: 'd, D, B, L (mm)', fr: 'd, D, B, L (mm)' }
    }
  };
  // Typical fields of application by grade band (general guidance).
  function gradeHint(g) {
    if (g <= 2) return { en: 'Gauges, measuring instruments, ultra-precision spindles.', fr: 'Calibres, instruments de mesure, broches d’ultra-précision.' };
    if (g <= 4) return { en: 'Precision machine-tool spindles and guideways, high-precision bearing seats.', fr: 'Broches et glissières de machines-outils de précision, portées de roulements de haute précision.' };
    if (g <= 6) return { en: 'Machine-tool guideways and tables, precise bearing seats, gearbox bores.', fr: 'Glissières et tables de machines-outils, portées de roulements précises, alésages de boîtes de vitesses.' };
    if (g <= 8) return { en: 'General mechanical engineering: normal bearing seats, shafts, housings.', fr: 'Mécanique générale : portées de roulements courantes, arbres, carters.' };
    if (g <= 10) return { en: 'Low-precision parts: agricultural and lifting machinery, covers, flanges.', fr: 'Pièces de faible précision : machines agricoles et de levage, couvercles, brides.' };
    return { en: 'Non-critical or rough-machined surfaces.', fr: 'Surfaces non critiques ou d’ébauche.' };
  }

  function renderGeometric(root) {
    var P = 'geometric';
    var st = {
      ch: TH.store.get(P + '.ch', 'flatness'),
      dim: TH.store.get(P + '.dim', 100),
      grade: TH.store.get(P + '.grade', 7)
    };
    if (!G.CHARACTERISTICS[st.ch]) st.ch = 'flatness';
    root.appendChild(TH.pageHead({
      title: { en: 'Geometric tolerance grades', fr: 'Degrés de tolérances géométriques' },
      std: ['GB/T 1184-1996', 'ISO 1101', 'DIN 7184-1'],
      lede: {
        en: 'Numerical values of form, orientation, location and runout tolerances by tolerance grade and main dimension.',
        fr: 'Valeurs numériques des tolérances de forme, d’orientation, de position et de battement selon le degré de tolérance et la dimension principale.'
      }
    }));
    var res = h('div'), tableArea = h('div'), gradeWrap = h('div');
    function tableKey() { return G.CHARACTERISTICS[st.ch]; }
    function grades() { return G.GEO[tableKey()].grades; }

    function drawGrade() {
      TH.clear(gradeWrap);
      var gs = grades(), g0 = Number(st.grade);
      if (gs.indexOf(g0) < 0) st.grade = isFinite(g0) ? Math.max(gs[0], Math.min(gs[gs.length - 1], g0)) : 7;
      gradeWrap.appendChild(TH.field({
        label: { en: 'Grade', fr: 'Degré' }, type: 'select', value: st.grade, width: 'sm',
        options: grades().map(function (g) { return { value: g, label: String(g) }; }),
        onInput: function (v) { st.grade = Number(v); TH.store.set(P + '.grade', st.grade); upd(); }
      }));
    }
    var chField = TH.field({
      label: { en: 'Characteristic', fr: 'Caractéristique' }, type: 'select', value: st.ch, width: 'lg',
      options: [
        { group: { en: 'Form', fr: 'Forme' }, options: CHARS.slice(0, 4) },
        { group: { en: 'Orientation', fr: 'Orientation' }, options: CHARS.slice(4, 7) },
        { group: { en: 'Location / runout', fr: 'Position / battement' }, options: CHARS.slice(7) }
      ],
      onInput: function (v) { st.ch = v; TH.store.set(P + '.ch', v); drawGrade(); upd(); }
    });
    var dimField = numField(P, 'dim', st.dim, { en: 'Main dimension', fr: 'Dimension principale' }, {
      onChange: function (x) { st.dim = x; upd(); }
    });
    drawGrade();
    root.appendChild(TH.card({ en: 'Calculator', fr: 'Calculateur' }, [TH.row(chField, dimField.el, gradeWrap), res]));
    root.appendChild(tableArea);

    function upd() {
      var dim = TH.parse(st.dim);
      var key = tableKey(), info = TABLE_INFO[key], T = G.GEO[key];
      var r = G.geometric(st.ch, dim, Number(st.grade));
      TH.clear(res);
      var maxB = T.bounds[T.bounds.length - 1];
      res.appendChild(TH.kv([
        [{ en: 'Tolerance', fr: 'Tolérance' }, r.ok ? TH.num(r.um, 2) + ' µm' : '—', r.ok ? null : msg(r, '≤ ' + TH.num(maxB) + ' mm'), 'primary'],
        [{ en: 'In millimetres', fr: 'En millimètres' }, r.ok ? TH.num(r.mm, 4) : '—', MM],
        [{ en: 'Size range', fr: 'Plage de dimensions' }, r.ok ? lbl(T.bounds, r.i, 0) : '—', MM]
      ]));
      res.appendChild(h('p', { class: 'help', text: t(info.param) }));
      res.appendChild(TH.note({
        en: 'Typical use of grade ' + st.grade + ': ' + gradeHint(Number(st.grade)).en,
        fr: 'Emploi typique du degré ' + st.grade + ' : ' + gradeHint(Number(st.grade)).fr
      }));
      TH.clear(tableArea);
      var gi = T.grades.indexOf(Number(st.grade)) + 1;
      tableArea.appendChild(TH.card(info.title, TH.table({
        caption: info.title,
        cols: [{ label: info.dim }].concat(T.grades.map(function (g) { return { label: String(g), num: true }; })),
        rowHead: true, compact: true, hlRow: r.ok ? r.i : null, hlCol: gi, hlCell: r.ok ? [r.i, gi] : null,
        rows: T.bounds.map(function (b, i) { return [lbl(T.bounds, i, 0)].concat(T.values[i].map(function (v) { return TH.num(v, 2); })); })
      })));
      tableArea.appendChild(stdNote({
        en: 'Source: GB/T 1184-1996 Annex B (same numerical series as the former ISO 1101 / DIN 7184-1 tables). Grade 0 exists only for roundness and cylindricity.',
        fr: 'Source : GB/T 1184-1996 annexe B (même série numérique que les anciennes tables ISO 1101 / DIN 7184-1). Le degré 0 n’existe que pour la circularité et la cylindricité.'
      }));
      TH.revealHit(root);
    }
    upd();
  }

  /* =====================================================================
     Castings (ISO 8062-3) and welded structures (ISO 13920)
     ===================================================================== */
  function renderCastWeld(root) {
    var P = 'castings-welds';
    var st = {
      csize: TH.store.get(P + '.csize', 120), dctg: TH.store.get(P + '.dctg', 9),
      wsize: TH.store.get(P + '.wsize', 800), wside: TH.store.get(P + '.wside', 500),
      wlen: TH.store.get(P + '.wlen', 1500),
      wc: TH.store.get(P + '.wc', 'B'), wf: TH.store.get(P + '.wf', 'F')
    };
    root.appendChild(TH.pageHead({
      title: { en: 'Castings and welded structures', fr: 'Pièces moulées et constructions soudées' },
      std: ['ISO 8062-3', 'ISO 13920'],
      lede: {
        en: 'General dimensional tolerances for raw castings (DCTG grades) and for welded assemblies (classes A–D, E–H).',
        fr: 'Tolérances dimensionnelles générales des pièces moulées brutes (degrés DCTG) et des ensembles soudés (classes A–D, E–H).'
      }
    }));

    /* --- castings --- */
    var cres = h('div'), ctab = h('div');
    var cSize = numField(P, 'csize', st.csize, { en: 'Raw casting nominal size', fr: 'Dimension nominale brute de fonderie' }, {
      onChange: function (x) { st.csize = x; updC(); }
    });
    var cGrade = TH.field({
      label: 'DCTG', type: 'select', value: st.dctg, width: 'sm',
      options: G.DCTG.grades.map(function (g) { return { value: g, label: String(g) }; }),
      onInput: function (v) { st.dctg = Number(v); TH.store.set(P + '.dctg', st.dctg); updC(); }
    });
    root.appendChild(TH.card({ en: 'Castings — ISO 8062-3', fr: 'Pièces moulées — ISO 8062-3' }, [TH.row(cSize.el, cGrade), cres, ctab]));

    function updC() {
      var s = TH.parse(st.csize), r = G.casting(s, Number(st.dctg));
      TH.clear(cres);
      cres.appendChild(TH.kv([
        [{ en: 'Total tolerance', fr: 'Tolérance totale' }, r.ok ? TH.num(r.total, 2) : '—', r.ok ? MM : msg(r, '≤ 10 000 mm'), 'primary'],
        [{ en: 'Symmetrical', fr: 'Symétrique' }, r.ok ? pm(r.half, 2) : '—', MM],
        [{ en: 'Drawing callout', fr: 'Indication au dessin' }, 'ISO 8062-3 – DCTG ' + st.dctg, null]
      ]));
      TH.clear(ctab);
      var T = G.DCTG, gi = T.grades.indexOf(Number(st.dctg)) + 1;
      ctab.appendChild(h('h3', { text: t('DCTG total tolerance (mm)', 'Tolérance totale DCTG (mm)') }));
      ctab.appendChild(TH.table({
        caption: { en: 'Total casting tolerance (mm) by raw-casting nominal size', fr: 'Tolérance totale de moulage (mm) selon la dimension nominale brute' },
        cols: [{ label: SIZE_RANGE }].concat(T.grades.map(function (g) { return { label: String(g), num: true }; })),
        rowHead: true, compact: true, hlRow: r.i >= 0 ? r.i : null, hlCol: gi, hlCell: r.ok ? [r.i, gi] : null,
        rows: T.bounds.map(function (b, i) { return [lbl(T.bounds, i, 0)].concat(T.values[i].map(function (v) { return v == null ? '—' : TH.num(v, 2); })); })
      }));
      ctab.appendChild(TH.note({
        en: 'The value is the total tolerance; unless specified otherwise it is placed symmetrically about the nominal size.',
        fr: 'La valeur est la tolérance totale ; sauf indication contraire, elle est répartie symétriquement autour de la cote nominale.'
      }));
      TH.revealHit(root);
    }

    /* --- welded structures --- */
    var wres = h('div'), wtab = h('div', { class: 'stack' });
    var wSize = numField(P, 'wsize', st.wsize, { en: 'Linear dimension', fr: 'Dimension linéaire' }, { onChange: function (x) { st.wsize = x; updW(); } });
    var wSide = numField(P, 'wside', st.wside, { en: 'Shorter side (angles)', fr: 'Côté court (angles)' }, { onChange: function (x) { st.wside = x; updW(); } });
    var wLen = numField(P, 'wlen', st.wlen, { en: 'Length (form)', fr: 'Longueur (forme)' }, {
      help: { en: 'Longer side of the surface', fr: 'Plus grand côté de la surface' },
      onChange: function (x) { st.wlen = x; updW(); }
    });
    var wSegs = TH.row(
      TH.seg({ label: { en: 'Linear & angular class', fr: 'Classe linéaire et angulaire' }, value: st.wc,
        options: ['A', 'B', 'C', 'D'].map(function (c) { return { value: c, label: c }; }),
        onInput: function (v) { st.wc = v; TH.store.set(P + '.wc', v); updW(); } }),
      TH.seg({ label: { en: 'Form class', fr: 'Classe de forme' }, value: st.wf,
        options: ['E', 'F', 'G', 'H'].map(function (c) { return { value: c, label: c }; }),
        onInput: function (v) { st.wf = v; TH.store.set(P + '.wf', v); updW(); } })
    );
    root.appendChild(TH.card({ en: 'Welded structures — ISO 13920', fr: 'Constructions soudées — ISO 13920' }, [TH.row(wSize.el, wSide.el, wLen.el), wSegs, wres, wtab]));

    function updW() {
      var s = TH.parse(st.wsize), sd = TH.parse(st.wside), ln = TH.parse(st.wlen);
      var li = G.weldLinear(st.wc, s), an = G.weldAngular(st.wc, sd), fo = G.weldForm(st.wf, ln);
      TH.clear(wres);
      wres.appendChild(TH.kv([
        [{ en: 'Linear', fr: 'Linéaire' }, li.ok ? pm(li.value, 1) : '—', li.ok ? MM : msg(li, '≥ 2 mm'), 'primary'],
        [{ en: 'Angular', fr: 'Angulaire' }, an.ok ? G.angleText(an.minutes) : '—', an.ok ? { en: pm(an.mmPerM, 1) + ' mm/m', fr: pm(an.mmPerM, 1) + ' mm/m' } : msg(an)],
        [{ en: 'Straightness / flatness / parallelism', fr: 'Rectitude / planéité / parallélisme' }, fo.ok ? TH.num(fo.value, 1) : '—', fo.ok ? MM : msg(fo, '> 30 mm')],
        [{ en: 'Drawing callout', fr: 'Indication au dessin' }, 'ISO 13920-' + st.wc + st.wf, null]
      ]));
      TH.clear(wtab);
      var Lt = G.ISO13920.linear, At = G.ISO13920.angular, Ft = G.ISO13920.form;
      var ci = 'ABCD'.indexOf(st.wc) + 1, fi = 'EFGH'.indexOf(st.wf) + 1;
      wtab.appendChild(TH.table({
        caption: { en: 'Linear dimensions ± mm', fr: 'Dimensions linéaires ± mm' },
        cols: [{ label: SIZE_RANGE }].concat('ABCD'.split('').map(function (c) { return { label: c, num: true }; })),
        rowHead: true, compact: true, hlRow: li.i >= 0 ? li.i : null, hlCol: ci, hlCell: li.ok ? [li.i, ci] : null,
        rows: Lt.bounds.map(function (b, i) { return [lbl(Lt.bounds, i, Lt.lower)].concat('ABCD'.split('').map(function (c) { return pm(Lt.classes[c][i], 1); })); })
      }));
      wtab.appendChild(TH.table({
        caption: { en: 'Angular dimensions, by length of the shorter side', fr: 'Dimensions angulaires, selon la longueur du côté le plus court' },
        cols: [{ label: { en: 'Shorter side (mm)', fr: 'Côté le plus court (mm)' } }].concat('ABCD'.split('').map(function (c) { return { label: c, num: true }; })),
        rowHead: true, compact: true, hlRow: an.ok ? an.i : null, hlCol: ci, hlCell: an.ok ? [an.i, ci] : null,
        rows: At.bounds.map(function (b, i) {
          return [lbl(At.bounds, i, 0)].concat('ABCD'.split('').map(function (c) { return G.angleText(At.minutes[c][i]) + '  (' + pm(At.mmPerM[c][i], 1) + ' mm/m)'; }));
        })
      }));
      wtab.appendChild(TH.table({
        caption: { en: 'Straightness, flatness and parallelism (mm)', fr: 'Rectitude, planéité et parallélisme (mm)' },
        cols: [{ label: { en: 'Length (mm)', fr: 'Longueur (mm)' } }].concat('EFGH'.split('').map(function (c) { return { label: c, num: true }; })),
        rowHead: true, compact: true, hlRow: fo.i >= 0 ? fo.i : null, hlCol: fi, hlCell: fo.ok ? [fo.i, fi] : null,
        rows: Ft.bounds.map(function (b, i) { return [lbl(Ft.bounds, i, Ft.lower)].concat('EFGH'.split('').map(function (c) { return TH.num(Ft.classes[c][i], 1); })); })
      }));
      TH.revealHit(root);
    }
    updC(); updW();
    root.appendChild(stdNote({
      en: 'Sources: ISO 8062-3:2007 (DCTG table, same values as the former ISO 8062 CT grades), ISO 13920:1996 (classes A–D, E–H).',
      fr: 'Sources : ISO 8062-3:2007 (table DCTG, mêmes valeurs que les anciens degrés CT de l’ISO 8062), ISO 13920:1996 (classes A–D, E–H).'
    }));
  }

  TH.register({
    id: 'general-tol', group: 'tolerances', order: 20,
    title: { en: 'General tolerances (ISO 2768)', fr: 'Tolérances générales (ISO 2768)' },
    short: { en: 'General tolerances', fr: 'Tolérances générales' },
    keywords: 'iso 2768 general tolerance untoleranced linear angular chamfer radius flatness perpendicularity symmetry runout mK fine medium coarse tolérances générales cote angulaire chanfrein rayon planéité perpendicularité symétrie battement',
    render: renderGeneral
  });
  TH.register({
    id: 'geometric', group: 'tolerances', order: 30,
    title: { en: 'Geometric tolerance grades', fr: 'Degrés de tolérances géométriques' },
    short: { en: 'Geometric tolerances', fr: 'Tolérances géométriques' },
    keywords: 'geometric gd&t form position straightness flatness roundness cylindricity parallelism perpendicularity angularity coaxiality concentricity symmetry runout grade géométrique forme position rectitude planéité circularité cylindricité parallélisme perpendicularité inclinaison coaxialité symétrie battement degré gb 1184',
    render: renderGeometric
  });
  TH.register({
    id: 'castings-welds', group: 'tolerances', order: 40,
    title: { en: 'Castings & welded structures', fr: 'Pièces moulées et soudées' },
    short: { en: 'Castings & weldments', fr: 'Moulage et soudure' },
    keywords: 'casting foundry dctg ct iso 8062 weld welded structure weldment iso 13920 moulage fonderie pièce moulée soudure construction soudée mécanosoudé',
    render: renderCastWeld
  });
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
