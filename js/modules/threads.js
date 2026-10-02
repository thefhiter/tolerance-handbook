/* Pages: ISO metric threads, metric trapezoidal, Unified inch (UNC/UNF), pipe threads (G / R). */
(function (TH) {
  'use strict';
  var E = TH.engine.threads;
  var t = TH.t, h = TH.h;

  function f3(x) { return x == null ? '—' : TH.num(x, 3, true); }
  function f4(x) { return x == null ? '—' : TH.num(x, 4, true); }
  function mm(x) { return f3(x) + ' mm'; }
  function stdNote(text) {
    return TH.note({
      en: text.en + ' Values reproduced for quick reference — check the current edition of the standard for contractual use.',
      fr: text.fr + ' Valeurs reproduites pour consultation rapide — vérifiez l’édition en vigueur de la norme pour tout usage contractuel.'
    });
  }
  function sel(page, key, def) { return TH.store.get(page + '.' + key, def); }
  function put(page, key, v) { TH.store.set(page + '.' + key, v); }
  function setOptions(select, opts, value) {
    TH.clear(select);
    opts.forEach(function (o) { select.appendChild(h('option', { value: String(o.value), text: t(o.label) })); });
    select.value = String(value);
  }

  var L = {
    diameter: { en: 'Diameter', fr: 'Diamètre' },
    max: { en: 'Max', fr: 'Max' },
    min: { en: 'Min', fr: 'Min' },
    tol: { en: 'Tol. (µm)', fr: 'Tol. (µm)' },
    pitch: { en: 'Pitch', fr: 'Pas' },
    coarse: { en: 'coarse', fr: 'gros' },
    fine: { en: 'fine', fr: 'fin' },
    major: { en: 'Major diameter', fr: 'Diamètre extérieur' },
    pitchDia: { en: 'Pitch diameter', fr: 'Diamètre sur flancs' },
    minor: { en: 'Minor diameter', fr: 'Diamètre à fond de filet' },
    internal: { en: 'Internal thread (nut)', fr: 'Filetage intérieur (taraudage)' },
    external: { en: 'External thread (bolt)', fr: 'Filetage extérieur (vis)' }
  };

  /* =====================================================================
     ISO metric threads
     ===================================================================== */
  function metricLabel(d, P) {
    var s = E.metricSize(d);
    return 'M' + TH.num(d) + (s && P === s.coarse ? '' : '×' + TH.num(P));
  }

  function renderMetric(root) {
    var PG = 'thread-metric';
    var st = {
      d: sel(PG, 'd', 10), P: sel(PG, 'P', 1.5),
      ic: sel(PG, 'ic', '6H'), ec: sel(PG, 'ec', '6g')
    };
    if (!E.metricSize(st.d)) st.d = 10;
    if (E.pitchesFor(st.d).indexOf(st.P) < 0) st.P = E.pitchesFor(st.d)[0];

    root.appendChild(TH.pageHead({
      title: { en: 'ISO metric threads', fr: 'Filetages métriques ISO' },
      std: ['ISO 261', 'ISO 724', 'ISO 965-1', 'ISO 965-2', 'NF E03-014'],
      lede: {
        en: 'Basic dimensions, limits of size for any tolerance class (6H, 6g, 5g6g…) and tap drill for coarse and fine pitch metric threads M1 to M68.',
        fr: 'Dimensions de base, limites pour toute classe de tolérance (6H, 6g, 5g6g…) et avant-trou de taraudage des filetages métriques à pas gros et à pas fin, de M1 à M68.'
      }
    }));

    // --- controls ---
    var desig = h('input', { id: TH.uid('desig'), type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'M12x1.25-6H/6g' });
    var desigMsg = h('div', { class: 'help', id: desig.id + '-msg', role: 'status', 'aria-live': 'polite' });
    desig.setAttribute('aria-describedby', desigMsg.id);
    var desigField = h('div', { class: 'field w-lg' },
      h('label', { for: desig.id, text: t('Designation', 'Désignation') }), desig, desigMsg);

    var sizeOpts = [1, 2, 3].map(function (sr) {
      return {
        group: { en: 'Series ' + sr + (sr === 1 ? ' (first choice)' : sr === 2 ? ' (second choice)' : ' (third choice)'),
                 fr: 'Série ' + sr + (sr === 1 ? ' (premier choix)' : sr === 2 ? ' (deuxième choix)' : ' (troisième choix)') },
        options: E.METRIC_SIZES.filter(function (s) { return s.series === sr; })
          .map(function (s) { return { value: s.d, label: 'M' + TH.num(s.d) }; })
      };
    });
    var sizeField = TH.field({
      label: { en: 'Nominal diameter', fr: 'Diamètre nominal' }, type: 'select', width: 'md',
      options: sizeOpts, value: st.d,
      onInput: function (v) {
        st.d = +v; st.P = E.pitchesFor(st.d)[0];
        put(PG, 'd', st.d); put(PG, 'P', st.P);
        fillPitch(); syncDesig(); upd();
      }
    });
    var pitchField = TH.field({
      label: L.pitch, type: 'select', width: 'md', options: [], value: st.P,
      onInput: function (v) { st.P = +v; put(PG, 'P', st.P); syncDesig(); upd(); }
    });
    var pitchSel = pitchField.querySelector('select');
    function fillPitch() {
      var s = E.metricSize(st.d);
      setOptions(pitchSel, E.pitchesFor(st.d).map(function (p) {
        return { value: p, label: TH.num(p) + ' mm — ' + (p === s.coarse ? t(L.coarse) : t(L.fine)) };
      }), st.P);
    }
    var icField = TH.field({
      label: { en: 'Internal class', fr: 'Classe intérieure' }, type: 'select', width: 'sm',
      options: E.INTERNAL_CLASSES, value: st.ic,
      onInput: function (v) { st.ic = v; put(PG, 'ic', v); syncDesig(); upd(); }
    });
    var ecField = TH.field({
      label: { en: 'External class', fr: 'Classe extérieure' }, type: 'select', width: 'sm',
      options: E.EXTERNAL_CLASSES, value: st.ec,
      onInput: function (v) { st.ec = v; put(PG, 'ec', v); syncDesig(); upd(); }
    });
    function syncDesig() {
      desig.value = metricLabel(st.d, st.P) + '-' + st.ic + '/' + st.ec;
      desig.setAttribute('aria-invalid', 'false');
      desigMsg.textContent = t('Type a designation, e.g. M8-6g or M12x1.25-6H.', 'Saisissez une désignation, ex. M8-6g ou M12x1,25-6H.');
    }
    desig.addEventListener('input', function () {
      var r = E.parseDesignation(desig.value);
      if (!r.ok) {
        desig.setAttribute('aria-invalid', desig.value.trim() ? 'true' : 'false');
        desigMsg.textContent = r.reason === 'size'
          ? t('M' + r.d + ' is not an ISO 261 size (M1 to M68).', 'M' + r.d + ' n’est pas une dimension ISO 261 (M1 à M68).')
          : r.reason === 'pitch'
            ? t('This pitch is not standard for M' + r.d + ' — choose ' + E.pitchesFor(r.d).join(', ') + ' mm.',
                'Ce pas n’est pas normalisé pour M' + r.d + ' — choisir ' + E.pitchesFor(r.d).map(function (p) { return TH.num(p); }).join(' ; ') + ' mm.')
            : r.reason === 'class'
              ? t('Unknown tolerance class. Use e.g. 6H, 6g, 5g6g.', 'Classe de tolérance inconnue. Utilisez par ex. 6H, 6g, 5g6g.')
              : t('Format: M10, M10x1.25, M10x1.25-6H, M10-6H/6g.', 'Format : M10, M10x1,25, M10x1,25-6H, M10-6H/6g.');
        return;
      }
      desig.setAttribute('aria-invalid', 'false');
      desigMsg.textContent = t('Recognised: ', 'Reconnu : ') + metricLabel(r.d, r.P) + (r.lh ? ' LH' : '') +
        (r.coarse ? t(' (coarse pitch)', ' (pas gros)') : t(' (fine pitch)', ' (pas fin)'));
      st.d = r.d; st.P = r.P;
      if (r.internal) st.ic = r.internal;
      if (r.external) st.ec = r.external;
      put(PG, 'd', st.d); put(PG, 'P', st.P); put(PG, 'ic', st.ic); put(PG, 'ec', st.ec);
      sizeField.querySelector('select').value = String(st.d);
      fillPitch();
      var icSel = icField.querySelector('select'), ecSel = ecField.querySelector('select');
      ensureOption(icSel, st.ic); ensureOption(ecSel, st.ec);
      upd();
    });
    function ensureOption(s, v) {
      if (!Array.prototype.some.call(s.options, function (o) { return o.value === v; })) s.appendChild(h('option', { value: v, text: v }));
      s.value = v;
    }

    var basicBox = h('div'), limBox = h('div', { class: 'grid-2' }), tableBox = h('div');
    root.appendChild(TH.card({ en: 'Thread', fr: 'Filetage' }, [
      TH.row(desigField), TH.row(sizeField, pitchField, icField, ecField), basicBox
    ]));
    root.appendChild(limBox);
    root.appendChild(TH.card({ en: 'ISO 261 sizes and pitches', fr: 'Dimensions et pas ISO 261' }, tableBox));
    root.appendChild(stdNote({
      en: 'ISO 261 (sizes), ISO 724 (basic dimensions), ISO 965-1 tolerance tables, cross-checked against ISO 965-2 limits. For M1–M1.4 the pitch-diameter tolerances are derived from the ISO 965-1 formulas (grade 6 checked against ISO 965-2). Tap drills: cutting tap D − P; forming tap ≈ D − 0.5·P is a rule of thumb — follow the tap maker’s value.',
      fr: 'ISO 261 (dimensions), ISO 724 (dimensions de base), tables de tolérances ISO 965-1, recoupées avec les limites ISO 965-2. Pour M1 à M1,4, les tolérances sur flancs sont calculées par les formules ISO 965-1 (qualité 6 vérifiée avec l’ISO 965-2). Avant-trou : taraud de coupe D − P ; taraud à refouler ≈ D − 0,5·P est une règle pratique — suivre la valeur du fabricant.'
    }));

    function limRow(label, max, min, tolUm) {
      return [{ text: label }, max == null ? '—' : f3(max), min == null ? '—' : f3(min), tolUm == null ? '—' : String(tolUm)];
    }
    function reasonText(r, cls) {
      if (r.reason === 'position') return t('Tolerance position ' + cls.replace(/\d/g, '') + ' is not defined for P = ' + TH.num(st.P) + ' mm.',
        'La position ' + cls.replace(/\d/g, '') + ' n’est pas définie pour P = ' + TH.num(st.P) + ' mm.');
      if (r.reason === 'grade') return t('Class ' + cls + ' is not tabulated by ISO 965-1 for this size and pitch.',
        'La classe ' + cls + ' n’est pas tabulée par l’ISO 965-1 pour ce diamètre et ce pas.');
      return t('Invalid class.', 'Classe non valide.');
    }

    function upd() {
      var b = E.metricBasic(st.d, st.P), td = E.tapDrill(st.d, st.P);
      TH.clear(basicBox).appendChild(TH.kv([
        [{ en: 'Designation', fr: 'Désignation' }, metricLabel(st.d, st.P), null, 'primary'],
        [L.pitch, mm(st.P)],
        [{ en: 'Pitch diameter d2 = D2', fr: 'Diamètre sur flancs d2 = D2' }, mm(b.d2)],
        [{ en: 'Minor diameter D1 (nut)', fr: 'Diamètre intérieur D1 (écrou)' }, mm(b.d1)],
        [{ en: 'Root diameter d3 (bolt)', fr: 'Diamètre à fond de filet d3 (vis)' }, mm(b.d3)],
        [{ en: 'Thread depth h3', fr: 'Hauteur de filet h3' }, mm(b.h3)],
        [{ en: 'Tap drill (cutting tap)', fr: 'Avant-trou (taraud de coupe)' }, TH.num(td.cutting, 2) + ' mm', null, 'primary'],
        [{ en: 'Tap drill (forming tap)', fr: 'Avant-trou (taraud à refouler)' }, '≈ ' + TH.num(td.forming, 2) + ' mm',
          { en: 'rule of thumb', fr: 'règle pratique' }]
      ]));

      TH.clear(limBox);
      var li = E.metricLimits(st.d, st.P, st.ic), le = E.metricLimits(st.d, st.P, st.ec);
      var cols = [{ label: L.diameter }, { label: { en: 'Max (mm)', fr: 'Max (mm)' }, num: true }, { label: { en: 'Min (mm)', fr: 'Min (mm)' }, num: true }, { label: L.tol, num: true }];
      var intBody = li.ok ? [
        TH.table({ cols: cols, compact: true, rows: [
          limRow(t('Major diameter D', 'Diamètre extérieur D'), null, li.Dmin, null),
          limRow(t('Pitch diameter D2', 'Diamètre sur flancs D2'), li.D2max, li.D2min, li.TD2),
          limRow(t('Minor diameter D1', 'Diamètre intérieur D1'), li.D1max, li.D1min, li.TD1)
        ] }),
        TH.note({ en: 'Fundamental deviation EI = ' + TH.devum(li.EI) + ' µm.', fr: 'Écart fondamental EI = ' + TH.devum(li.EI) + ' µm.' })
      ] : TH.note(reasonText(li, st.ic), 'warn');
      var extBody = le.ok ? [
        TH.table({ cols: cols, compact: true, rows: [
          limRow(t('Major diameter d', 'Diamètre extérieur d'), le.dmax, le.dmin, le.Td),
          limRow(t('Pitch diameter d2', 'Diamètre sur flancs d2'), le.d2max, le.d2min, le.Td2),
          limRow(t('Root diameter d3 (max)', 'Diamètre à fond de filet d3 (max)'), le.d3max, null, null)
        ] }),
        TH.note({ en: 'Fundamental deviation es = ' + TH.devum(le.es) + ' µm.', fr: 'Écart fondamental es = ' + TH.devum(le.es) + ' µm.' })
      ] : TH.note(reasonText(le, st.ec), 'warn');
      limBox.appendChild(TH.card({ en: L.internal.en + ' — ' + st.ic, fr: L.internal.fr + ' — ' + st.ic }, intBody));
      limBox.appendChild(TH.card({ en: L.external.en + ' — ' + st.ec, fr: L.external.fr + ' — ' + st.ec }, extBody));

      var hl = -1;
      var rows = E.METRIC_SIZES.map(function (s, i) {
        if (s.d === st.d) hl = i;
        var P0 = s.coarse || s.fine[0], b0 = E.metricBasic(s.d, P0);
        return ['M' + TH.num(s.d), String(s.series), s.coarse ? TH.num(s.coarse) : '—',
          s.fine.map(function (p) { return TH.num(p); }).join(' · '),
          s.coarse ? f3(b0.d2) : '—', s.coarse ? f3(b0.d1) : '—',
          s.coarse ? TH.num(E.tapDrill(s.d, s.coarse).cutting, 2) : '—'];
      });
      TH.clear(tableBox).appendChild(TH.table({
        caption: { en: 'Dimensions for the coarse pitch', fr: 'Dimensions pour le pas gros' },
        cols: [{ label: { en: 'Size', fr: 'Dimension' } }, { label: { en: 'Series', fr: 'Série' }, num: true },
          { label: { en: 'Coarse P', fr: 'Pas gros' }, num: true }, { label: { en: 'Fine pitches', fr: 'Pas fins' } },
          { label: 'd2', num: true }, { label: 'D1', num: true }, { label: { en: 'Tap drill', fr: 'Avant-trou' }, num: true }],
        rows: rows, hlRow: hl, rowHead: true
      }));
      TH.revealHit(root);
    }

    fillPitch();
    syncDesig();
    upd();
  }

  /* =====================================================================
     Metric trapezoidal threads
     ===================================================================== */
  function renderTrap(root) {
    var PG = 'thread-trapezoidal';
    var st = { d: sel(PG, 'd', 20), P: sel(PG, 'P', 4) };
    if (!E.trSize(st.d)) st.d = 20;
    if (E.trSize(st.d).pitches.indexOf(st.P) < 0) st.P = E.trSize(st.d).preferred;

    root.appendChild(TH.pageHead({
      title: { en: 'Metric trapezoidal threads (Tr)', fr: 'Filetages trapézoïdaux métriques (Tr)' },
      std: ['ISO 2901', 'ISO 2903', 'ISO 2904', 'DIN 103'],
      lede: {
        en: '30° trapezoidal threads for lead screws and vices: diameter/pitch combinations, basic profile and 7H / 7e limits.',
        fr: 'Filetages trapézoïdaux à 30° pour vis de manœuvre et étaux : combinaisons diamètre/pas, profil de base et limites 7H / 7e.'
      }
    }));

    var pitchField = TH.field({
      label: L.pitch, type: 'select', width: 'md', options: [], value: st.P,
      onInput: function (v) { st.P = +v; put(PG, 'P', st.P); upd(); }
    });
    var pitchSel = pitchField.querySelector('select');
    function fillPitch() {
      var s = E.trSize(st.d);
      setOptions(pitchSel, s.pitches.map(function (p) {
        return { value: p, label: TH.num(p) + ' mm' + (p === s.preferred ? t(' — preferred', ' — préférentiel') : '') };
      }), st.P);
    }
    var dField = TH.field({
      label: { en: 'Nominal diameter', fr: 'Diamètre nominal' }, type: 'select', width: 'md',
      options: E.TR_SIZES.map(function (s) { return { value: s.d, label: 'Tr' + s.d }; }), value: st.d,
      onInput: function (v) { st.d = +v; st.P = E.trSize(st.d).preferred; put(PG, 'd', st.d); put(PG, 'P', st.P); fillPitch(); upd(); }
    });
    var basicBox = h('div'), limBox = h('div'), tableBox = h('div');
    root.appendChild(TH.card({ en: 'Thread', fr: 'Filetage' }, [TH.row(dField, pitchField), basicBox]));
    root.appendChild(limBox);
    root.appendChild(TH.card({ en: 'ISO 2904 diameter / pitch combinations', fr: 'Combinaisons diamètre / pas ISO 2904' }, tableBox));
    root.appendChild(stdNote({
      en: 'Profile per ISO 2901 (crest clearance ac: 0.15 mm for P 1.5; 0.25 for P 2–5; 0.5 for P 6–12; 1 for P 14–44). 7H / 7e limits from ISO 2903 are listed for Tr8 to Tr40 (P = 6 sizes excluded pending verification).',
      fr: 'Profil selon ISO 2901 (jeu au sommet ac : 0,15 mm pour P 1,5 ; 0,25 pour P 2 à 5 ; 0,5 pour P 6 à 12 ; 1 pour P 14 à 44). Les limites 7H / 7e de l’ISO 2903 sont données de Tr8 à Tr40 (pas de 6 exclus en attente de vérification).'
    }));

    function upd() {
      var b = E.trBasic(st.d, st.P);
      TH.clear(basicBox).appendChild(TH.kv([
        [{ en: 'Designation', fr: 'Désignation' }, 'Tr' + st.d + '×' + TH.num(st.P), null, 'primary'],
        [{ en: 'Pitch diameter d2 = D2', fr: 'Diamètre sur flancs d2 = D2' }, mm(b.d2)],
        [{ en: 'Root diameter d3 (screw)', fr: 'Diamètre à fond de filet d3 (vis)' }, mm(b.d3)],
        [{ en: 'Minor diameter D1 (nut)', fr: 'Diamètre intérieur D1 (écrou)' }, mm(b.D1), { en: 'also the tap drill', fr: 'aussi l’avant-trou' }],
        [{ en: 'Major diameter D4 (nut)', fr: 'Diamètre extérieur D4 (écrou)' }, mm(b.D4)],
        [{ en: 'Thread depth h3 = H4', fr: 'Hauteur de filet h3 = H4' }, mm(b.h3)],
        [{ en: 'Crest clearance ac', fr: 'Jeu au sommet ac' }, mm(b.ac)],
        [{ en: 'Root radius R1 / R2 max', fr: 'Rayon R1 / R2 max' }, f3(b.R1max) + ' / ' + f3(b.R2max) + ' mm']
      ]));

      TH.clear(limBox);
      var lim = E.trLimits(st.d, st.P);
      if (lim) {
        var cols = [{ label: L.diameter }, { label: { en: 'Max (mm)', fr: 'Max (mm)' }, num: true }, { label: { en: 'Min (mm)', fr: 'Min (mm)' }, num: true }];
        limBox.appendChild(h('div', { class: 'grid-2' },
          TH.card({ en: L.internal.en + ' — 7H', fr: L.internal.fr + ' — 7H' }, TH.table({ cols: cols, compact: true, rows: [
            [t('Major diameter D4', 'Diamètre extérieur D4'), '—', f3(lim.int.D4min)],
            [t('Pitch diameter D2', 'Diamètre sur flancs D2'), f3(lim.int.D2max), f3(lim.int.D2min)],
            [t('Minor diameter D1', 'Diamètre intérieur D1'), f3(lim.int.D1max), f3(lim.int.D1min)]
          ] })),
          TH.card({ en: L.external.en + ' — 7e', fr: L.external.fr + ' — 7e' }, TH.table({ cols: cols, compact: true, rows: [
            [t('Major diameter d', 'Diamètre extérieur d'), f3(lim.ext.dmax), f3(lim.ext.dmin)],
            [t('Pitch diameter d2', 'Diamètre sur flancs d2'), f3(lim.ext.d2max), f3(lim.ext.d2min)],
            [t('Root diameter d3', 'Diamètre à fond de filet d3'), f3(lim.ext.d3max), f3(lim.ext.d3min)]
          ] }))));
      } else {
        limBox.appendChild(TH.card(null, TH.note({
          en: '7H / 7e limits are not listed for Tr' + st.d + '×' + TH.num(st.P) + ' in this handbook — basic dimensions only.',
          fr: 'Les limites 7H / 7e ne sont pas fournies pour Tr' + st.d + '×' + TH.num(st.P) + ' dans ce manuel — dimensions de base uniquement.'
        }, 'warn')));
      }

      var hl = -1;
      var rows = E.TR_SIZES.map(function (s, i) {
        if (s.d === st.d) hl = i;
        var bp = E.trBasic(s.d, s.preferred);
        return ['Tr' + s.d, s.pitches.map(function (p) { return TH.num(p) + (p === s.preferred ? '*' : ''); }).join(' · '),
          TH.num(s.preferred), f3(bp.d2), f3(bp.d3), f3(bp.D1), f3(bp.D4)];
      });
      TH.clear(tableBox).appendChild(TH.table({
        caption: { en: '* preferred pitch — dimensions for the preferred pitch', fr: '* pas préférentiel — dimensions pour le pas préférentiel' },
        cols: [{ label: 'd' }, { label: { en: 'Pitches', fr: 'Pas' } }, { label: { en: 'Preferred P', fr: 'Pas préf.' }, num: true },
          { label: 'd2', num: true }, { label: 'd3', num: true }, { label: 'D1', num: true }, { label: 'D4', num: true }],
        rows: rows, hlRow: hl, rowHead: true
      }));
      TH.revealHit(root);
    }
    fillPitch();
    upd();
  }

  /* =====================================================================
     Unified inch threads
     ===================================================================== */
  function renderUnified(root) {
    var PG = 'thread-unified';
    var st = { size: sel(PG, 'size', '1/4'), series: sel(PG, 'series', 'unc') };
    var find = function (s) { for (var i = 0; i < E.UN_SIZES.length; i++) if (E.UN_SIZES[i].size === s) return E.UN_SIZES[i]; return null; };
    if (!find(st.size)) st.size = '1/4';

    root.appendChild(TH.pageHead({
      title: { en: 'Unified inch threads (UNC / UNF)', fr: 'Filetages unifiés en pouces (UNC / UNF)' },
      std: ['ASME B1.1', 'ISO 725'],
      lede: {
        en: 'Basic major, pitch and minor diameters in inches and millimetres, with the usual tap drill, for #0 to 1-1/2″.',
        fr: 'Diamètres de base (extérieur, sur flancs, intérieur) en pouces et en millimètres, avec l’avant-trou usuel, de #0 à 1-1/2″.'
      }
    }));
    var sizeField = TH.field({
      label: { en: 'Size', fr: 'Dimension' }, type: 'select', width: 'md', value: st.size,
      options: E.UN_SIZES.map(function (u) { return { value: u.size, label: u.size + (u.size.charAt(0) === '#' ? '' : '″') }; }),
      onInput: function (v) { st.size = v; put(PG, 'size', v); upd(); }
    });
    var serSeg = TH.seg({
      label: { en: 'Series', fr: 'Série' }, value: st.series,
      options: [{ value: 'unc', label: { en: 'UNC (coarse)', fr: 'UNC (gros)' } }, { value: 'unf', label: { en: 'UNF (fine)', fr: 'UNF (fin)' } }],
      onInput: function (v) { st.series = v; put(PG, 'series', v); upd(); }
    });
    var res = h('div'), tableBox = h('div');
    root.appendChild(TH.card({ en: 'Thread', fr: 'Filetage' }, [TH.row(sizeField, serSeg), res]));
    root.appendChild(TH.card({ en: 'UNC / UNF sizes', fr: 'Dimensions UNC / UNF' }, tableBox));
    root.appendChild(stdNote({
      en: 'Basic dimensions per ASME B1.1 (E = D − 0.649519·P, minor = D − 1.082532·P). Tap drills are the customary sizes for about 75 % thread engagement. Class 1A/2A/3A and 1B/2B/3B limits are not included.',
      fr: 'Dimensions de base selon ASME B1.1 (E = D − 0,649519·P, intérieur = D − 1,082532·P). Les avant-trous sont les forets usuels pour un engagement d’environ 75 %. Les limites des classes 1A/2A/3A et 1B/2B/3B ne sont pas incluses.'
    }));
    function inmm(x, dec) { return TH.num(x, dec == null ? 4 : dec, true) + ' in · ' + f3(x * 25.4) + ' mm'; }
    function upd() {
      var u = find(st.size);
      var tpi = st.series === 'unc' ? u.unc : u.unf, drill = st.series === 'unc' ? u.uncDrill : u.unfDrill;
      TH.clear(res);
      if (!tpi) {
        res.appendChild(TH.note({ en: 'Size ' + u.size + ' has no UNC thread — choose UNF.', fr: 'La dimension ' + u.size + ' n’existe pas en UNC — choisir UNF.' }, 'warn'));
      } else {
        var b = E.unBasic(u.D, tpi), dIn = E.drillInch(drill);
        var name = u.size + (u.size.charAt(0) === '#' ? '' : '″') + '-' + tpi + ' ' + st.series.toUpperCase();
        res.appendChild(TH.kv([
          [{ en: 'Designation', fr: 'Désignation' }, name, null, 'primary'],
          [{ en: 'Threads per inch', fr: 'Filets par pouce' }, String(tpi), { en: 'P = ' + f4(b.P) + ' in = ' + f3(b.P * 25.4) + ' mm', fr: 'P = ' + f4(b.P) + ' in = ' + f3(b.P * 25.4) + ' mm' }],
          [{ en: 'Basic major diameter D', fr: 'Diamètre extérieur de base D' }, inmm(b.D)],
          [{ en: 'Basic pitch diameter E', fr: 'Diamètre sur flancs de base E' }, inmm(b.E)],
          [{ en: 'Basic minor diameter', fr: 'Diamètre intérieur de base' }, inmm(b.K)],
          [{ en: 'Tap drill', fr: 'Avant-trou' }, drill + (drill.indexOf('/') > 0 ? '″' : ''), { en: f4(dIn) + ' in = ' + f3(dIn * 25.4) + ' mm', fr: f4(dIn) + ' in = ' + f3(dIn * 25.4) + ' mm' }, 'primary']
        ]));
      }
      var hl = -1;
      var rows = E.UN_SIZES.map(function (x, i) {
        if (x.size === st.size) hl = i;
        return [x.size, f4(x.D), f3(x.D * 25.4), x.unc ? String(x.unc) : '—', x.uncDrill || '—', String(x.unf), x.unfDrill];
      });
      TH.clear(tableBox).appendChild(TH.table({
        cols: [{ label: { en: 'Size', fr: 'Dimension' } }, { label: 'D (in)', num: true }, { label: 'D (mm)', num: true },
          { label: { en: 'UNC tpi', fr: 'UNC filets/po' }, num: true }, { label: { en: 'UNC drill', fr: 'Foret UNC' } },
          { label: { en: 'UNF tpi', fr: 'UNF filets/po' }, num: true }, { label: { en: 'UNF drill', fr: 'Foret UNF' } }],
        rows: rows, hlRow: hl, rowHead: true
      }));
      TH.revealHit(root);
    }
    upd();
  }

  /* =====================================================================
     Pipe threads G (ISO 228-1) and R / Rp / Rc (ISO 7-1)
     ===================================================================== */
  function renderPipe(root) {
    var PG = 'thread-pipe';
    var st = { size: sel(PG, 'size', '1/2'), sys: sel(PG, 'sys', 'G') };
    if (!E.pipe(st.size)) st.size = '1/2';

    root.appendChild(TH.pageHead({
      title: { en: 'Pipe threads (BSP: G, R, Rp, Rc)', fr: 'Filetages de tuyauterie (gaz : G, R, Rp, Rc)' },
      std: ['ISO 228-1', 'ISO 7-1', 'EN 10226-1'],
      lede: {
        en: '55° Whitworth-form pipe threads. G = parallel, sealing outside the thread (ISO 228-1). R = taper external, Rp = parallel internal, Rc = taper internal, sealing on the thread (ISO 7-1).',
        fr: 'Filetages de tuyauterie au profil Whitworth 55°. G = cylindrique, étanchéité hors filet (ISO 228-1). R = conique extérieur, Rp = cylindrique intérieur, Rc = conique intérieur, étanchéité dans le filet (ISO 7-1).'
      }
    }));
    var sizeField = TH.field({
      label: { en: 'Size', fr: 'Dimension' }, type: 'select', width: 'md', value: st.size,
      options: E.PIPE_SIZES.map(function (p) { return { value: p.size, label: p.size + '″' }; }),
      onInput: function (v) { st.size = v; put(PG, 'size', v); upd(); }
    });
    var sysSeg = TH.seg({
      label: { en: 'Standard', fr: 'Norme' }, value: st.sys,
      options: [{ value: 'G', label: { en: 'G — ISO 228-1', fr: 'G — ISO 228-1' } }, { value: 'R', label: { en: 'R/Rp/Rc — ISO 7-1', fr: 'R/Rp/Rc — ISO 7-1' } }],
      onInput: function (v) { st.sys = v; put(PG, 'sys', v); upd(); }
    });
    var res = h('div'), limBox = h('div'), tableBox = h('div');
    root.appendChild(TH.card({ en: 'Thread', fr: 'Filetage' }, [TH.row(sizeField, sysSeg), res]));
    root.appendChild(limBox);
    root.appendChild(TH.card({ en: 'Sizes', fr: 'Dimensions' }, tableBox));
    root.appendChild(stdNote({
      en: 'Basic diameters per ISO 228-1 (= diameters at the gauge plane for ISO 7-1). Thread height h = 0.640327·P. ISO 7-1 gauge length with its tolerance on the gauge-plane position; taper 1:16 on diameter.',
      fr: 'Diamètres de base selon ISO 228-1 (= diamètres dans le plan de jauge pour l’ISO 7-1). Hauteur de filet h = 0,640327·P. Longueur de jauge ISO 7-1 avec la tolérance de position du plan de jauge ; conicité 1:16 sur le diamètre.'
    }));

    function upd() {
      var p = E.pipe(st.size);
      TH.clear(res); TH.clear(limBox);
      var common = [
        [{ en: 'Threads per inch', fr: 'Filets par pouce' }, String(p.tpi), { en: 'P = ' + f3(p.P) + ' mm', fr: 'P = ' + f3(p.P) + ' mm' }],
        [{ en: 'Major diameter', fr: 'Diamètre extérieur' }, mm(p.major)],
        [{ en: 'Pitch diameter', fr: 'Diamètre sur flancs' }, mm(p.pitchDia)],
        [{ en: 'Minor diameter', fr: 'Diamètre intérieur' }, mm(p.minor)],
        [{ en: 'Thread height h', fr: 'Hauteur de filet h' }, mm(0.640327 * p.P)]
      ];
      if (st.sys === 'G') {
        res.appendChild(TH.kv([[{ en: 'Designation', fr: 'Désignation' }, 'G ' + p.size, null, 'primary']].concat(common)));
        var l = E.pipeLimits228(p.size);
        var cols = [{ label: L.diameter }, { label: { en: 'Max (mm)', fr: 'Max (mm)' }, num: true }, { label: { en: 'Min (mm)', fr: 'Min (mm)' }, num: true }];
        limBox.appendChild(h('div', { class: 'grid-2' },
          TH.card({ en: L.internal.en + ' — G ' + p.size, fr: L.internal.fr + ' — G ' + p.size }, TH.table({ cols: cols, compact: true, rows: [
            [t('Major diameter D', 'Diamètre extérieur D'), '—', f3(l.internal.Dmin)],
            [t('Pitch diameter D2', 'Diamètre sur flancs D2'), f3(l.internal.D2max), f3(l.internal.D2min)],
            [t('Minor diameter D1', 'Diamètre intérieur D1'), f3(l.internal.D1max), f3(l.internal.D1min)]
          ] })),
          TH.card({ en: L.external.en + ' — G ' + p.size + ' A / B', fr: L.external.fr + ' — G ' + p.size + ' A / B' }, TH.table({ cols: cols, compact: true, rows: [
            [t('Major diameter d', 'Diamètre extérieur d'), f3(l.externalA.dmax), f3(l.externalA.dmin)],
            [t('Pitch diameter d2 — class A', 'Diamètre sur flancs d2 — classe A'), f3(l.externalA.d2max), f3(l.externalA.d2min)],
            [t('Pitch diameter d2 — class B', 'Diamètre sur flancs d2 — classe B'), f3(l.externalB.d2max), f3(l.externalB.d2min)]
          ] }))));
      } else {
        var r = E.pipeIso7(p.size);
        if (!r) {
          res.appendChild(TH.kv([[{ en: 'Designation', fr: 'Désignation' }, 'G ' + p.size, null, 'primary']].concat(common)));
          res.appendChild(TH.note({
            en: p.size + '″ is not an ISO 7-1 size (sealing threads exist for 1/16, 1/8, 1/4, 3/8, 1/2, 3/4, 1, 1-1/4, 1-1/2, 2, 2-1/2, 3, 4, 5, 6).',
            fr: p.size + '″ n’est pas une dimension ISO 7-1 (filetages étanches : 1/16, 1/8, 1/4, 3/8, 1/2, 3/4, 1, 1-1/4, 1-1/2, 2, 2-1/2, 3, 4, 5, 6).'
          }, 'warn'));
        } else {
          res.appendChild(TH.kv([[{ en: 'Designation', fr: 'Désignation' }, 'R ' + p.size + ' · Rp ' + p.size + ' · Rc ' + p.size, null, 'primary']].concat(common).concat([
            [{ en: 'Gauge length (basic)', fr: 'Longueur de jauge (de base)' }, TH.num(r.gauge, 1, true) + ' mm', { en: '± ' + TH.num(r.gaugeTol, 1) + ' mm (gauge plane position)', fr: '± ' + TH.num(r.gaugeTol, 1) + ' mm (position du plan de jauge)' }, 'primary'],
            [{ en: 'Major diameter at small end (R)', fr: 'Diamètre extérieur au petit bout (R)' }, mm(r.smallEndMajor), { en: 'at basic gauge length', fr: 'à la longueur de jauge de base' }],
            [{ en: 'Taper', fr: 'Conicité' }, '1:16', { en: 'on diameter (half-angle 1°47′24″)', fr: 'sur le diamètre (demi-angle 1°47′24″)' }]
          ])));
        }
      }
      var hl = -1;
      var rows = E.PIPE_SIZES.map(function (x, i) {
        if (x.size === st.size) hl = i;
        return [x.size + '″', String(x.tpi), f3(x.P), f3(x.major), f3(x.pitchDia), f3(x.minor), x.gauge == null ? '—' : TH.num(x.gauge, 1, true)];
      });
      TH.clear(tableBox).appendChild(TH.table({
        cols: [{ label: { en: 'Size', fr: 'Dimension' } }, { label: { en: 'TPI', fr: 'Filets/po' }, num: true }, { label: 'P', num: true },
          { label: { en: 'Major', fr: 'Extérieur' }, num: true }, { label: { en: 'Pitch dia.', fr: 'Sur flancs' }, num: true },
          { label: { en: 'Minor', fr: 'Intérieur' }, num: true }, { label: { en: 'ISO 7 gauge length', fr: 'Long. de jauge ISO 7' }, num: true }],
        rows: rows, hlRow: hl, rowHead: true
      }));
      TH.revealHit(root);
    }
    upd();
  }

  TH.register({
    id: 'thread-metric', group: 'threads', order: 10,
    title: { en: 'ISO metric threads', fr: 'Filetages métriques ISO' },
    short: { en: 'Metric threads (M)', fr: 'Filetages métriques (M)' },
    keywords: 'thread metric M coarse fine pitch 6H 6g tap drill ISO 261 965 filetage métrique pas gros fin taraudage avant-trou vis écrou',
    render: renderMetric
  });
  TH.register({
    id: 'thread-trapezoidal', group: 'threads', order: 20,
    title: { en: 'Metric trapezoidal threads (Tr)', fr: 'Filetages trapézoïdaux (Tr)' },
    short: { en: 'Trapezoidal threads (Tr)', fr: 'Filetages trapézoïdaux (Tr)' },
    keywords: 'trapezoidal acme lead screw Tr 7H 7e ISO 2904 DIN 103 trapézoïdal vis de manœuvre',
    render: renderTrap
  });
  TH.register({
    id: 'thread-unified', group: 'threads', order: 30,
    title: { en: 'Unified inch threads (UNC / UNF)', fr: 'Filetages unifiés (UNC / UNF)' },
    short: { en: 'Inch threads (UNC / UNF)', fr: 'Filetages pouces (UNC / UNF)' },
    keywords: 'unified inch UNC UNF imperial tpi tap drill ASME B1.1 pouce américain',
    render: renderUnified
  });
  TH.register({
    id: 'thread-pipe', group: 'threads', order: 40,
    title: { en: 'Pipe threads (G, R, Rp, Rc)', fr: 'Filetages gaz (G, R, Rp, Rc)' },
    short: { en: 'Pipe threads (BSP)', fr: 'Filetages gaz (BSP)' },
    keywords: 'pipe thread BSP BSPP BSPT G R Rp Rc ISO 228 ISO 7 gas tuyauterie gaz conique cylindrique',
    render: renderPipe
  });
})(window.TH);
