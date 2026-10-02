/* ISO 286-1:2010 / ISO 286-2 — limits and fits. Pure data + rules, values in micrometres (µm).
   Hole deviations are derived from the shaft fundamental deviations with the rules of ISO 286-1 §4
   (EI = −es for A–H; ES = −ei + Δ for K–ZC where applicable), so one table serves both. */
(function (TH) {
  'use strict';

  /* ---- Standard tolerance grades (ISO 286-1 Table 1) ---- */
  // Main size ranges: "over previous up to and including".
  var MAIN = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150];
  var GRADES = ['01', '0', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  // Rows = main ranges, columns = IT01, IT0, IT1 … IT18 (µm). null = not defined.
  var IT = [
    [0.3, 0.5, 0.8, 1.2, 2, 3, 4, 6, 10, 14, 25, 40, 60, 100, 140, 250, 400, 600, 1000, 1400],
    [0.4, 0.6, 1, 1.5, 2.5, 4, 5, 8, 12, 18, 30, 48, 75, 120, 180, 300, 480, 750, 1200, 1800],
    [0.4, 0.6, 1, 1.5, 2.5, 4, 6, 9, 15, 22, 36, 58, 90, 150, 220, 360, 580, 900, 1500, 2200],
    [0.5, 0.8, 1.2, 2, 3, 5, 8, 11, 18, 27, 43, 70, 110, 180, 270, 430, 700, 1100, 1800, 2700],
    [0.6, 1, 1.5, 2.5, 4, 6, 9, 13, 21, 33, 52, 84, 130, 210, 330, 520, 840, 1300, 2100, 3300],
    [0.6, 1, 1.5, 2.5, 4, 7, 11, 16, 25, 39, 62, 100, 160, 250, 390, 620, 1000, 1600, 2500, 3900],
    [0.8, 1.2, 2, 3, 5, 8, 13, 19, 30, 46, 74, 120, 190, 300, 460, 740, 1200, 1900, 3000, 4600],
    [1, 1.5, 2.5, 4, 6, 10, 15, 22, 35, 54, 87, 140, 220, 350, 540, 870, 1400, 2200, 3500, 5400],
    [1.2, 2, 3.5, 5, 8, 12, 18, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300],
    [2, 3, 4.5, 7, 10, 14, 20, 29, 46, 72, 115, 185, 290, 460, 720, 1150, 1850, 2900, 4600, 7200],
    [2.5, 4, 6, 8, 12, 16, 23, 32, 52, 81, 130, 210, 320, 520, 810, 1300, 2100, 3200, 5200, 8100],
    [3, 5, 7, 9, 13, 18, 25, 36, 57, 89, 140, 230, 360, 570, 890, 1400, 2300, 3600, 5700, 8900],
    [4, 6, 8, 10, 15, 20, 27, 40, 63, 97, 155, 250, 400, 630, 970, 1550, 2500, 4000, 6300, 9700],
    [null, null, 9, 11, 16, 22, 32, 44, 70, 110, 175, 280, 440, 700, 1100, 1750, 2800, 4400, 7000, 11000],
    [null, null, 10, 13, 18, 25, 36, 50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200, 5000, 8000, 12500],
    [null, null, 11, 15, 21, 28, 40, 56, 90, 140, 230, 360, 560, 900, 1400, 2300, 3600, 5600, 9000, 14000],
    [null, null, 13, 18, 24, 33, 47, 66, 105, 165, 260, 420, 660, 1050, 1650, 2600, 4200, 6600, 10500, 16500],
    [null, null, 15, 21, 29, 39, 55, 78, 125, 195, 310, 500, 780, 1250, 1950, 3100, 5000, 7800, 12500, 19500],
    [null, null, 18, 25, 35, 46, 65, 92, 150, 230, 370, 600, 920, 1500, 2300, 3700, 6000, 9200, 15000, 23000],
    [null, null, 22, 30, 41, 55, 78, 110, 175, 280, 440, 700, 1100, 1750, 2800, 4400, 7000, 11000, 17500, 28000],
    [null, null, 26, 36, 50, 68, 96, 135, 210, 330, 540, 860, 1350, 2100, 3300, 5400, 8600, 13500, 21000, 33000]
  ];

  /* ---- Fundamental deviations of shafts (ISO 286-1 Table 2) ---- */
  // Intermediate ranges used by the deviation tables (41 bins).
  var FINE = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500,
    560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150];
  function mainOfFine(i) { var b = FINE[i]; for (var k = 0; k < MAIN.length; k++) if (b <= MAIN[k]) return k; return -1; }
  // Expand 21 per-main-range values to the 41 fine bins.
  function byMain(v) { return FINE.map(function (_, i) { var m = mainOfFine(i); return v[m] === undefined ? null : v[m]; }); }
  // Pad a ≤500 fine list (25 values) with optional >500 values (16).
  function fine(upTo500, above) { var a = upTo500.slice(); for (var i = 0; i < 16; i++) a.push(above ? above[i] : null); return a; }
  function nulls(n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; }

  // Upper deviation es for a … h (negative or zero).
  var ES = {
    a: fine([-270, -270, -280, -290, -290, -300, -300, -310, -320, -340, -360, -380, -410, -460, -520, -580, -660, -740, -820, -920, -1050, -1200, -1350, -1500, -1650]),
    b: fine([-140, -140, -150, -150, -150, -160, -160, -170, -180, -190, -200, -220, -240, -260, -280, -310, -340, -380, -420, -480, -540, -600, -680, -760, -840]),
    c: fine([-60, -70, -80, -95, -95, -110, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480]),
    cd: fine([-34, -46, -56].concat(nulls(22))),
    d: byMain([-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230, -260, -290, -320, -350, -390, -430, -480, -520]),
    e: byMain([-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135, -145, -160, -170, -195, -220, -240, -260, -290]),
    ef: fine([-10, -14, -18].concat(nulls(22))),
    f: byMain([-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68, -76, -80, -86, -98, -110, -120, -130, -145]),
    fg: fine([-4, -6, -8].concat(nulls(22))),
    g: byMain([-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20, -22, -24, -26, -28, -30, -32, -34, -38]),
    h: byMain([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  };
  // Lower deviation ei for k … zc (positive). k is the IT4–IT7 column; other grades use 0.
  var EI = {
    k: byMain([0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0]),
    m: byMain([2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23, 26, 30, 34, 40, 48, 58, 68, 76]),
    n: byMain([4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40, 44, 50, 56, 66, 78, 92, 110, 135]),
    p: byMain([6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68, 78, 88, 100, 120, 140, 170, 195, 240]),
    r: [10, 15, 19, 23, 23, 28, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132,
      150, 155, 175, 185, 210, 220, 250, 260, 300, 330, 370, 400, 440, 460, 550, 580],
    s: [14, 19, 23, 28, 28, 35, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252,
      280, 310, 340, 380, 430, 470, 520, 580, 640, 720, 820, 920, 1000, 1100, 1250, 1350],
    t: fine(nulls(6).concat([41, 48, 54, 66, 75, 91, 104, 122, 134, 146, 166, 180, 196, 218, 240, 268, 294, 330, 360]),
      [400, 450, 500, 560, 620, 680, 780, 840, 960, 1050, 1200, 1350, 1500, 1650, 1900, 2100]),
    u: fine([18, 23, 28, 33, 33, 41, 48, 60, 70, 87, 102, 124, 144, 170, 190, 210, 236, 258, 284, 315, 350, 390, 435, 490, 540],
      [600, 660, 740, 840, 940, 1050, 1150, 1300, 1450, 1600, 1850, 2000, 2300, 2500, 2900, 3200]),
    v: fine(nulls(4).concat([39, 47, 55, 68, 81, 102, 120, 146, 172, 202, 228, 252, 284, 310, 340, 385, 425, 475, 530, 595, 660])),
    x: fine([20, 28, 34, 40, 45, 54, 64, 80, 97, 122, 146, 178, 210, 248, 280, 310, 350, 385, 425, 475, 525, 590, 660, 740, 820]),
    y: fine(nulls(5).concat([63, 75, 94, 114, 144, 174, 214, 254, 300, 340, 380, 425, 470, 520, 580, 650, 730, 820, 920, 1000])),
    z: fine([26, 35, 42, 50, 60, 73, 88, 112, 136, 172, 210, 258, 310, 365, 415, 465, 520, 575, 640, 710, 790, 900, 1000, 1100, 1250]),
    za: fine([32, 42, 52, 64, 77, 98, 118, 148, 180, 226, 274, 335, 400, 470, 535, 600, 670, 740, 820, 920, 1000, 1150, 1300, 1450, 1600]),
    zb: fine([40, 50, 67, 90, 108, 136, 160, 200, 242, 300, 360, 445, 525, 620, 700, 780, 880, 960, 1050, 1200, 1300, 1500, 1650, 1850, 2100]),
    zc: fine([60, 80, 97, 130, 150, 188, 218, 274, 325, 405, 480, 585, 690, 800, 900, 1000, 1150, 1250, 1350, 1550, 1700, 1900, 2100, 2400, 2600])
  };
  // Shaft j: lower deviation ei, by main range ≤ 500 (j5 & j6 share a column; j8 only ≤ 3 mm).
  var J_SHAFT = {
    5: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
    6: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
    7: [-4, -4, -5, -6, -8, -10, -12, -15, -18, -21, -26, -28, -32],
    8: [-6]
  };
  // Hole J: upper deviation ES, by main range ≤ 500.
  var J_HOLE = {
    6: [2, 5, 5, 6, 8, 10, 13, 16, 18, 22, 25, 29, 33],
    7: [4, 6, 8, 10, 12, 14, 18, 22, 26, 30, 36, 39, 43],
    8: [6, 10, 12, 15, 20, 24, 28, 34, 41, 47, 55, 60, 66]
  };

  var SHAFT_LETTERS = ['a', 'b', 'c', 'cd', 'd', 'e', 'ef', 'f', 'fg', 'g', 'h', 'js', 'j', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z', 'za', 'zb', 'zc'];
  var HOLE_LETTERS = SHAFT_LETTERS.map(function (l) { return l === 'js' ? 'JS' : l.toUpperCase(); });

  function gradeIndex(g) { g = String(g); for (var i = 0; i < GRADES.length; i++) if (String(GRADES[i]) === g) return i; return -1; }
  function mainIndex(size) { return TH.rangeIndex(MAIN, size); }
  function fineIndex(size) { return TH.rangeIndex(FINE, size); }

  /** Standard tolerance in µm, or null if undefined. */
  function it(size, grade) {
    if (!(size > 0) || size > 3150) return null;
    var gi = gradeIndex(grade);
    if (gi < 0) return null;
    var g = Number(grade);
    if (size <= 1 && g >= 14) return null; // IT14–IT18 not used for sizes ≤ 1 mm
    var v = IT[mainIndex(size)][gi];
    return v == null ? null : v;
  }

  // Δ = ITn − IT(n−1), used for K, M, N up to IT8 and P … ZC up to IT7 (sizes 3 < D ≤ 500 mm).
  function delta(size, grade) {
    var g = Number(grade);
    if (!(g >= 3 && g <= 8) || size <= 3 || size > 500) return 0;
    return it(size, g) - it(size, g - 1);
  }

  var E = function (code) { return { error: code }; };

  /** Shaft fundamental deviation → {es, ei} given IT. */
  function shaftDev(size, letter, grade, T) {
    var fi = fineIndex(size), mi = mainIndex(size), g = Number(grade);
    if (letter === 'js') {
      var half = (g >= 7 && g <= 11 && T % 2 === 1) ? (T - 1) / 2 : T / 2;
      return { es: half, ei: -half };
    }
    if (letter === 'j') {
      if (!J_SHAFT[g]) return E('grade');
      var v = J_SHAFT[g][mi];
      if (v == null) return E('size');
      return { ei: v, es: v + T };
    }
    if (ES[letter]) {
      var es = ES[letter][fi];
      if (es == null) return E('size');
      if (size <= 1 && (letter === 'a' || letter === 'b')) return E('size');
      return { es: es, ei: es - T };
    }
    if (EI[letter]) {
      var ei = EI[letter][fi];
      if (ei == null) return E('size');
      if (letter === 'k' && !(g >= 4 && g <= 7)) ei = 0;
      return { ei: ei, es: ei + T };
    }
    return E('letter');
  }

  /** Hole deviation → {ES, EI} given IT (ISO 286-1 Table 3 rules). */
  function holeDev(size, L, grade, T) {
    var l = L.toLowerCase(), g = Number(grade), mi = mainIndex(size);
    if (l === 'js') { var s = shaftDev(size, 'js', grade, T); return { ES: s.es, EI: s.ei }; }
    if (l === 'j') {
      if (!J_HOLE[g]) return E('grade');
      var v = J_HOLE[g][mi];
      if (v == null) return E('size');
      return { ES: v, EI: v - T };
    }
    if (ES[l]) { // A … H: EI = −es
      var r = shaftDev(size, l, grade, T);
      if (r.error) return r;
      return { EI: -r.es, ES: -r.es + T };
    }
    if (!EI[l]) return E('letter');
    var fi = fineIndex(size);
    var ei = EI[l][fi];
    if (ei == null) return E('size');
    var es;
    if (l === 'k') {
      // K: ES = −ei(k, IT4–7 value) + Δ for ≤ IT8; ES = 0 above IT8 (and for sizes ≤ 3 or > 500 mm).
      if (g > 8) es = 0;
      else es = (size <= 3 || size > 500) ? 0 : -EI.k[fi] + delta(size, g);
    } else if (l === 'm') {
      if (g > 8) es = -ei;
      else es = -ei + delta(size, g);
      if (g === 6 && size > 250 && size <= 315) es = -9; // special case in ISO 286-1
    } else if (l === 'n') {
      if (g > 8) { if (size <= 3) es = -ei; else es = 0; }
      else es = -ei + delta(size, g);
      if (g > 8 && size <= 1) return E('size');
    } else {
      // P … ZC: ES = −ei + Δ for grades ≤ IT7, ES = −ei above.
      es = -ei + (g <= 7 ? delta(size, g) : 0);
    }
    return { ES: es, EI: es - T };
  }

  /**
   * Deviation of a tolerance class.
   * deviation(50, 'H', 7) → { hole:true, upper:25, lower:0, it:25, fd:'lower', size, letter, grade }
   * Letters in upper case = hole, lower case = shaft. Values in µm. Returns {error} if undefined.
   */
  function deviation(size, letter, grade) {
    size = Number(size);
    if (!(size > 0)) return E('size');
    if (size > 3150) return E('range');
    var isHole = letter !== letter.toLowerCase();
    var list = isHole ? HOLE_LETTERS : SHAFT_LETTERS;
    if (list.indexOf(letter) < 0) return E('letter');
    if (gradeIndex(grade) < 0) return E('grade');
    var T = it(size, grade);
    if (T == null) return E('grade');
    var l = letter.toLowerCase(), g = Number(grade);
    // Holes K … ZC need Δ (tabulated for IT3–IT8); grades finer than IT3 are not defined there.
    if (isHole && EI[l] && !(g >= 3)) return E('grade');
    var r = isHole ? holeDev(size, letter, grade, T) : shaftDev(size, letter, grade, T);
    if (r.error) return r;
    var upper = isHole ? r.ES : r.es, lower = isHole ? r.EI : r.ei;
    return {
      hole: isHole, letter: letter, grade: String(grade), size: size, it: T,
      upper: round(upper), lower: round(lower),
      max: size + upper / 1000, min: size + lower / 1000,
      fundamental: Math.abs(upper) < Math.abs(lower) ? 'upper' : 'lower'
    };
  }
  function round(x) { var r = Math.round(x * 1000) / 1000; return r === 0 ? 0 : r; } // no −0

  /** Parse "H7", "g6", "JS9", "js6", "50H7", "Ø50 H7/g6" (single class only). */
  function parseClass(s) {
    var m = /^\s*(a|b|c|cd|d|e|ef|f|fg|g|h|js|j|k|m|n|p|r|s|t|u|v|x|y|z|za|zb|zc)(01|0|1[0-8]|[1-9])\s*$/i.exec(String(s || ''));
    if (!m) return null;
    var letter = m[1];
    // Preserve case of first letter for hole/shaft; normalise JS/js.
    var hole = letter[0] === letter[0].toUpperCase();
    letter = hole ? letter.toUpperCase() : letter.toLowerCase();
    return { letter: letter, grade: m[2], hole: hole };
  }
  /** Parse a fit "H7/g6", optionally with size "50 H7/g6". */
  function parseFit(s) {
    var m = /^\s*(?:[ØøΦφ⌀]?\s*(\d+(?:[.,]\d+)?)\s*)?([A-Za-z]{1,2}\d{1,2})\s*\/\s*([A-Za-z]{1,2}\d{1,2})\s*$/.exec(String(s || ''));
    if (!m) return null;
    var h = parseClass(m[2]), sh = parseClass(m[3]);
    if (!h || !sh || !h.hole || sh.hole) return null;
    return { size: m[1] ? Number(m[1].replace(',', '.')) : null, hole: h, shaft: sh };
  }

  /** Fit between a hole and a shaft class at a size. Values in µm. */
  function fit(size, hole, shaft) {
    var H = deviation(size, hole.letter, hole.grade);
    var S = deviation(size, shaft.letter, shaft.grade);
    if (H.error || S.error) return { error: H.error ? 'hole' : 'shaft', hole: H, shaft: S };
    var maxClear = round(H.upper - S.lower);  // largest hole − smallest shaft
    var minClear = round(H.lower - S.upper);  // smallest hole − largest shaft
    var type = minClear >= 0 ? 'clearance' : (maxClear <= 0 ? 'interference' : 'transition');
    return {
      hole: H, shaft: S, type: type,
      maxClearance: maxClear, minClearance: minClear,
      maxInterference: round(-minClear), minInterference: round(-maxClear),
      mean: round((maxClear + minClear) / 2),
      fitTolerance: round(H.it + S.it)
    };
  }

  /* ---- Preferred fits (ISO 286-2 Annex / ISO 1829 selection) ---- */
  var PREFERRED = [
    { h: 'H11', s: 'c11', alt: 'C11/h11', type: 'clearance',
      name: { en: 'Loose running', fr: 'Jeu très large' },
      use: { en: 'Wide commercial tolerances or allowances on external members; parts that must assemble easily with dirt or corrosion.', fr: 'Grandes tolérances commerciales ; pièces devant s’assembler facilement malgré salissures ou corrosion.' } },
    { h: 'H9', s: 'd9', alt: 'D9/h9', type: 'clearance',
      name: { en: 'Free running', fr: 'Jeu libre' },
      use: { en: 'Not for accuracy: large temperature variations, high running speeds or heavy journal pressures.', fr: 'Sans exigence de précision : fortes variations de température, vitesses élevées ou fortes pressions sur tourillons.' } },
    { h: 'H8', s: 'f7', alt: 'F8/h7', type: 'clearance',
      name: { en: 'Close running', fr: 'Jeu tournant' },
      use: { en: 'Running on accurate machines and accurate location at moderate speeds and journal pressures.', fr: 'Rotation sur machines précises ; positionnement précis à vitesses et pressions modérées.' } },
    { h: 'H7', s: 'g6', alt: 'G7/h6', type: 'clearance',
      name: { en: 'Sliding', fr: 'Glissant' },
      use: { en: 'Not intended to run freely, but to move and turn freely and locate accurately.', fr: 'Non destiné à tourner librement, mais à coulisser et pivoter avec un positionnement précis.' } },
    { h: 'H7', s: 'h6', alt: 'H7/h6', type: 'clearance',
      name: { en: 'Locational clearance', fr: 'Glissant juste (positionnement)' },
      use: { en: 'Snug fit for locating stationary parts, but can be freely assembled and disassembled.', fr: 'Ajustement juste pour positionner des pièces fixes, montage et démontage à la main.' } },
    { h: 'H7', s: 'k6', alt: 'K7/h6', type: 'transition',
      name: { en: 'Locational transition', fr: 'Incertain (positionnement)' },
      use: { en: 'Accurate location; compromise between clearance and interference.', fr: 'Positionnement précis ; compromis entre jeu et serrage.' } },
    { h: 'H7', s: 'n6', alt: 'N7/h6', type: 'transition',
      name: { en: 'Locational transition (tighter)', fr: 'Incertain serré' },
      use: { en: 'More accurate location where greater interference is permissible.', fr: 'Positionnement plus précis lorsqu’un serrage plus important est admissible.' } },
    { h: 'H7', s: 'p6', alt: 'P7/h6', type: 'interference',
      name: { en: 'Locational interference', fr: 'Serrage léger (positionnement)' },
      use: { en: 'Parts requiring rigidity and alignment with prime accuracy of location, no special bore-pressure requirement.', fr: 'Pièces exigeant rigidité et alignement avec un positionnement très précis, sans exigence de pression particulière.' } },
    { h: 'H7', s: 's6', alt: 'S7/h6', type: 'interference',
      name: { en: 'Medium drive', fr: 'Serrage moyen (emmanché)' },
      use: { en: 'Ordinary steel parts or shrink fits on light sections; tightest fit usable with cast iron.', fr: 'Pièces en acier courantes ou frettage sur sections légères ; le plus serré utilisable avec la fonte.' } },
    { h: 'H7', s: 'u6', alt: 'U7/h6', type: 'interference',
      name: { en: 'Force', fr: 'Serrage fort (frettage)' },
      use: { en: 'Parts that can be highly stressed, or shrink fits where heavy pressing forces are impractical.', fr: 'Pièces fortement sollicitées, ou frettage lorsque l’emmanchement à la presse est impossible.' } }
  ];

  TH.engine.iso286 = {
    MAIN: MAIN, FINE: FINE, GRADES: GRADES,
    SHAFT_LETTERS: SHAFT_LETTERS, HOLE_LETTERS: HOLE_LETTERS,
    PREFERRED: PREFERRED,
    it: it, delta: delta, deviation: deviation, fit: fit,
    parseClass: parseClass, parseFit: parseFit,
    mainIndex: mainIndex, fineIndex: fineIndex
  };
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
