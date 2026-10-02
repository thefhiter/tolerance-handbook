/* Threads engine — ISO metric (ISO 261 / 724 / 965-1 / 965-2), metric trapezoidal (ISO 2904 / 2903),
   Unified inch (ASME B1.1, basic sizes), pipe threads (ISO 228-1, ISO 7-1). Pure data + functions, no DOM.
   All tolerances are stored in micrometres exactly as tabulated; limits are returned in millimetres. */
(function (TH) {
  'use strict';

  function r3(x) { return Math.round(x * 1000 + (x >= 0 ? 1e-7 : -1e-7)) / 1000; }
  function key(p) { return String(+p); }

  /* ======================================================================
     ISO 261 — general purpose metric threads: nominal diameter, series
     (1 = first choice, 2 = second, 3 = third), coarse pitch, fine pitches.
     ====================================================================== */
  var METRIC_SIZES = [
    [1, 1, 0.25, [0.2]], [1.1, 2, 0.25, [0.2]], [1.2, 1, 0.25, [0.2]], [1.4, 2, 0.3, [0.2]],
    [1.6, 1, 0.35, [0.2]], [1.8, 2, 0.35, [0.2]], [2, 1, 0.4, [0.25]], [2.2, 2, 0.45, [0.25]],
    [2.5, 1, 0.45, [0.35]], [3, 1, 0.5, [0.35]], [3.5, 2, 0.6, [0.35]], [4, 1, 0.7, [0.5]],
    [4.5, 2, 0.75, [0.5]], [5, 1, 0.8, [0.5]], [5.5, 3, null, [0.5]], [6, 1, 1, [0.75]],
    [7, 2, 1, [0.75]], [8, 1, 1.25, [1, 0.75]], [9, 3, 1.25, [1, 0.75]], [10, 1, 1.5, [1.25, 1, 0.75]],
    [11, 3, 1.5, [1, 0.75]], [12, 1, 1.75, [1.5, 1.25, 1]], [14, 2, 2, [1.5, 1.25, 1]], [15, 3, null, [1.5, 1]],
    [16, 1, 2, [1.5, 1]], [17, 3, null, [1.5, 1]], [18, 2, 2.5, [2, 1.5, 1]], [20, 1, 2.5, [2, 1.5, 1]],
    [22, 2, 2.5, [2, 1.5, 1]], [24, 1, 3, [2, 1.5, 1]], [25, 3, null, [2, 1.5, 1]], [26, 3, null, [1.5]],
    [27, 2, 3, [2, 1.5, 1]], [28, 3, null, [2, 1.5, 1]], [30, 1, 3.5, [3, 2, 1.5, 1]], [32, 3, null, [2, 1.5]],
    [33, 2, 3.5, [3, 2, 1.5]], [35, 3, null, [1.5]], [36, 1, 4, [3, 2, 1.5]], [38, 3, null, [1.5]],
    [39, 2, 4, [3, 2, 1.5]], [40, 3, null, [3, 2, 1.5]], [42, 1, 4.5, [4, 3, 2, 1.5]], [45, 2, 4.5, [4, 3, 2, 1.5]],
    [48, 1, 5, [4, 3, 2, 1.5]], [50, 3, null, [3, 2, 1.5]], [52, 2, 5, [4, 3, 2, 1.5]], [55, 3, null, [4, 3, 2, 1.5]],
    [56, 1, 5.5, [4, 3, 2, 1.5]], [58, 3, null, [4, 3, 2, 1.5]], [60, 2, 5.5, [4, 3, 2, 1.5]], [62, 3, null, [4, 3, 2, 1.5]],
    [64, 1, 6, [4, 3, 2, 1.5]], [65, 3, null, [4, 3, 2, 1.5]], [68, 2, 6, [4, 3, 2, 1.5]]
  ].map(function (r) { return { d: r[0], series: r[1], coarse: r[2], fine: r[3] }; });

  function metricSize(d) {
    for (var i = 0; i < METRIC_SIZES.length; i++) if (Math.abs(METRIC_SIZES[i].d - d) < 1e-9) return METRIC_SIZES[i];
    return null;
  }
  function pitchesFor(d) {
    var s = metricSize(d);
    if (!s) return [];
    return (s.coarse ? [s.coarse] : []).concat(s.fine);
  }

  /* ISO 68-1 / ISO 724 basic profile. */
  function metricBasic(d, P) {
    return {
      d: d, P: P,
      H: 0.866025 * P,
      d2: r3(d - 0.649519 * P),     // pitch diameter (= D2)
      d1: r3(d - 1.082532 * P),     // basic minor diameter (= D1)
      d3: r3(d - 1.226869 * P),     // minor diameter of external thread (root)
      h3: 0.613343 * P,             // thread depth of external thread
      H1: 0.541266 * P              // thread overlap
    };
  }

  /* ======================================================================
     ISO 965-1 tables (µm). Transcribed from the published tables
     (ISO 965-1 Tables 1–5; cross-checked against ISO 965-2 limits).
     ====================================================================== */
  // Table 1 — fundamental deviations: [e, f, g] for external threads (es = −value);
  // internal G has EI = +g; H/h = 0. null = not defined for that pitch.
  var FD = {
    '0.2': [null, null, 17], '0.25': [null, null, 18], '0.3': [null, null, 18], '0.35': [null, 34, 19],
    '0.4': [null, 34, 19], '0.45': [null, 35, 20], '0.5': [50, 36, 20], '0.6': [53, 36, 21],
    '0.7': [56, 38, 22], '0.75': [56, 38, 22], '0.8': [60, 38, 24], '1': [60, 40, 26],
    '1.25': [63, 42, 28], '1.5': [67, 45, 32], '1.75': [71, 48, 34], '2': [71, 52, 38],
    '2.5': [80, 58, 42], '3': [85, 63, 48], '3.5': [90, 70, 53], '4': [95, 75, 60],
    '4.5': [100, 80, 63], '5': [106, 85, 71], '5.5': [112, 90, 75], '6': [118, 95, 80]
  };
  // Table 2 — TD1, minor diameter of internal thread, grades 4..8.
  var TD1 = {
    '0.2': [38, null, null, null, null], '0.25': [45, 56, null, null, null], '0.3': [53, 67, 85, null, null],
    '0.35': [63, 80, 100, null, null], '0.4': [71, 90, 112, null, null], '0.45': [80, 100, 125, null, null],
    '0.5': [90, 112, 140, 180, null], '0.6': [100, 125, 160, 200, null], '0.7': [112, 140, 180, 224, null],
    '0.75': [118, 150, 190, 236, null], '0.8': [125, 160, 200, 250, 315], '1': [150, 190, 236, 300, 375],
    '1.25': [170, 212, 265, 335, 425], '1.5': [190, 236, 300, 375, 475], '1.75': [212, 265, 335, 425, 530],
    '2': [236, 300, 375, 475, 600], '2.5': [280, 355, 450, 560, 710], '3': [315, 400, 500, 630, 800],
    '3.5': [355, 450, 560, 710, 900], '4': [375, 475, 600, 750, 950], '4.5': [425, 530, 670, 850, 1060],
    '5': [450, 560, 710, 900, 1120], '5.5': [475, 600, 750, 950, 1180], '6': [500, 630, 800, 1000, 1250]
  };
  // Table 3 — Td, major diameter of external thread, grades 4, 6, 8.
  var TD = {
    '0.2': [36, 56, null], '0.25': [42, 67, null], '0.3': [48, 75, null], '0.35': [53, 85, null],
    '0.4': [60, 95, null], '0.45': [63, 100, null], '0.5': [67, 106, null], '0.6': [80, 125, null],
    '0.7': [90, 140, null], '0.75': [90, 140, null], '0.8': [95, 150, 236], '1': [112, 180, 280],
    '1.25': [132, 212, 335], '1.5': [150, 236, 375], '1.75': [170, 265, 425], '2': [180, 280, 450],
    '2.5': [212, 335, 530], '3': [236, 375, 600], '3.5': [265, 425, 670], '4': [300, 475, 750],
    '4.5': [315, 500, 800], '5': [335, 530, 850], '5.5': [355, 560, 900], '6': [375, 600, 950]
  };
  // Diameter ranges "over .. up to and including" for Tables 4 & 5.
  var RANGE_BOUNDS = [1.4, 2.8, 5.6, 11.2, 22.4, 45, 90, 180, 355];
  var RANGE_LOWER = 0.99;
  // Table 4 — TD2, pitch diameter of internal thread, grades 4..8, per range.
  // Range 0 (0.99–1.4) is derived from the ISO 965-1 formulas (TD2 = 1.32·Td2(6), R40 rounding);
  // the other ranges are the published table values.
  var TD2 = [
    { '0.2': [40, null, null, null, null], '0.25': [45, 56, null, null, null], '0.3': [48, 60, 75, null, null] },
    { '0.2': [42, null, null, null, null], '0.25': [48, 60, null, null, null], '0.35': [53, 67, 85, null, null],
      '0.4': [56, 71, 90, null, null], '0.45': [60, 75, 95, null, null] },
    { '0.35': [56, 71, 90, null, null], '0.5': [63, 80, 100, 125, null], '0.6': [71, 90, 112, 140, null],
      '0.7': [75, 95, 118, 150, null], '0.75': [75, 95, 118, 150, null], '0.8': [80, 100, 125, 160, 200] },
    { '0.75': [85, 106, 132, 170, null], '1': [95, 118, 150, 190, 236], '1.25': [100, 125, 160, 200, 250],
      '1.5': [112, 140, 180, 224, 280] },
    { '1': [100, 125, 160, 200, 250], '1.25': [112, 140, 180, 224, 280], '1.5': [118, 150, 190, 236, 300],
      '1.75': [125, 160, 200, 250, 315], '2': [132, 170, 212, 265, 335], '2.5': [140, 180, 224, 280, 355] },
    { '1': [106, 132, 170, 212, null], '1.5': [125, 160, 200, 250, 315], '2': [140, 180, 224, 280, 355],
      '3': [170, 212, 265, 335, 425], '3.5': [180, 224, 280, 355, 450], '4': [190, 236, 300, 375, 475],
      '4.5': [200, 250, 315, 400, 500] },
    { '1.5': [132, 170, 212, 265, 335], '2': [150, 190, 236, 300, 375], '3': [180, 224, 280, 355, 450],
      '4': [200, 250, 315, 400, 500], '5': [212, 265, 335, 425, 530], '5.5': [224, 280, 355, 450, 560],
      '6': [236, 300, 375, 475, 600] },
    { '2': [160, 200, 250, 315, 400], '3': [190, 236, 300, 375, 475], '4': [212, 265, 335, 425, 530],
      '6': [250, 315, 400, 500, 630] },
    { '3': [212, 265, 335, 425, 530], '4': [236, 300, 375, 475, 600], '6': [265, 335, 425, 530, 670] }
  ];
  // Table 5 — Td2, pitch diameter of external thread, grades 3..9, per range.
  // Range 0 (0.99–1.4) derived from Td2 = 90·P^0.4·d^0.1 with R40 rounding; grade 6 checked
  // against ISO 965-2 (M1, M1.2, M1.4 6h).
  var TD2E = [
    { '0.2': [24, 30, 38, 48, null, null, null], '0.25': [26, 34, 42, 53, null, null, null],
      '0.3': [28, 36, 45, 56, null, null, null] },
    { '0.2': [25, 32, 40, 50, null, null, null], '0.25': [28, 36, 45, 56, null, null, null],
      '0.35': [32, 40, 50, 63, 80, null, null], '0.4': [34, 42, 53, 67, 85, null, null],
      '0.45': [36, 45, 56, 71, 90, null, null] },
    { '0.35': [34, 42, 53, 67, 85, null, null], '0.5': [38, 48, 60, 75, 95, null, null],
      '0.6': [42, 53, 67, 85, 106, null, null], '0.7': [45, 56, 71, 90, 112, null, null],
      '0.75': [45, 56, 71, 90, 112, null, null], '0.8': [48, 60, 75, 95, 118, 150, 190] },
    { '0.75': [50, 63, 80, 100, 125, null, null], '1': [56, 71, 90, 112, 140, 180, 224],
      '1.25': [60, 75, 95, 118, 150, 190, 236], '1.5': [67, 85, 106, 132, 170, 212, 265] },
    { '1': [60, 75, 95, 118, 150, 190, 236], '1.25': [67, 85, 106, 132, 170, 212, 265],
      '1.5': [71, 90, 112, 140, 180, 224, 280], '1.75': [75, 95, 118, 150, 190, 236, 300],
      '2': [80, 100, 125, 160, 200, 250, 315], '2.5': [85, 106, 132, 170, 212, 265, 335] },
    { '1': [63, 80, 100, 125, 160, 200, 250], '1.5': [75, 95, 118, 150, 190, 236, 300],
      '2': [85, 106, 132, 170, 212, 265, 335], '3': [100, 125, 160, 200, 250, 315, 400],
      '3.5': [106, 132, 170, 212, 265, 335, 425], '4': [112, 140, 180, 224, 280, 355, 450],
      '4.5': [118, 150, 190, 236, 300, 375, 475] },
    { '1.5': [80, 100, 125, 160, 200, 250, 315], '2': [90, 112, 140, 180, 224, 280, 355],
      '3': [106, 132, 170, 212, 265, 335, 425], '4': [118, 150, 190, 236, 300, 375, 475],
      '5': [125, 160, 200, 250, 315, 400, 500], '5.5': [132, 170, 212, 265, 335, 425, 530],
      '6': [140, 180, 224, 280, 355, 450, 560] },
    { '2': [95, 118, 150, 190, 236, 300, 375], '3': [112, 140, 180, 224, 280, 355, 450],
      '4': [125, 160, 200, 250, 315, 400, 500], '6': [150, 190, 236, 300, 375, 475, 600] },
    { '3': [125, 160, 200, 250, 315, 400, 500], '4': [140, 180, 224, 280, 355, 450, 560],
      '6': [160, 200, 250, 315, 400, 500, 630] }
  ];

  function rangeIdx(d) {
    if (!(d > RANGE_LOWER)) return -1;
    for (var i = 0; i < RANGE_BOUNDS.length; i++) if (d <= RANGE_BOUNDS[i] + 1e-9) return i;
    return -1;
  }
  function pick(tbl, P, grade, first) {
    var row = tbl && tbl[key(P)];
    if (!row) return null;
    var v = row[grade - first];
    return v == null ? null : v;
  }
  function fundamentalDeviation(P, pos) {
    var row = FD[key(P)];
    if (!row) return null;
    switch (pos) {
      case 'h': case 'H': return 0;
      case 'g': return row[2] == null ? null : -row[2];
      case 'G': return row[2] == null ? null : row[2];
      case 'f': return row[1] == null ? null : -row[1];
      case 'e': return row[0] == null ? null : -row[0];
      default: return null;
    }
  }
  function tolTD1(P, g) { return g >= 4 && g <= 8 ? pick(TD1, P, g, 4) : null; }
  function tolTd(P, g) { return g === 4 ? pick(TD, P, 4, 4) : g === 6 ? pick(TD, P, 5, 4) : g === 8 ? pick(TD, P, 6, 4) : null; }
  function tolTD2(d, P, g) { var i = rangeIdx(d); return i < 0 || g < 4 || g > 8 ? null : pick(TD2[i], P, g, 4); }
  function tolTd2(d, P, g) { var i = rangeIdx(d); return i < 0 || g < 3 || g > 9 ? null : pick(TD2E[i], P, g, 3); }

  /* Tolerance class: "6g", "6H", "5g6g" (pitch-diameter grade+position, then crest grade+position). */
  function parseClass(s) {
    var m = /^\s*([3-9])([efghGH])(?:([3-9])([efghGH]))?\s*$/.exec(s || '');
    if (!m) return null;
    if (m[3] && m[4] !== m[2]) return null;
    var internal = m[2] === m[2].toUpperCase();
    return { pitchGrade: +m[1], pos: m[2], crestGrade: m[3] ? +m[3] : +m[1], internal: internal, text: m[0].trim() };
  }

  /* Limits of size for a metric thread (ISO 965-1 method, values in mm, 3 decimals like ISO 965-2).
     Returns { ok, internal, cls, ...limits, tol:{...} } or { ok:false, reason }. */
  function metricLimits(d, P, cls) {
    var c = typeof cls === 'string' ? parseClass(cls) : cls;
    if (!c) return { ok: false, reason: 'class' };
    if (rangeIdx(d) < 0) return { ok: false, reason: 'diameter' };
    var b = metricBasic(d, P);
    var dev = fundamentalDeviation(P, c.pos);
    if (dev == null) return { ok: false, reason: 'position' };
    var um = function (x) { return x / 1000; };
    if (c.internal) {
      var t2 = tolTD2(d, P, c.pitchGrade), t1 = tolTD1(P, c.crestGrade);
      if (t2 == null || t1 == null) return { ok: false, reason: 'grade' };
      return {
        ok: true, internal: true, cls: c.text, EI: dev, TD2: t2, TD1: t1,
        Dmin: r3(d + um(dev)),
        D2min: r3(b.d2 + um(dev)), D2max: r3(b.d2 + um(dev + t2)),
        D1min: r3(b.d1 + um(dev)), D1max: r3(b.d1 + um(dev + t1))
      };
    }
    var td2 = tolTd2(d, P, c.pitchGrade), td = tolTd(P, c.crestGrade);
    if (td2 == null || td == null) return { ok: false, reason: 'grade' };
    return {
      ok: true, internal: false, cls: c.text, es: dev, Td2: td2, Td: td,
      dmax: r3(d + um(dev)), dmin: r3(d + um(dev - td)),
      d2max: r3(b.d2 + um(dev)), d2min: r3(b.d2 + um(dev - td2)),
      d3max: r3(b.d3 + um(dev))
    };
  }

  /* Designation parser: "M12x1.25-6H", "M8-6g", "M10×1.5-6H/6g", "m20 x 2 - 5g6g", "M16-LH". */
  function parseDesignation(s) {
    var t = String(s || '').replace(/\s+/g, '').replace(/[×*]/g, 'x').replace(/,/g, '.');
    var m = /^M(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?(?:-?([0-9][efghEFGH](?:[0-9][efghEFGH])?)(?:\/([0-9][efghEFGH](?:[0-9][efghEFGH])?))?)?(-?LH)?$/i.exec(t);
    if (!m) return { ok: false, reason: 'syntax' };
    var d = +m[1];
    var size = metricSize(d);
    if (!size) return { ok: false, reason: 'size', d: d };
    var P = m[2] ? +m[2] : size.coarse;
    if (P == null) return { ok: false, reason: 'pitch', d: d };
    if (pitchesFor(d).indexOf(P) < 0) return { ok: false, reason: 'pitch', d: d, P: P };
    var classes = [m[3], m[4]].filter(Boolean);
    var internal = null, external = null;
    for (var i = 0; i < classes.length; i++) {
      var c = parseClass(classes[i]);
      if (!c) return { ok: false, reason: 'class', d: d, P: P };
      if (c.internal) internal = c.text; else external = c.text;
    }
    return { ok: true, d: d, P: P, coarse: P === size.coarse, internal: internal, external: external, lh: !!m[5] };
  }

  /* Tap drill: cutting taps D − P (ISO 2306 practice); forming taps ≈ D − 0.5·P (rule of thumb). */
  function tapDrill(d, P) { return { cutting: r3(d - P), forming: r3(d - 0.5 * P) }; }

  var INTERNAL_CLASSES = ['4H', '5H', '6H', '7H', '8H', '5G', '6G', '7G', '8G'];
  var EXTERNAL_CLASSES = ['3h4h', '4h', '5h4h', '5h6h', '6h', '7h6h', '4g', '5g6g', '6g', '7g6g', '8g', '9g8g', '6f', '6e', '7e6e', '8e'];

  /* ======================================================================
     Metric trapezoidal — ISO 2904 (diameter/pitch), ISO 2901 (profile),
     ISO 2903 (7H / 7e limits, tabulated here for Tr8–Tr40).
     ====================================================================== */
  // [d, [pitches], preferred pitch]
  var TR_SIZES = [
    [8, [1.5], 1.5], [9, [1.5, 2], 2], [10, [1.5, 2], 2], [11, [2, 3], 2], [12, [2, 3], 3], [14, [2, 3], 3],
    [16, [2, 3, 4], 4], [18, [2, 3, 4], 4], [20, [2, 3, 4], 4], [22, [3, 5, 8], 5], [24, [3, 5, 8], 5],
    [26, [3, 5, 8], 5], [28, [3, 5, 8], 5], [30, [3, 6, 10], 6], [32, [3, 6, 10], 6], [34, [3, 6, 10], 6],
    [36, [3, 6, 10], 6], [38, [3, 7, 10], 7], [40, [3, 7, 10], 7], [42, [3, 7, 10], 7], [44, [3, 7, 12], 7],
    [46, [3, 8, 12], 8], [48, [3, 8, 12], 8], [50, [3, 8, 12], 8], [52, [3, 8, 12], 8], [55, [3, 9, 14], 9],
    [60, [3, 9, 14], 9], [65, [4, 10, 16], 10], [70, [4, 10, 16], 10], [75, [4, 10, 16], 10], [80, [4, 10, 16], 10],
    [85, [4, 12, 18], 12], [90, [4, 12, 18], 12], [95, [4, 12, 18], 12], [100, [4, 12, 20], 12]
  ].map(function (r) { return { d: r[0], pitches: r[1], preferred: r[2] }; });

  function trSize(d) { for (var i = 0; i < TR_SIZES.length; i++) if (TR_SIZES[i].d === d) return TR_SIZES[i]; return null; }

  // Crest clearance ac (ISO 2901).
  function trClearance(P) {
    if (P === 1.5) return 0.15;
    if (P >= 2 && P <= 5) return 0.25;
    if (P >= 6 && P <= 12) return 0.5;
    if (P >= 14 && P <= 44) return 1;
    return null;
  }
  function trBasic(d, P) {
    var ac = trClearance(P);
    if (ac == null) return null;
    var H1 = 0.5 * P, h3 = H1 + ac;
    return {
      d: d, P: P, ac: ac, H1: H1, h3: h3, H4: h3, z: 0.25 * P,
      d2: r3(d - 0.5 * P), D2: r3(d - 0.5 * P), d3: r3(d - 2 * h3), D1: r3(d - P), D4: r3(d + 2 * ac),
      R1max: 0.5 * ac, R2max: ac
    };
  }
  // ISO 2903 limits, mm: [d, P, 7e: dmax, dmin, d2max, d2min, d3max, d3min, 7H: D1min, D1max, D2min, D2max, D4min]
  // Tr40x10 7H uses the Tr38x10 tolerances (same diameter range 22.4–45 and pitch).
  // P = 6 rows (Tr30–Tr36) omitted: the source chart is internally inconsistent for them.
  // P = 8 rows: d3 and D4 follow ISO 2901 (ac = 0.5 for P 6–12); d3min = d3max − (1.25·Td2 + |es|).
  var TR_LIMITS = [
    [8, 1.5, 8.000, 7.850, 7.183, 7.013, 6.200, 5.921, 6.500, 6.690, 7.250, 7.474, 8.300],
    [9, 1.5, 9.000, 8.850, 8.183, 8.013, 7.200, 6.921, 7.500, 7.690, 8.250, 8.474, 9.300],
    [9, 2, 9.000, 8.820, 7.929, 7.739, 6.500, 6.191, 7.000, 7.236, 8.000, 8.250, 9.500],
    [10, 1.5, 10.000, 9.850, 9.183, 9.013, 8.200, 7.921, 8.500, 8.690, 9.250, 9.474, 10.300],
    [10, 2, 10.000, 9.820, 8.929, 8.739, 7.500, 7.191, 8.000, 8.236, 9.000, 9.250, 10.500],
    [11, 2, 11.000, 10.820, 9.929, 9.739, 8.500, 8.191, 9.000, 9.236, 10.000, 10.250, 11.500],
    [11, 3, 11.000, 10.764, 9.415, 9.203, 7.500, 7.150, 8.000, 8.315, 9.500, 9.780, 11.500],
    [12, 2, 12.000, 11.820, 10.929, 10.729, 9.500, 9.179, 10.000, 10.236, 11.000, 11.265, 12.500],
    [12, 3, 12.000, 11.764, 10.415, 10.191, 8.500, 8.135, 9.000, 9.315, 10.500, 10.800, 12.500],
    [14, 2, 14.000, 13.820, 12.929, 12.729, 11.500, 11.179, 12.000, 12.236, 13.000, 13.265, 14.500],
    [14, 3, 14.000, 13.764, 12.415, 12.191, 10.500, 10.135, 11.000, 11.315, 12.500, 12.800, 14.500],
    [16, 2, 16.000, 15.820, 14.929, 14.729, 13.500, 13.179, 14.000, 14.236, 15.000, 15.265, 16.500],
    [16, 3, 16.000, 15.764, 14.415, 14.191, 12.500, 12.135, 13.000, 13.315, 14.500, 14.800, 16.500],
    [16, 4, 16.000, 15.700, 13.905, 13.640, 11.500, 11.074, 12.000, 12.375, 14.000, 14.355, 16.500],
    [18, 2, 18.000, 17.820, 16.929, 16.729, 15.500, 15.179, 16.000, 16.236, 17.000, 17.265, 18.500],
    [18, 3, 18.000, 17.764, 16.415, 16.191, 14.500, 14.135, 15.000, 15.315, 16.500, 16.800, 18.500],
    [18, 4, 18.000, 17.700, 15.905, 15.640, 13.500, 13.074, 14.000, 14.375, 16.000, 16.355, 18.500],
    [20, 2, 20.000, 19.820, 18.929, 18.729, 17.500, 17.179, 18.000, 18.236, 19.000, 19.265, 20.500],
    [20, 3, 20.000, 19.764, 18.415, 18.191, 16.500, 16.135, 17.000, 17.315, 18.500, 18.800, 20.500],
    [20, 4, 20.000, 19.700, 17.905, 17.640, 15.500, 15.074, 16.000, 16.375, 18.000, 18.355, 20.500],
    [22, 3, 22.000, 21.764, 20.415, 20.191, 18.500, 18.135, 19.000, 19.315, 20.500, 20.800, 22.500],
    [22, 5, 22.000, 21.665, 19.394, 19.114, 16.500, 16.044, 17.000, 17.450, 19.500, 19.875, 22.500],
    [22, 8, 22.000, 21.550, 17.868, 17.513, 13.000, 12.424, 14.000, 14.630, 18.000, 18.475, 23.000],
    [24, 3, 24.000, 23.764, 22.415, 22.165, 20.500, 20.103, 21.000, 21.315, 22.500, 22.835, 24.500],
    [24, 5, 24.000, 23.665, 21.394, 21.094, 18.500, 18.019, 19.000, 19.450, 21.500, 21.900, 24.500],
    [24, 8, 24.000, 23.550, 19.868, 19.493, 15.000, 14.399, 16.000, 16.630, 20.000, 20.500, 25.000],
    [26, 3, 26.000, 25.764, 24.415, 24.165, 22.500, 22.103, 23.000, 23.315, 24.500, 24.835, 26.500],
    [26, 5, 26.000, 25.665, 23.394, 23.094, 20.500, 20.019, 21.000, 21.450, 23.500, 23.900, 26.500],
    [26, 8, 26.000, 25.550, 21.868, 21.493, 17.000, 16.399, 18.000, 18.630, 22.000, 22.500, 27.000],
    [28, 3, 28.000, 27.764, 26.415, 26.165, 24.500, 24.103, 25.000, 25.315, 26.500, 26.835, 28.500],
    [28, 5, 28.000, 27.665, 25.394, 25.094, 22.500, 22.019, 23.000, 23.450, 25.500, 25.900, 28.500],
    [28, 8, 28.000, 27.550, 23.868, 23.493, 19.000, 18.399, 20.000, 20.630, 24.000, 24.500, 29.000],
    [30, 3, 30.000, 29.764, 28.415, 28.165, 26.500, 26.103, 27.000, 27.315, 28.500, 28.835, 30.500],
    [30, 10, 30.000, 29.470, 24.850, 24.450, 19.000, 18.350, 20.000, 20.710, 25.000, 25.530, 31.000],
    [32, 3, 32.000, 31.764, 30.415, 30.165, 28.500, 28.103, 29.000, 29.315, 30.500, 30.835, 32.500],
    [32, 10, 32.000, 31.470, 26.850, 26.450, 21.000, 20.350, 22.000, 22.710, 27.000, 27.530, 33.000],
    [34, 3, 34.000, 33.764, 32.415, 32.165, 30.500, 30.103, 31.000, 31.315, 32.500, 32.835, 34.500],
    [34, 10, 34.000, 33.470, 28.850, 28.450, 23.000, 22.350, 24.000, 24.710, 29.000, 29.530, 35.000],
    [36, 3, 36.000, 35.764, 34.415, 34.165, 32.500, 32.103, 33.000, 33.315, 34.500, 34.835, 36.500],
    [36, 10, 36.000, 35.470, 30.850, 30.450, 25.000, 24.350, 26.000, 26.710, 31.000, 31.530, 37.000],
    [38, 3, 38.000, 37.764, 36.415, 36.165, 34.500, 34.103, 35.000, 35.315, 36.500, 36.835, 38.500],
    [38, 7, 38.000, 37.575, 34.375, 34.020, 30.000, 29.431, 31.000, 31.560, 34.500, 34.975, 39.000],
    [38, 10, 38.000, 37.470, 32.850, 32.450, 27.000, 26.350, 28.000, 28.710, 33.000, 33.530, 39.000],
    [40, 3, 40.000, 39.764, 38.415, 38.165, 36.500, 36.103, 37.000, 37.315, 38.500, 38.835, 40.500],
    [40, 7, 40.000, 39.575, 36.375, 36.020, 32.000, 31.431, 33.000, 33.560, 36.500, 36.975, 41.000],
    [40, 10, 40.000, 39.470, 34.850, 34.450, 29.000, 28.350, 30.000, 30.710, 35.000, 35.530, 41.000]
  ];
  function trLimits(d, P) {
    for (var i = 0; i < TR_LIMITS.length; i++) {
      var r = TR_LIMITS[i];
      if (r[0] === d && r[1] === P) {
        return {
          ext: { cls: '7e', dmax: r[2], dmin: r[3], d2max: r[4], d2min: r[5], d3max: r[6], d3min: r[7] },
          int: { cls: '7H', D1min: r[8], D1max: r[9], D2min: r[10], D2max: r[11], D4min: r[12] }
        };
      }
    }
    return null;
  }

  /* ======================================================================
     Unified inch screw threads — ASME B1.1 basic dimensions (UNC / UNF),
     with common tap drills for ~75 % thread engagement.
     ====================================================================== */
  // Numbered / letter drill diameters, inch.
  var DRILLS = {
    '#53': 0.0595, '#50': 0.0700, '#47': 0.0785, '#45': 0.0820, '#43': 0.0890, '#42': 0.0935, '#38': 0.1015,
    '#37': 0.1040, '#36': 0.1065, '#33': 0.1130, '#29': 0.1360, '#25': 0.1495, '#21': 0.1590, '#16': 0.1770,
    '#14': 0.1820, '#7': 0.2010, '#3': 0.2130, 'F': 0.2570, 'I': 0.2720, 'Q': 0.3320, 'U': 0.3680
  };
  function drillInch(name) {
    if (DRILLS[name] != null) return DRILLS[name];
    var m = /^(?:(\d+)-)?(\d+)\/(\d+)$/.exec(name);
    if (m) return (m[1] ? +m[1] : 0) + (+m[2]) / (+m[3]);
    return null;
  }
  // [size label, basic major dia (in), UNC tpi, UNC tap drill, UNF tpi, UNF tap drill]
  var UN_SIZES = [
    ['#0', 0.0600, null, null, 80, '3/64'], ['#1', 0.0730, 64, '#53', 72, '#53'], ['#2', 0.0860, 56, '#50', 64, '#50'],
    ['#3', 0.0990, 48, '#47', 56, '#45'], ['#4', 0.1120, 40, '#43', 48, '#42'], ['#5', 0.1250, 40, '#38', 44, '#37'],
    ['#6', 0.1380, 32, '#36', 40, '#33'], ['#8', 0.1640, 32, '#29', 36, '#29'], ['#10', 0.1900, 24, '#25', 32, '#21'],
    ['#12', 0.2160, 24, '#16', 28, '#14'], ['1/4', 0.2500, 20, '#7', 28, '#3'], ['5/16', 0.3125, 18, 'F', 24, 'I'],
    ['3/8', 0.3750, 16, '5/16', 24, 'Q'], ['7/16', 0.4375, 14, 'U', 20, '25/64'], ['1/2', 0.5000, 13, '27/64', 20, '29/64'],
    ['9/16', 0.5625, 12, '31/64', 18, '33/64'], ['5/8', 0.6250, 11, '17/32', 18, '37/64'], ['3/4', 0.7500, 10, '21/32', 16, '11/16'],
    ['7/8', 0.8750, 9, '49/64', 14, '13/16'], ['1', 1.0000, 8, '7/8', 12, '59/64'], ['1-1/8', 1.1250, 7, '63/64', 12, '1-3/64'],
    ['1-1/4', 1.2500, 7, '1-7/64', 12, '1-11/64'], ['1-3/8', 1.3750, 6, '1-7/32', 12, '1-19/64'], ['1-1/2', 1.5000, 6, '1-11/32', 12, '1-27/64']
  ].map(function (r) { return { size: r[0], D: r[1], unc: r[2], uncDrill: r[3], unf: r[4], unfDrill: r[5] }; });

  function unBasic(D, tpi) {
    var P = 1 / tpi;
    return {
      D: D, tpi: tpi, P: P,
      E: D - 0.649519 * P,     // basic pitch diameter
      K: D - 1.082532 * P,     // basic minor diameter (internal)
      H: 0.866025 * P
    };
  }

  /* ======================================================================
     Pipe threads — 55° Whitworth form. ISO 228-1 (G, parallel, not pressure-tight)
     and ISO 7-1 (R taper external, Rp parallel / Rc taper internal, 1:16 taper).
     ====================================================================== */
  // [size, tpi, pitch mm, major, pitch dia, minor, ISO 228 tolerance group, ISO 7 gauge length (mm) or null]
  var PIPE_SIZES = [
    ['1/16', 28, 0.907, 7.723, 7.142, 6.561, 0, 4.0], ['1/8', 28, 0.907, 9.728, 9.147, 8.566, 0, 4.0],
    ['1/4', 19, 1.337, 13.157, 12.301, 11.445, 1, 6.0], ['3/8', 19, 1.337, 16.662, 15.806, 14.950, 1, 6.4],
    ['1/2', 14, 1.814, 20.955, 19.793, 18.631, 2, 8.2], ['5/8', 14, 1.814, 22.911, 21.749, 20.587, 2, null],
    ['3/4', 14, 1.814, 26.441, 25.279, 24.117, 2, 9.5], ['7/8', 14, 1.814, 30.201, 29.039, 27.877, 2, null],
    ['1', 11, 2.309, 33.249, 31.770, 30.291, 3, 10.4], ['1-1/8', 11, 2.309, 37.897, 36.418, 34.939, 3, null],
    ['1-1/4', 11, 2.309, 41.910, 40.431, 38.952, 3, 12.7], ['1-1/2', 11, 2.309, 47.803, 46.324, 44.845, 3, 12.7],
    ['1-3/4', 11, 2.309, 53.746, 52.267, 50.788, 3, null], ['2', 11, 2.309, 59.614, 58.135, 56.656, 3, 15.9],
    ['2-1/4', 11, 2.309, 65.710, 64.231, 62.752, 4, null], ['2-1/2', 11, 2.309, 75.184, 73.705, 72.226, 4, 17.5],
    ['2-3/4', 11, 2.309, 81.534, 80.055, 78.576, 4, null], ['3', 11, 2.309, 87.884, 86.405, 84.926, 4, 20.6],
    ['3-1/2', 11, 2.309, 100.330, 98.851, 97.372, 4, null], ['4', 11, 2.309, 113.030, 111.551, 110.072, 4, 25.4],
    ['4-1/2', 11, 2.309, 125.730, 124.251, 122.772, 4, null], ['5', 11, 2.309, 138.430, 136.951, 135.472, 4, 28.6],
    ['5-1/2', 11, 2.309, 151.130, 149.651, 148.172, 4, null], ['6', 11, 2.309, 163.830, 162.351, 160.872, 4, 28.6]
  ].map(function (r) { return { size: r[0], tpi: r[1], P: r[2], major: r[3], pitchDia: r[4], minor: r[5], group: r[6], gauge: r[7] }; });

  // ISO 228-1 tolerances (mm) by group: internal TD2 (+), TD1 (+); external Td2 class A (−), class B (−), Td major (−).
  var PIPE_TOL = [
    { TD2: 0.107, TD1: 0.282, Td2A: 0.107, Td2B: 0.214, Td: 0.214 },
    { TD2: 0.125, TD1: 0.445, Td2A: 0.125, Td2B: 0.250, Td: 0.250 },
    { TD2: 0.142, TD1: 0.541, Td2A: 0.142, Td2B: 0.284, Td: 0.284 },
    { TD2: 0.180, TD1: 0.640, Td2A: 0.180, Td2B: 0.360, Td: 0.360 },
    { TD2: 0.217, TD1: 0.640, Td2A: 0.217, Td2B: 0.434, Td: 0.434 }
  ];
  // ISO 7-1 tolerance on the gauge-plane position (± about one turn), by ISO 228 group index.
  var PIPE_GAUGE_TOL = [0.9, 1.3, 1.8, 2.3, 3.5];

  function pipe(size) { for (var i = 0; i < PIPE_SIZES.length; i++) if (PIPE_SIZES[i].size === size) return PIPE_SIZES[i]; return null; }
  function pipeLimits228(size) {
    var p = pipe(size); if (!p) return null;
    var t = PIPE_TOL[p.group];
    return {
      internal: { D2min: p.pitchDia, D2max: r3(p.pitchDia + t.TD2), D1min: p.minor, D1max: r3(p.minor + t.TD1), Dmin: p.major },
      externalA: { dmax: p.major, dmin: r3(p.major - t.Td), d2max: p.pitchDia, d2min: r3(p.pitchDia - t.Td2A) },
      externalB: { dmax: p.major, dmin: r3(p.major - t.Td), d2max: p.pitchDia, d2min: r3(p.pitchDia - t.Td2B) },
      tol: t
    };
  }
  function pipeIso7(size) {
    var p = pipe(size); if (!p || p.gauge == null) return null;
    var g = p.gauge, t = PIPE_GAUGE_TOL[p.group];
    // Diameters at the gauge plane are the basic ISO 228 values; taper 1:16 on diameter.
    return {
      gauge: g, gaugeTol: t, taper: 1 / 16,
      smallEndMajor: r3(p.major - g / 16), // external R: major diameter at the small end
      major: p.major, pitchDia: p.pitchDia, minor: p.minor
    };
  }

  TH.engine.threads = {
    METRIC_SIZES: METRIC_SIZES, metricSize: metricSize, pitchesFor: pitchesFor, metricBasic: metricBasic,
    fundamentalDeviation: fundamentalDeviation, tolTD1: tolTD1, tolTd: tolTd, tolTD2: tolTD2, tolTd2: tolTd2,
    rangeIdx: rangeIdx, RANGE_BOUNDS: RANGE_BOUNDS, RANGE_LOWER: RANGE_LOWER,
    parseClass: parseClass, metricLimits: metricLimits, parseDesignation: parseDesignation, tapDrill: tapDrill,
    INTERNAL_CLASSES: INTERNAL_CLASSES, EXTERNAL_CLASSES: EXTERNAL_CLASSES,
    TR_SIZES: TR_SIZES, trSize: trSize, trClearance: trClearance, trBasic: trBasic, trLimits: trLimits, TR_LIMITS: TR_LIMITS,
    UN_SIZES: UN_SIZES, unBasic: unBasic, drillInch: drillInch,
    PIPE_SIZES: PIPE_SIZES, pipe: pipe, pipeLimits228: pipeLimits228, pipeIso7: pipeIso7
  };
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
