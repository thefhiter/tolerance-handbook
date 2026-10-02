/* Appendix engine — fastener holes, tapers, lifting eyes, materials & blank weight, units, roughness.
   Pure data + functions, no DOM. Lengths in mm unless stated. */
(function (TH) {
  'use strict';

  /* ---------- Clearance holes, ISO 273 (fine / medium / coarse series), mm ----------
     Identical values are reproduced in ASME B18.2.8 (close / normal / loose). */
  var CLEARANCE = [
    // [thread, nominal d, fine, medium, coarse]
    ['M1.6', 1.6, 1.7, 1.8, 2.0], ['M2', 2, 2.2, 2.4, 2.6], ['M2.5', 2.5, 2.7, 2.9, 3.1],
    ['M3', 3, 3.2, 3.4, 3.6], ['M3.5', 3.5, 3.7, 3.9, 4.2], ['M4', 4, 4.3, 4.5, 4.8],
    ['M5', 5, 5.3, 5.5, 5.8], ['M6', 6, 6.4, 6.6, 7.0], ['M8', 8, 8.4, 9, 10],
    ['M10', 10, 10.5, 11, 12], ['M12', 12, 13, 13.5, 14.5], ['M14', 14, 15, 15.5, 16.5],
    ['M16', 16, 17, 17.5, 18.5], ['M18', 18, 19, 20, 21], ['M20', 20, 21, 22, 24],
    ['M22', 22, 23, 24, 26], ['M24', 24, 25, 26, 28], ['M27', 27, 28, 30, 32],
    ['M30', 30, 31, 33, 35], ['M33', 33, 34, 36, 38], ['M36', 36, 37, 39, 42],
    ['M39', 39, 40, 42, 45], ['M42', 42, 43, 45, 48], ['M45', 45, 46, 48, 52],
    ['M48', 48, 50, 52, 56], ['M52', 52, 54, 56, 62], ['M56', 56, 58, 62, 66],
    ['M60', 60, 62, 66, 70], ['M64', 64, 66, 70, 74]
  ].map(function (r) { return { size: r[0], d: r[1], fine: r[2], medium: r[3], coarse: r[4] }; });

  /* ---------- Counterbores for hexagon socket head cap screws ----------
     dk = head Ø max, k = head height max (ISO 4762);
     d1 = counterbore Ø (DIN 974-1, row 1: ISO 4762 without washer, tolerance H13);
     t  = counterbore depth for a flush head (common workshop value, k + allowance), given up to M24. */
  var CBORE = {
    M3:  { dk: 5.5, k: 3,  d1: 6.5, t: 3.4 },
    M4:  { dk: 7,   k: 4,  d1: 8,   t: 4.4 },
    M5:  { dk: 8.5, k: 5,  d1: 10,  t: 5.4 },
    M6:  { dk: 10,  k: 6,  d1: 11,  t: 6.4 },
    M8:  { dk: 13,  k: 8,  d1: 15,  t: 8.6 },
    M10: { dk: 16,  k: 10, d1: 18,  t: 10.6 },
    M12: { dk: 18,  k: 12, d1: 20,  t: 12.6 },
    M16: { dk: 24,  k: 16, d1: 26,  t: 16.6 },
    M20: { dk: 30,  k: 20, d1: 33,  t: 20.6 },
    M24: { dk: 36,  k: 24, d1: 40,  t: 24.8 },
    M30: { dk: 45,  k: 30, d1: 50,  t: null },
    M36: { dk: 54,  k: 36, d1: 58,  t: null }
  };

  /* ---------- Countersinks for hexagon socket countersunk screws, ISO 10642 (90°) ----------
     dkTh = theoretical head Ø max, dkMin = actual head Ø min, k = head height max (ISO 10642);
     d2 = countersink Ø, t = countersink depth for a flush head (DIN 74 for ISO 10642). */
  var CSINK = {
    M3:  { dkTh: 6.72,  dkMin: 5.54,  k: 1.86,  d2: 6.9,  t: 1.8 },
    M4:  { dkTh: 8.96,  dkMin: 7.53,  k: 2.48,  d2: 9.2,  t: 2.3 },
    M5:  { dkTh: 11.20, dkMin: 9.43,  k: 3.1,   d2: 11.5, t: 3.0 },
    M6:  { dkTh: 13.44, dkMin: 11.34, k: 3.72,  d2: 13.7, t: 3.6 },
    M8:  { dkTh: 17.92, dkMin: 15.24, k: 4.96,  d2: 18.3, t: 4.6 },
    M10: { dkTh: 22.40, dkMin: 19.22, k: 6.2,   d2: 22.7, t: 5.9 },
    M12: { dkTh: 26.88, dkMin: 23.12, k: 7.44,  d2: 27.2, t: 6.9 },
    M16: { dkTh: 33.60, dkMin: 29.01, k: 8.8,   d2: 34.0, t: 8.2 },
    M20: { dkTh: 40.32, dkMin: 36.05, k: 10.16, d2: 40.7, t: 9.4 }
  };

  function holesFor(size) {
    var c = null;
    for (var i = 0; i < CLEARANCE.length; i++) if (CLEARANCE[i].size === size) c = CLEARANCE[i];
    if (!c) return null;
    return { size: size, d: c.d, clearance: c, cbore: CBORE[size] || null, csink: CSINK[size] || null };
  }

  /* ---------- Tapers ---------- */
  var RAD = 180 / Math.PI;

  // Taper from dimensions: D large Ø, d small Ø, L axial length. Optional Lw = workpiece length for tailstock set-over.
  function taper(D, d, L, Lw) {
    if (!(isFinite(D) && isFinite(d) && isFinite(L)) || L <= 0 || D < 0 || d < 0 || D <= d) return null;
    var C = (D - d) / L;                      // taper ratio (Ø change per unit length)
    var half = Math.atan((D - d) / (2 * L)) * RAD;
    var r = {
      C: C, ratio: 1 / C,                     // expressed as 1 : ratio
      halfAngle: half, angle: 2 * half,
      slope: (D - d) / (2 * L)               // radial change per unit length
    };
    if (isFinite(Lw) && Lw > 0) r.setOver = (D - d) / 2 * (Lw / L);
    return r;
  }
  // Small diameter from D, ratio (1:x) and length.
  function smallDia(D, ratio, L) {
    if (!(isFinite(D) && isFinite(ratio) && isFinite(L)) || ratio <= 0 || L < 0) return NaN;
    return D - L / ratio;
  }
  // Angle from taper ratio 1:x  -> included angle (deg)
  function angleFromRatio(x) { return 2 * Math.atan(1 / (2 * x)) * RAD; }

  // Decimal degrees -> {d, m, s} (s rounded to 0.1")
  function dms(deg) {
    var sign = deg < 0 ? -1 : 1; deg = Math.abs(deg);
    var tot = Math.round(deg * 36000) / 10;   // arc seconds, 0.1" resolution
    var d = Math.floor(tot / 3600); tot -= d * 3600;
    var m = Math.floor(tot / 60); var s = Math.round((tot - m * 60) * 10) / 10;
    if (s >= 60) { s -= 60; m += 1; }
    if (m >= 60) { m -= 60; d += 1; }
    return { sign: sign, d: d, m: m, s: s };
  }

  // Morse tapers, ISO 296: D1 = gauge diameter (mm) at the gauge line, taper 1:x.
  var MORSE = [
    { id: 'MT0', D: 9.045, x: 19.212 }, { id: 'MT1', D: 12.065, x: 20.047 },
    { id: 'MT2', D: 17.780, x: 20.020 }, { id: 'MT3', D: 23.825, x: 19.922 },
    { id: 'MT4', D: 31.267, x: 19.254 }, { id: 'MT5', D: 44.399, x: 19.002 },
    { id: 'MT6', D: 63.348, x: 19.180 }
  ];
  // Metric tapers, ISO 296: taper 1:20, size = gauge diameter.
  var METRIC_TAPER = [4, 6, 80, 100, 120, 160, 200].map(function (n) { return { id: 'ME ' + n, D: n, x: 20 }; });
  // Steep tapers 7:24 (ISO 297 / ISO 7388-1 SK, DIN 69871, CAT): gauge diameter.
  var STEEP = [
    { id: '30', D: 31.75 }, { id: '40', D: 44.45 }, { id: '45', D: 57.15 },
    { id: '50', D: 69.85 }, { id: '55', D: 88.9 }, { id: '60', D: 107.95 }
  ];
  var STEEP_RATIO = 24 / 7;

  // ISO 1119 series of conical tapers: [label, included angle deg (exact for the angle-defined ones) | ratio x].
  var ISO1119 = [
    { label: '120°', angle: 120 }, { label: '90°', angle: 90 }, { label: '75°', angle: 75 },
    { label: '60°', angle: 60 }, { label: '45°', angle: 45 }, { label: '30°', angle: 30 },
    { label: '1:3', x: 3 }, { label: '1:5', x: 5 }, { label: '1:10', x: 10 }, { label: '1:20', x: 20 },
    { label: '1:50', x: 50 }, { label: '1:100', x: 100 }, { label: '1:200', x: 200 }, { label: '1:500', x: 500 },
    { label: '7:24', x: 24 / 7 }
  ].map(function (t) {
    if (t.angle != null) t.x = 1 / (2 * Math.tan(t.angle / 2 / RAD));
    else t.angle = angleFromRatio(t.x);
    t.C = 1 / t.x;
    return t;
  });

  /* ---------- Lifting eye bolts DIN 580 / eye nuts DIN 582 (C15E) ----------
     Working load limit for ONE eye loaded axially (straight vertical pull), kg.
     Angled or paired loading reduces the WLL — values differ between editions/makers, so
     they are deliberately not tabulated here. */
  var EYEBOLT = [
    ['M8', 140], ['M10', 230], ['M12', 340], ['M16', 700], ['M20', 1200], ['M24', 1800],
    ['M30', 3200], ['M36', 4600], ['M42', 6300], ['M48', 8600]
  ].map(function (r) { return { size: r[0], wll: r[1] }; });

  /* ---------- Materials: typical density at room temperature, g/cm³ (= kg/dm³) ---------- */
  var MATERIALS = [
    { id: 'steel', g: 'steel', en: 'Carbon / alloy steel', fr: 'Acier au carbone / allié', rho: 7.85 },
    { id: 'ss304', g: 'steel', en: 'Stainless 1.4301 (304)', fr: 'Inox 1.4301 (304)', rho: 7.90 },
    { id: 'ss316', g: 'steel', en: 'Stainless 1.4401 (316)', fr: 'Inox 1.4401 (316)', rho: 8.00 },
    { id: 'ss430', g: 'steel', en: 'Stainless 1.4016 (430, ferritic)', fr: 'Inox 1.4016 (430, ferritique)', rho: 7.70 },
    { id: 'tool', g: 'steel', en: 'Tool steel (cold work)', fr: 'Acier à outils (travail à froid)', rho: 7.70 },
    { id: 'gjl', g: 'iron', en: 'Grey cast iron (EN-GJL)', fr: 'Fonte grise (EN-GJL)', rho: 7.20 },
    { id: 'gjs', g: 'iron', en: 'Ductile cast iron (EN-GJS)', fr: 'Fonte GS (EN-GJS)', rho: 7.10 },
    { id: 'al', g: 'light', en: 'Aluminium (pure, 1050)', fr: 'Aluminium (pur, 1050)', rho: 2.70 },
    { id: 'al6082', g: 'light', en: 'Aluminium 6061 / 6082', fr: 'Aluminium 6061 / 6082', rho: 2.70 },
    { id: 'al5083', g: 'light', en: 'Aluminium 5083', fr: 'Aluminium 5083', rho: 2.66 },
    { id: 'al2024', g: 'light', en: 'Aluminium 2024', fr: 'Aluminium 2024', rho: 2.78 },
    { id: 'al7075', g: 'light', en: 'Aluminium 7075', fr: 'Aluminium 7075', rho: 2.81 },
    { id: 'mg', g: 'light', en: 'Magnesium alloy', fr: 'Alliage de magnésium', rho: 1.80 },
    { id: 'ti', g: 'light', en: 'Titanium grade 2', fr: 'Titane grade 2', rho: 4.51 },
    { id: 'ti64', g: 'light', en: 'Titanium Ti-6Al-4V', fr: 'Titane Ti-6Al-4V', rho: 4.43 },
    { id: 'cu', g: 'copper', en: 'Copper', fr: 'Cuivre', rho: 8.94 },
    { id: 'brass', g: 'copper', en: 'Brass CuZn39Pb3', fr: 'Laiton CuZn39Pb3', rho: 8.47 },
    { id: 'bronze', g: 'copper', en: 'Tin bronze CuSn8', fr: 'Bronze CuSn8', rho: 8.80 },
    { id: 'albz', g: 'copper', en: 'Aluminium bronze CuAl10Ni5Fe4', fr: 'Cupro-aluminium CuAl10Ni5Fe4', rho: 7.60 },
    { id: 'zn', g: 'other', en: 'Zinc', fr: 'Zinc', rho: 7.13 },
    { id: 'ni', g: 'other', en: 'Nickel', fr: 'Nickel', rho: 8.90 },
    { id: 'pb', g: 'other', en: 'Lead', fr: 'Plomb', rho: 11.34 },
    { id: 'pom', g: 'plastic', en: 'POM-C (acetal)', fr: 'POM-C (polyacétal)', rho: 1.41 },
    { id: 'pa6', g: 'plastic', en: 'PA 6 (nylon)', fr: 'PA 6 (polyamide)', rho: 1.14 },
    { id: 'pehd', g: 'plastic', en: 'PE-HD', fr: 'PE-HD', rho: 0.95 },
    { id: 'peuhmw', g: 'plastic', en: 'PE-UHMW', fr: 'PE-UHMW', rho: 0.93 },
    { id: 'pp', g: 'plastic', en: 'PP', fr: 'PP', rho: 0.91 },
    { id: 'ptfe', g: 'plastic', en: 'PTFE', fr: 'PTFE', rho: 2.17 },
    { id: 'pvc', g: 'plastic', en: 'PVC-U', fr: 'PVC-U', rho: 1.40 },
    { id: 'pmma', g: 'plastic', en: 'PMMA (acrylic)', fr: 'PMMA (acrylique)', rho: 1.19 },
    { id: 'pc', g: 'plastic', en: 'PC (polycarbonate)', fr: 'PC (polycarbonate)', rho: 1.20 },
    { id: 'abs', g: 'plastic', en: 'ABS', fr: 'ABS', rho: 1.04 },
    { id: 'peek', g: 'plastic', en: 'PEEK', fr: 'PEEK', rho: 1.31 }
  ];
  var MATERIAL_GROUPS = [
    { id: 'steel', en: 'Steels', fr: 'Aciers' }, { id: 'iron', en: 'Cast irons', fr: 'Fontes' },
    { id: 'light', en: 'Light alloys', fr: 'Alliages légers' }, { id: 'copper', en: 'Copper alloys', fr: 'Alliages cuivreux' },
    { id: 'other', en: 'Other metals', fr: 'Autres métaux' }, { id: 'plastic', en: 'Plastics', fr: 'Plastiques' }
  ];

  /* Blank weight. shape: round {d,L} | tube {D,d,L} | flat {a,b,L} | square {a,L} | hex {s,L} | ring {D,d,h}
     rho in g/cm³. Returns {area mm², volume mm³, mass kg, kgPerM (prismatic shapes)} or {error}. */
  function blank(shape, p, rho) {
    var A, len, ok = function (v) { return isFinite(v) && v > 0; };
    if (!ok(rho)) return { error: 'rho' };
    switch (shape) {
      case 'round': if (!ok(p.d) || !ok(p.L)) return { error: 'dim' }; A = Math.PI * p.d * p.d / 4; len = p.L; break;
      case 'tube':
        if (!ok(p.D) || !ok(p.L) || !(p.d >= 0)) return { error: 'dim' };
        if (p.d >= p.D) return { error: 'inner' };
        A = Math.PI * (p.D * p.D - p.d * p.d) / 4; len = p.L; break;
      case 'flat': if (!ok(p.a) || !ok(p.b) || !ok(p.L)) return { error: 'dim' }; A = p.a * p.b; len = p.L; break;
      case 'square': if (!ok(p.a) || !ok(p.L)) return { error: 'dim' }; A = p.a * p.a; len = p.L; break;
      case 'hex': if (!ok(p.s) || !ok(p.L)) return { error: 'dim' }; A = Math.sqrt(3) / 2 * p.s * p.s; len = p.L; break;
      case 'ring':
        if (!ok(p.D) || !ok(p.h) || !(p.d >= 0)) return { error: 'dim' };
        if (p.d >= p.D) return { error: 'inner' };
        A = Math.PI * (p.D * p.D - p.d * p.d) / 4; len = p.h; break;
      default: return { error: 'shape' };
    }
    var V = A * len;
    return { area: A, volume: V, mass: V * rho * 1e-6, kgPerM: shape === 'ring' ? null : A * rho * 1e-3 };
  }

  /* ---------- Units (factor = value of 1 unit in the base unit; exact where defined) ---------- */
  var LBF = 4.4482216152605;            // N, exact by definition of lb and gn
  var UNITS = {
    length: { base: 'mm', u: [
      ['mm', 1], ['µm', 0.001], ['cm', 10], ['m', 1000], ['in', 25.4], ['thou', 0.0254], ['ft', 304.8]] },
    force: { base: 'N', u: [
      ['N', 1], ['daN', 10], ['kN', 1000], ['kgf', 9.80665], ['lbf', LBF]] },
    torque: { base: 'N·m', u: [
      ['N·m', 1], ['N·cm', 0.01], ['kgf·m', 9.80665], ['kgf·cm', 0.0980665],
      ['lbf·ft', LBF * 0.3048], ['lbf·in', LBF * 0.0254], ['ozf·in', LBF * 0.0254 / 16]] },
    pressure: { base: 'MPa', u: [
      ['MPa', 1], ['N/mm²', 1], ['bar', 0.1], ['kPa', 0.001], ['Pa', 1e-6], ['GPa', 1000],
      ['psi', LBF / (0.0254 * 0.0254) * 1e-6], ['ksi', LBF / (0.0254 * 0.0254) * 1e-3],
      ['kgf/cm²', 0.0980665], ['kgf/mm²', 9.80665], ['atm', 0.101325]] },
    mass: { base: 'kg', u: [
      ['kg', 1], ['g', 0.001], ['t', 1000], ['lb', 0.45359237], ['oz', 0.028349523125]] },
    speed: { base: 'm/min', u: [
      ['m/min', 1], ['m/s', 60], ['mm/s', 0.06], ['mm/min', 0.001], ['ft/min', 0.3048], ['in/min', 0.0254]] },
    angle: { base: '°', u: [
      ['°', 1], ['′', 1 / 60], ['″', 1 / 3600], ['rad', RAD], ['mrad', RAD / 1000], ['gon', 0.9], ['rev', 360]] }
  };
  function convert(cat, value, from) {
    if (cat === 'temperature') return convertTemp(value, from);
    var c = UNITS[cat]; if (!c || !isFinite(value)) return null;
    var f = null;
    c.u.forEach(function (u) { if (u[0] === from) f = u[1]; });
    if (f == null) return null;
    var base = value * f;
    return c.u.map(function (u) { return { unit: u[0], value: base / u[1] }; });
  }
  function convertTemp(v, from) {
    if (!isFinite(v)) return null;
    var c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : from === 'K' ? v - 273.15 : NaN;
    if (!isFinite(c)) return null;
    return [{ unit: '°C', value: c }, { unit: '°F', value: c * 9 / 5 + 32 }, { unit: 'K', value: c + 273.15 }];
  }
  var TEMP_UNITS = ['°C', '°F', 'K'];

  // Fractional inches 1/64 … 1 in → mm (reduced fractions).
  function fractions() {
    var out = [];
    for (var n = 1; n <= 64; n++) {
      var a = n, b = 64;
      while (a % 2 === 0 && b > 1) { a /= 2; b /= 2; }
      out.push({ label: b === 1 ? a + '"' : a + '/' + b + '"', inch: n / 64, mm: n / 64 * 25.4 });
    }
    return out;
  }

  /* ---------- Surface roughness ----------
     ISO 1302 roughness grade numbers N1…N12 ↔ Ra (µm). */
  var NGRADES = [
    ['N1', 0.025], ['N2', 0.05], ['N3', 0.1], ['N4', 0.2], ['N5', 0.4], ['N6', 0.8],
    ['N7', 1.6], ['N8', 3.2], ['N9', 6.3], ['N10', 12.5], ['N11', 25], ['N12', 50]
  ].map(function (r) { return { n: r[0], ra: r[1], uin: r[1] / 0.0254 }; });

  // Nearest N grade for an Ra value (geometric distance, the series doubles per grade).
  function nGrade(ra) {
    if (!(isFinite(ra) && ra > 0)) return null;
    var best = null, bd = Infinity;
    NGRADES.forEach(function (g) { var d = Math.abs(Math.log(ra / g.ra)); if (d < bd) { bd = d; best = g; } });
    return best;
  }

  // Typical (average application) Ra ranges by process, µm — after the common ASME B46.1 / handbook chart.
  var PROCESSES = [
    { g: 'cut', en: 'Flame / plasma cutting', fr: 'Oxycoupage / plasma', lo: 12.5, hi: 25 },
    { g: 'cut', en: 'Sawing', fr: 'Sciage', lo: 1.6, hi: 25 },
    { g: 'cut', en: 'Planing, shaping', fr: 'Rabotage, étau-limeur', lo: 1.6, hi: 12.5 },
    { g: 'cut', en: 'Drilling', fr: 'Perçage', lo: 1.6, hi: 6.3 },
    { g: 'cut', en: 'Milling', fr: 'Fraisage', lo: 0.8, hi: 6.3 },
    { g: 'cut', en: 'Turning, boring', fr: 'Tournage, alésage à l’outil', lo: 0.4, hi: 6.3 },
    { g: 'cut', en: 'Reaming', fr: 'Alésage à l’alésoir', lo: 0.8, hi: 3.2 },
    { g: 'cut', en: 'Broaching', fr: 'Brochage', lo: 0.8, hi: 3.2 },
    { g: 'cut', en: 'EDM', fr: 'Électroérosion', lo: 0.8, hi: 6.3 },
    { g: 'fin', en: 'Grinding', fr: 'Rectification', lo: 0.1, hi: 1.6 },
    { g: 'fin', en: 'Honing', fr: 'Pierrage (honing)', lo: 0.1, hi: 0.8 },
    { g: 'fin', en: 'Polishing', fr: 'Polissage', lo: 0.1, hi: 0.4 },
    { g: 'fin', en: 'Lapping', fr: 'Rodage', lo: 0.05, hi: 0.4 },
    { g: 'fin', en: 'Superfinishing', fr: 'Superfinition', lo: 0.025, hi: 0.2 },
    { g: 'form', en: 'Sand casting', fr: 'Moulage en sable', lo: 12.5, hi: 25 },
    { g: 'form', en: 'Investment casting', fr: 'Moulage à la cire perdue', lo: 1.6, hi: 3.2 },
    { g: 'form', en: 'Die casting', fr: 'Moulage sous pression', lo: 0.8, hi: 1.6 },
    { g: 'form', en: 'Forging', fr: 'Forgeage', lo: 3.2, hi: 12.5 },
    { g: 'form', en: 'Hot rolling', fr: 'Laminage à chaud', lo: 12.5, hi: 25 },
    { g: 'form', en: 'Cold drawing, cold rolling', fr: 'Étirage, laminage à froid', lo: 0.8, hi: 3.2 },
    { g: 'form', en: 'Extrusion', fr: 'Extrusion / filage', lo: 0.8, hi: 3.2 }
  ];
  function processesFor(ra) {
    if (!(isFinite(ra) && ra > 0)) return [];
    return PROCESSES.filter(function (p) { return ra >= p.lo - 1e-9 && ra <= p.hi + 1e-9; });
  }

  TH.engine.appendix = {
    CLEARANCE: CLEARANCE, CBORE: CBORE, CSINK: CSINK, holesFor: holesFor,
    taper: taper, smallDia: smallDia, angleFromRatio: angleFromRatio, dms: dms,
    MORSE: MORSE, METRIC_TAPER: METRIC_TAPER, STEEP: STEEP, STEEP_RATIO: STEEP_RATIO, ISO1119: ISO1119,
    EYEBOLT: EYEBOLT,
    MATERIALS: MATERIALS, MATERIAL_GROUPS: MATERIAL_GROUPS, blank: blank,
    UNITS: UNITS, TEMP_UNITS: TEMP_UNITS, convert: convert, fractions: fractions,
    NGRADES: NGRADES, nGrade: nGrade, PROCESSES: PROCESSES, processesFor: processesFor
  };
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
