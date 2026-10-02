/* Machine elements engine: parallel keys, pins, rolling bearings, roller chains & V-belts, gears.
   Pure data + functions, no DOM. Lengths in mm, deviations in µm. */
(function (TH) {
  'use strict';
  var D2R = Math.PI / 180;

  /* ---------------- Parallel keys — DIN 6885-1 (ISO/R 773, GB/T 1095 same b×h, t1, t2) ----------------
     [shaft over, shaft incl, b, h, t1 (shaft depth), t2 (hub depth)]  (verified against DIN 6885-1 table) */
  var KEYS = [
    [6, 8, 2, 2, 1.2, 1.0], [8, 10, 3, 3, 1.8, 1.4], [10, 12, 4, 4, 2.5, 1.8], [12, 17, 5, 5, 3.0, 2.3],
    [17, 22, 6, 6, 3.5, 2.8], [22, 30, 8, 7, 4.0, 3.3], [30, 38, 10, 8, 5.0, 3.3], [38, 44, 12, 8, 5.0, 3.3],
    [44, 50, 14, 9, 5.5, 3.8], [50, 58, 16, 10, 6.0, 4.3], [58, 65, 18, 11, 7.0, 4.4], [65, 75, 20, 12, 7.5, 4.9],
    [75, 85, 22, 14, 9.0, 5.4], [85, 95, 25, 14, 9.0, 5.4], [95, 110, 28, 16, 10.0, 6.4], [110, 130, 32, 18, 11.0, 7.4],
    [130, 150, 36, 20, 12.0, 8.4], [150, 170, 40, 22, 13.0, 9.4], [170, 200, 45, 25, 15.0, 10.4], [200, 230, 50, 28, 17.0, 11.4],
    [230, 260, 56, 32, 20.0, 12.4], [260, 290, 63, 32, 20.0, 12.4], [290, 330, 70, 36, 22.0, 14.4], [330, 380, 80, 40, 25.0, 15.4],
    [380, 440, 90, 45, 28.0, 17.4], [440, 500, 100, 50, 31.0, 19.5]
  ].map(function (r) { return { dOver: r[0], dTo: r[1], b: r[2], h: r[3], t1: r[4], t2: r[5] }; });

  // Upper deviation of keyway depths t1 and t2 (lower = 0), mm — ISO 773 / GB/T 1095.
  function keyDepthTol(b) { return b <= 6 ? 0.1 : b <= 50 ? 0.2 : 0.3; }
  // Keyway bottom radius r (min, max), mm — GB/T 1095-2003.
  function keyRadius(b) {
    if (b <= 3) return [0.08, 0.16];
    if (b <= 10) return [0.16, 0.25];
    if (b <= 18) return [0.25, 0.40];
    if (b <= 28) return [0.40, 0.60];
    if (b <= 50) return [0.70, 1.00];
    if (b <= 70) return [1.20, 1.60];
    return [2.00, 2.50];
  }
  // Fits for keyway width b (ISO 286 tolerance classes).
  var KEY_FITS = [
    { id: 'free', shaft: 'H9', hub: 'D10', en: 'Free (sliding hub)', fr: 'Libre (moyeu coulissant)' },
    { id: 'normal', shaft: 'N9', hub: 'JS9', en: 'Normal', fr: 'Normal' },
    { id: 'close', shaft: 'P9', hub: 'P9', en: 'Close (tight, reversing loads)', fr: 'Serré (charges alternées)' }
  ];
  function keyForShaft(d) {
    if (!(d > 6) || d > 500) return -1;
    for (var i = 0; i < KEYS.length; i++) if (d > KEYS[i].dOver && d <= KEYS[i].dTo) return i;
    return -1;
  }

  /* ---------------- Pins ----------------
     ISO 2338 parallel pins (unhardened): d 0.6–50, tolerance m6 or h8; c ≈ chamfer. */
  var PINS_2338 = [
    [0.6, 0.12], [0.8, 0.16], [1, 0.2], [1.2, 0.25], [1.5, 0.3], [2, 0.35], [2.5, 0.4], [3, 0.5], [4, 0.63], [5, 0.8],
    [6, 1.2], [8, 1.6], [10, 2], [12, 2.5], [16, 3], [20, 3.5], [25, 4], [30, 5], [40, 6.3], [50, 8]
  ].map(function (r) { return { d: r[0], c: r[1] }; });
  // ISO 8734 hardened parallel pins: d 1–20, tolerance m6.
  var PINS_8734 = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20];
  var PIN_TYPES = [
    { id: 'iso2338', std: 'ISO 2338', pin: 'm6 / h8', hole: 'H7',
      en: 'Parallel pin, unhardened', fr: 'Goupille cylindrique non trempée', range: '0,6 – 50' },
    { id: 'iso8734', std: 'ISO 8734', pin: 'm6', hole: 'H7',
      en: 'Parallel pin, hardened (dowel)', fr: 'Goupille cylindrique trempée', range: '1 – 20' },
    { id: 'iso2339', std: 'ISO 2339', pin: 'h10 (d)', hole: { en: 'reamed taper 1:50', fr: 'alésé conique 1:50' },
      en: 'Taper pin, taper 1:50 (d = small end)', fr: 'Goupille conique 1:50 (d = petit diamètre)', range: '0,6 – 50' },
    { id: 'iso8752', std: 'ISO 8752', pin: { en: 'd = nominal hole Ø', fr: 'd = Ø nominal du trou' }, hole: 'H12',
      en: 'Spring (slotted) pin, heavy duty', fr: 'Goupille élastique fendue, série épaisse', range: '1 – 50' },
    { id: 'iso13337', std: 'ISO 13337', pin: { en: 'd = nominal hole Ø', fr: 'd = Ø nominal du trou' }, hole: 'H12',
      en: 'Spring (slotted) pin, light duty', fr: 'Goupille élastique fendue, série mince', range: '2 – 50' }
  ];

  /* ---------------- Rolling bearings — ISO 492 normal tolerance class (radial bearings) ----------------
     Upper deviation is 0; lower in µm. (verified: JTEKT/Koyo table 7-3, class 0) */
  var BRG_INNER = { bounds: [2.5, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000],
    lower: [-8, -8, -8, -10, -12, -15, -20, -25, -30, -35, -40, -45, -50, -75, -100, -125, -160, -200], from: 0.6 };
  var BRG_OUTER = { bounds: [6, 18, 30, 50, 80, 120, 150, 180, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500],
    lower: [-8, -8, -9, -11, -13, -15, -18, -25, -30, -35, -40, -45, -50, -75, -100, -125, -160, -200, -250], from: 2.5 };
  function brgDev(tab, x) {
    if (!(x > tab.from)) return null;
    for (var i = 0; i < tab.bounds.length; i++) if (x <= tab.bounds[i]) return { index: i, upper: 0, lower: tab.lower[i] };
    return null;
  }
  // Deep-groove ball bearings, dimension series 10 / 02 / 03 (ISO 15). [bore code] -> [d, D, B]
  var DGBB = {
    '60': { '00': [10, 26, 8], '01': [12, 28, 8], '02': [15, 32, 9], '03': [17, 35, 10], '04': [20, 42, 12], '05': [25, 47, 12],
      '06': [30, 55, 13], '07': [35, 62, 14], '08': [40, 68, 15], '09': [45, 75, 16], '10': [50, 80, 16], '11': [55, 90, 18],
      '12': [60, 95, 18], '13': [65, 100, 18], '14': [70, 110, 20], '15': [75, 115, 20], '16': [80, 125, 22], '17': [85, 130, 22],
      '18': [90, 140, 24], '19': [95, 145, 24], '20': [100, 150, 24] },
    '62': { '00': [10, 30, 9], '01': [12, 32, 10], '02': [15, 35, 11], '03': [17, 40, 12], '04': [20, 47, 14], '05': [25, 52, 15],
      '06': [30, 62, 16], '07': [35, 72, 17], '08': [40, 80, 18], '09': [45, 85, 19], '10': [50, 90, 20], '11': [55, 100, 21],
      '12': [60, 110, 22], '13': [65, 120, 23], '14': [70, 125, 24], '15': [75, 130, 25], '16': [80, 140, 26], '17': [85, 150, 28],
      '18': [90, 160, 30], '19': [95, 170, 32], '20': [100, 180, 34] },
    '63': { '00': [10, 35, 11], '01': [12, 37, 12], '02': [15, 42, 13], '03': [17, 47, 14], '04': [20, 52, 15], '05': [25, 62, 17],
      '06': [30, 72, 19], '07': [35, 80, 21], '08': [40, 90, 23], '09': [45, 100, 25], '10': [50, 110, 27], '11': [55, 120, 29],
      '12': [60, 130, 31], '13': [65, 140, 33], '14': [70, 150, 35], '15': [75, 160, 37], '16': [80, 170, 39], '17': [85, 180, 41],
      '18': [90, 190, 43], '19': [95, 200, 45], '20': [100, 215, 47] }
  };
  // Bore from the 2-digit code: 00=10, 01=12, 02=15, 03=17, 04 and up = code × 5.
  function boreFromCode(code) {
    var n = parseInt(code, 10);
    if (!isFinite(n) || n < 0) return null;
    return [10, 12, 15, 17][n] || (n >= 4 ? n * 5 : null);
  }
  function bearing(designation) {
    var m = /^\s*(6[023])(\d{2})\s*(?:-?\s*[A-Z0-9/]*)?$/i.exec(designation || '');
    if (!m) return null;
    var row = DGBB[m[1]][m[2]];
    if (!row) return { series: m[1], code: m[2], d: boreFromCode(m[2]) };
    return { series: m[1], code: m[2], d: row[0], D: row[1], B: row[2] };
  }
  // Recommended fits, radial ball bearings, solid steel shaft / cast-iron or steel housing (bearing catalogue guidance).
  var SHAFT_FITS = [
    { cond: { en: 'Rotating inner ring load — light / variable (P ≤ 0.05 C)', fr: 'Bague intérieure tournante — charge légère / variable (P ≤ 0,05 C)' },
      rows: [['≤ 17', 'js5'], ['17 – 100', 'j6'], ['100 – 140', 'k6']] },
    { cond: { en: 'Rotating inner ring load — normal / heavy (P > 0.05 C)', fr: 'Bague intérieure tournante — charge normale / forte (P > 0,05 C)' },
      rows: [['≤ 10', 'js5'], ['10 – 17', 'j5'], ['17 – 100', 'k5'], ['100 – 140', 'm5'], ['140 – 200', 'm6']] },
    { cond: { en: 'Stationary inner ring load — ring must slide axially', fr: 'Bague intérieure fixe / charge — déplacement axial nécessaire' },
      rows: [[{ en: 'all', fr: 'tous' }, 'g6']] },
    { cond: { en: 'Stationary inner ring load — no axial sliding needed', fr: 'Bague intérieure fixe / charge — pas de déplacement axial' },
      rows: [[{ en: 'all', fr: 'tous' }, 'h6']] },
    { cond: { en: 'Axial loads only', fr: 'Charges axiales seules' },
      rows: [[{ en: 'all', fr: 'tous' }, 'j6 / js6']] }
  ];
  var HOUSING_FITS = [
    { cond: { en: 'Rotating outer ring load — heavy loads, thin-walled housing, shocks', fr: 'Bague extérieure tournante — charge forte, logement mince, chocs' }, fit: 'P7' },
    { cond: { en: 'Rotating outer ring load — normal / heavy loads', fr: 'Bague extérieure tournante — charge normale / forte' }, fit: 'N7' },
    { cond: { en: 'Rotating outer ring load — light / variable loads', fr: 'Bague extérieure tournante — charge légère / variable' }, fit: 'M7' },
    { cond: { en: 'Load direction indeterminate — heavy shock loads', fr: 'Direction de charge indéterminée — chocs importants' }, fit: 'M7' },
    { cond: { en: 'Load direction indeterminate — normal / heavy, no axial sliding', fr: 'Direction indéterminée — charge normale / forte, sans déplacement axial' }, fit: 'K7' },
    { cond: { en: 'Load direction indeterminate — light / normal, axial sliding desirable', fr: 'Direction indéterminée — charge légère / normale, déplacement axial souhaité' }, fit: 'J7' },
    { cond: { en: 'Stationary outer ring load — all loads', fr: 'Bague extérieure fixe / charge — toutes charges' }, fit: 'H7' },
    { cond: { en: 'Stationary outer ring load — simple conditions (split housing)', fr: 'Bague extérieure fixe / charge — conditions simples (palier en deux parties)' }, fit: 'H8' },
    { cond: { en: 'Stationary outer ring load — heat conduction through the shaft', fr: 'Bague extérieure fixe / charge — échauffement par l’arbre' }, fit: 'G7' }
  ];

  /* ---------------- Roller chains — ISO 606 (simplex) ----------------
     [ISO no., ANSI no., pitch p, inner width b1 min, roller d1 max, pin d2 max, min tensile strength kN]
     B-series & A-series to 16A verified against iwis / Renold catalogues (ISO 606:2004 values). */
  var CHAINS = [
    ['05B', '', 8.00, 3.00, 5.00, 2.31, 4.4], ['06B', '', 9.525, 5.72, 6.35, 3.28, 8.9],
    ['08B', '', 12.70, 7.75, 8.51, 4.45, 17.8], ['10B', '', 15.875, 9.65, 10.16, 5.08, 22.2],
    ['12B', '', 19.05, 11.68, 12.07, 5.72, 28.9], ['16B', '', 25.40, 17.02, 15.88, 8.28, 60.0],
    ['20B', '', 31.75, 19.56, 19.05, 10.19, 95.0], ['24B', '', 38.10, 25.40, 25.40, 14.63, 160],
    ['28B', '', 44.45, 30.99, 27.94, 15.90, 200], ['32B', '', 50.80, 30.99, 29.21, 17.81, 250],
    ['08A', '40', 12.70, 7.85, 7.92, 3.98, 13.9], ['10A', '50', 15.875, 9.40, 10.16, 5.09, 21.8],
    ['12A', '60', 19.05, 12.57, 11.91, 5.96, 31.3], ['16A', '80', 25.40, 15.75, 15.88, 7.94, 55.6],
    ['20A', '100', 31.75, 18.90, 19.05, 9.54, 87.0], ['24A', '120', 38.10, 25.22, 22.23, 11.11, 125],
    ['28A', '140', 44.45, 25.22, 25.40, 12.71, 170], ['32A', '160', 50.80, 31.55, 28.58, 14.29, 223]
  ].map(function (r) { return { iso: r[0], ansi: r[1], p: r[2], b1: r[3], d1: r[4], d2: r[5], fu: r[6] }; });

  // Sprocket geometry (ISO 606 formulas). p pitch, z teeth, d1 roller diameter.
  function sprocket(p, z, d1) {
    if (!(p > 0) || !(d1 > 0) || !(z >= 5) || Math.round(z) !== z) return null;
    var d = p / Math.sin(Math.PI / z);
    var df = d - d1;
    return {
      d: d,                                         // pitch circle diameter
      df: df,                                       // root diameter
      daMax: d + 1.25 * p - d1,                     // tip diameter, max
      daMin: d + p * (1 - 1.6 / z) - d1,            // tip diameter, min
      dRmin: 1.005 * d1 + 0.10,                     // roller seating diameter, min
      caliper: z % 2 ? d * Math.cos(Math.PI / (2 * z)) - d1 : df  // measuring dimension over the roots (odd z: over opposite tooth gap)
    };
  }

  /* ---------------- V-belts ----------------
     ISO 4184 sections: [section, top width, height, datum width, groove 34° up to datum Ø] */
  var VBELTS = [
    ['Z', 10, 6, 8.5, 80], ['A', 13, 8, 11, 118], ['B', 17, 11, 14, 190], ['C', 22, 14, 19, 315],
    ['SPZ', 9.7, 8, 8.5, 80], ['SPA', 12.7, 10, 11, 118], ['SPB', 16.3, 13, 14, 190], ['SPC', 22, 18, 19, 315]
  ].map(function (r) { return { section: r[0], top: r[1], h: r[2], wd: r[3], groove34: r[4], narrow: r[0].indexOf('SP') === 0 }; });

  /* ---------------- Gears ---------------- */
  // ISO 54 module series (mm). Series I preferred.
  var MODULES_I = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50];
  var MODULES_II = [1.125, 1.375, 1.75, 2.25, 2.75, 3.5, 4.5, 5.5, 7, 9, 11, 14, 18, 22, 28, 36, 45];

  function inv(a) { return Math.tan(a) - a; }
  // Inverse involute (Newton).
  function invInv(v) {
    var a = Math.cbrt(3 * v);
    for (var i = 0; i < 30; i++) {
      var f = Math.tan(a) - a - v;
      var df = Math.tan(a) * Math.tan(a);
      var step = f / df;
      a -= step;
      if (Math.abs(step) < 1e-14) break;
    }
    return a;
  }

  /* Cylindrical involute gear (ISO 21771 / DIN 3960, basic rack ISO 53: ha* = 1, c* = 0.25).
     g = { mn, z, alphaN (deg), beta (deg), x }  — z < 0 not supported (external gears only). */
  function gear(g) {
    var mn = g.mn, z = g.z, an = (g.alphaN == null ? 20 : g.alphaN) * D2R, b = (g.beta || 0) * D2R, x = g.x || 0;
    if (!(mn > 0) || !(z >= 1) || Math.round(z) !== z || !(an > 0 && an < Math.PI / 4) || Math.abs(b) >= Math.PI / 2.2) return null;
    var mt = mn / Math.cos(b);
    var at = Math.atan(Math.tan(an) / Math.cos(b));
    var d = z * mt;
    var db = d * Math.cos(at);
    var bb = Math.asin(Math.sin(b) * Math.cos(an));            // base helix angle
    var da = d + 2 * mn * (1 + x);
    var df = d - 2 * mn * (1.25 - x);
    var r = {
      mt: mt, alphaT: at / D2R, d: d, db: db, da: da, df: df,
      pn: Math.PI * mn, pt: Math.PI * mt, pbt: Math.PI * mt * Math.cos(at),
      ha: mn * (1 + x), hf: mn * (1.25 - x), h: 2.25 * mn,
      sn: mn * (Math.PI / 2 + 2 * x * Math.tan(an)),              // normal tooth thickness on reference circle
      zn: z / (Math.cos(bb) * Math.cos(bb) * Math.cos(Math.abs(b))), // virtual number of teeth (approx.)
      betaB: bb / D2R,
      zMinUndercut: 2 * Math.cos(Math.abs(b)) / (Math.sin(at) * Math.sin(at)) // theoretical (x = 0)
    };
    // Base tangent length (span over k teeth), measured in the normal plane.
    var span = spanMeasurement({ mn: mn, z: z, alphaN: g.alphaN == null ? 20 : g.alphaN, beta: g.beta || 0, x: x });
    r.k = span.k; r.Wk = span.Wk;
    return r;
  }

  // Wk = mn·cos αn·[π(k − 0.5) + z·inv αt] + 2·x·mn·sin αn ; k chosen so the anvils touch near the reference circle.
  function spanMeasurement(g, kForced) {
    var mn = g.mn, z = g.z, an = g.alphaN * D2R, b = (g.beta || 0) * D2R, x = g.x || 0;
    var at = Math.atan(Math.tan(an) / Math.cos(b));
    var d = z * mn / Math.cos(b);
    var bb = Math.asin(Math.sin(b) * Math.cos(an));
    var cosAm = d * Math.cos(at) / (d + 2 * x * mn);
    cosAm = Math.min(1, Math.max(-1, cosAm));
    var am = Math.acos(cosAm);
    var kIdeal = (z / Math.PI) * (Math.tan(am) / (Math.cos(bb) * Math.cos(bb)) - 2 * x * Math.tan(an) / z - inv(at)) + 0.5;
    var k = kForced || Math.max(1, Math.round(kIdeal));
    var Wk = mn * Math.cos(an) * (Math.PI * (k - 0.5) + z * inv(at)) + 2 * x * mn * Math.sin(an);
    return { k: k, kIdeal: kIdeal, Wk: Wk };
  }

  /* External gear pair: g1, g2 share mn, alphaN, beta. Returns reference and working centre distance. */
  function gearPair(g1, g2) {
    var a1 = gear(g1), a2 = gear(g2);
    if (!a1 || !a2) return null;
    var an = (g1.alphaN == null ? 20 : g1.alphaN) * D2R, b = (g1.beta || 0) * D2R;
    var at = Math.atan(Math.tan(an) / Math.cos(b));
    var a = (a1.d + a2.d) / 2;
    var xs = (g1.x || 0) + (g2.x || 0);
    var invAwt = inv(at) + 2 * Math.tan(an) * xs / (g1.z + g2.z);
    var awt = invInv(invAwt);
    var aw = a * Math.cos(at) / Math.cos(awt);
    // Transverse contact ratio for the pair at working centre distance.
    var ra1 = a1.da / 2, ra2 = a2.da / 2, rb1 = a1.db / 2, rb2 = a2.db / 2;
    var epsA = (Math.sqrt(ra1 * ra1 - rb1 * rb1) + Math.sqrt(ra2 * ra2 - rb2 * rb2) - aw * Math.sin(awt)) / a1.pbt;
    return { g1: a1, g2: a2, a: a, aw: aw, alphaWt: awt / D2R, ratio: g2.z / g1.z, epsAlpha: epsA };
  }

  /* Cylindrical worm & wheel (axial module mx, DIN 3975 / GB 10085 proportions: ha* = 1, c* = 0.2).
     w = { mx, z1 (starts), q (diameter factor), z2, x2, alpha (axial pressure angle, deg) } */
  function worm(w) {
    var mx = w.mx, z1 = w.z1, q = w.q, z2 = w.z2, x2 = w.x2 || 0;
    if (!(mx > 0) || !(z1 >= 1) || !(q > 0) || !(z2 >= 1) || Math.round(z1) !== z1 || Math.round(z2) !== z2) return null;
    var d1 = q * mx, d2 = z2 * mx;
    var gamma = Math.atan(z1 / q);
    return {
      d1: d1, da1: d1 + 2 * mx, df1: d1 - 2.4 * mx,
      d2: d2, da2: d2 + 2 * mx * (1 + x2), df2: d2 - 2 * mx * (1.2 - x2),
      gamma: gamma / D2R, px: Math.PI * mx, pz: Math.PI * mx * z1,
      mn: mx * Math.cos(gamma), a: (d1 + d2) / 2 + x2 * mx, ratio: z2 / z1
    };
  }

  TH.engine.elements = {
    keys: KEYS, keyForShaft: keyForShaft, keyDepthTol: keyDepthTol, keyRadius: keyRadius, keyFits: KEY_FITS,
    pins2338: PINS_2338, pins8734: PINS_8734, pinTypes: PIN_TYPES,
    bearingInner: function (d) { return brgDev(BRG_INNER, d); },
    bearingOuter: function (D) { return brgDev(BRG_OUTER, D); },
    bearingTables: { inner: BRG_INNER, outer: BRG_OUTER },
    dgbb: DGBB, bearing: bearing, boreFromCode: boreFromCode, shaftFits: SHAFT_FITS, housingFits: HOUSING_FITS,
    chains: CHAINS, sprocket: sprocket, vbelts: VBELTS,
    modulesI: MODULES_I, modulesII: MODULES_II,
    inv: inv, invInv: invInv, gear: gear, spanMeasurement: spanMeasurement, gearPair: gearPair, worm: worm
  };
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
