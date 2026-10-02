/* General tolerances, geometric tolerance grades, castings and welded structures.
   Pure data + lookups (no DOM). All ranges are "over a up to and including b". */
(function (TH) {
  'use strict';

  function idx(bounds, x, lower) { return TH.rangeIndex(bounds, x, lower); }
  function rows(str) { // "a b c | d e f" -> [[a,b,c],[d,e,f]]; '-' -> null
    return str.split('|').map(function (r) {
      return r.trim().split(/\s+/).map(function (v) { return v === '-' ? null : Number(v); });
    });
  }

  /* ---------------- ISO 2768-1 : linear & angular ---------------- */
  var ISO2768_1 = {
    // Permissible deviations (±mm) for linear dimensions except broken edges.
    linear: {
      lower: 0.5,
      bounds: [3, 6, 30, 120, 400, 1000, 2000, 4000],
      classes: {
        f: [0.05, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, null],
        m: [0.1, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2],
        c: [0.2, 0.3, 0.5, 0.8, 1.2, 2, 3, 4],
        v: [null, 0.5, 1, 1.5, 2.5, 4, 6, 8]
      }
    },
    // Broken edges: external radii and chamfer heights (±mm).
    edges: {
      lower: 0.5,
      bounds: [3, 6, Infinity],
      classes: {
        f: [0.2, 0.5, 1], m: [0.2, 0.5, 1],
        c: [0.4, 1, 2], v: [0.4, 1, 2]
      }
    },
    // Angular dimensions, by length of the shorter side (mm). Values in arc-minutes (±).
    angular: {
      lower: 0,
      bounds: [10, 50, 120, 400, Infinity],
      classes: {
        f: [60, 30, 20, 10, 5], m: [60, 30, 20, 10, 5],
        c: [90, 60, 30, 15, 10],
        v: [180, 120, 60, 30, 20]
      }
    },
    classNames: {
      f: { en: 'f — fine', fr: 'f — fin' },
      m: { en: 'm — medium', fr: 'm — moyen' },
      c: { en: 'c — coarse', fr: 'c — grossier' },
      v: { en: 'v — very coarse', fr: 'v — très grossier' }
    }
  };

  /* ---------------- ISO 2768-2 : geometrical, classes H/K/L (mm) ---------------- */
  var ISO2768_2 = {
    flatness: { // straightness and flatness, by nominal length
      lower: 0, bounds: [10, 30, 100, 300, 1000, 3000],
      classes: { H: [0.02, 0.05, 0.1, 0.2, 0.3, 0.4], K: [0.05, 0.1, 0.2, 0.4, 0.6, 0.8], L: [0.1, 0.2, 0.4, 0.8, 1.2, 1.6] }
    },
    perpendicularity: { // by nominal length of the shorter side
      lower: 0, bounds: [100, 300, 1000, 3000],
      classes: { H: [0.2, 0.3, 0.4, 0.5], K: [0.4, 0.6, 0.8, 1], L: [0.6, 1, 1.5, 2] }
    },
    symmetry: {
      lower: 0, bounds: [100, 300, 1000, 3000],
      classes: { H: [0.5, 0.5, 0.5, 0.5], K: [0.6, 0.6, 0.8, 1], L: [0.6, 1, 1.5, 2] }
    },
    runout: { H: 0.1, K: 0.2, L: 0.5 } // circular runout, independent of size
  };

  /* ---------------- Geometric tolerance grades (µm) ----------------
     GB/T 1184-1996 Annex B; the same numeric series as the classic ISO 1101 / DIN 7184 tables. */
  var L16 = [10, 16, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000];
  var GEO = {
    flatness: {
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], bounds: L16,
      values: rows(
        '.2 .4 .8 1.2 2 3 5 8 12 20 30 60 | .25 .5 1 1.5 2.5 4 6 10 15 25 40 80 | .3 .6 1.2 2 3 5 8 12 20 30 50 100 |' +
        '.4 .8 1.5 2.5 4 6 10 15 25 40 60 120 | .5 1 2 3 5 8 12 20 30 50 80 150 | .6 1.2 2.5 4 6 10 15 25 40 60 100 200 |' +
        '.8 1.5 3 5 8 12 20 30 50 80 120 250 | 1 2 4 6 10 15 25 40 60 100 150 300 | 1.2 2.5 5 8 12 20 30 50 80 120 200 400 |' +
        '1.5 3 6 10 15 25 40 60 100 150 250 500 | 2 4 8 12 20 30 50 80 120 200 300 600 | 2.5 5 10 15 25 40 60 100 150 250 400 800 |' +
        '3 6 12 20 30 50 80 120 200 300 500 1000 | 4 8 15 25 40 60 100 150 250 400 600 1200 | 5 10 20 30 50 80 120 200 300 500 800 1500 |' +
        '6 12 25 40 60 100 150 250 400 600 1000 2000')
    },
    roundness: {
      grades: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      bounds: [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500],
      values: rows(
        '.1 .2 .3 .5 .8 1.2 2 3 4 6 10 14 25 | .1 .2 .4 .6 1 1.5 2.5 4 5 8 12 18 30 | .12 .25 .4 .6 1 1.5 2.5 4 6 9 15 22 36 |' +
        '.15 .25 .5 .8 1.2 2 3 5 8 11 18 27 43 | .2 .3 .6 1 1.5 2.5 4 6 9 13 21 33 52 | .25 .4 .6 1 1.5 2.5 4 7 11 16 25 39 62 |' +
        '.3 .5 .8 1.2 2 3 5 8 13 19 30 46 74 | .4 .6 1 1.5 2.5 4 6 10 15 22 35 54 87 | .6 1 1.2 2 3.5 5 8 12 18 25 40 63 100 |' +
        '.8 1.2 2 3 4.5 7 10 14 20 29 46 72 115 | 1 1.6 2.5 4 6 8 12 16 23 32 52 81 130 | 1.2 2 3 5 7 9 13 18 25 36 57 89 140 |' +
        '1.5 2.5 4 6 8 10 15 20 27 40 63 97 155')
    },
    parallelism: {
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], bounds: L16,
      values: rows(
        '.4 .8 1.5 3 5 8 12 20 30 50 80 120 | .5 1 2 4 6 10 15 25 40 60 100 150 | .6 1.2 2.5 5 8 12 20 30 50 80 120 200 |' +
        '.8 1.5 3 6 10 15 25 40 60 100 150 250 | 1 2 4 8 12 20 30 50 80 120 200 300 | 1.2 2.5 5 10 15 25 40 60 100 150 250 400 |' +
        '1.5 3 6 12 20 30 50 80 120 200 300 500 | 2 4 8 15 25 40 60 100 150 250 400 600 | 2.5 5 10 20 30 50 80 120 200 300 500 800 |' +
        '3 6 12 25 40 60 100 150 250 400 600 1000 | 4 8 15 30 50 80 120 200 300 500 800 1200 | 5 10 20 40 60 100 150 250 400 600 1000 1500 |' +
        '6 12 25 50 80 120 200 300 500 800 1200 2000 | 8 15 30 60 100 150 250 400 600 1000 1500 2500 |' +
        '10 20 40 80 120 200 300 500 800 1200 2000 3000 | 12 25 50 100 150 250 400 600 1000 1500 2500 4000')
    },
    coaxiality: {
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      bounds: [1, 3, 6, 10, 18, 30, 50, 120, 250, 500, 800, 1250, 2000, 3150, 5000, 8000, 10000],
      values: rows(
        '.4 .6 1 1.5 2.5 4 6 10 15 25 40 60 | .4 .6 1 1.5 2.5 4 6 10 20 40 60 120 | .5 .8 1.2 2 3 5 8 12 25 50 80 150 |' +
        '.6 1 1.5 2.5 4 6 10 15 30 60 100 200 | .8 1.2 2 3 5 8 12 20 40 80 120 250 | 1 1.5 2.5 4 6 10 15 25 50 100 150 300 |' +
        '1.2 2 3 5 8 12 20 30 60 120 200 400 | 1.5 2.5 4 6 10 15 25 40 80 150 250 500 | 2 3 5 8 12 20 30 50 100 200 300 600 |' +
        '2.5 4 6 10 15 25 40 60 120 250 400 800 | 3 5 8 12 20 30 50 80 150 300 500 1000 | 4 6 10 15 25 40 60 100 200 400 600 1200 |' +
        '5 8 12 20 30 50 80 120 250 500 800 1500 | 6 10 15 25 40 60 100 150 300 600 1000 2000 |' +
        '8 12 20 30 50 80 120 200 400 800 1200 2500 | 10 15 25 40 60 100 150 250 500 1000 1500 3000 |' +
        '12 20 30 50 80 120 200 300 600 1200 2000 4000')
    }
  };
  // Characteristic -> table, and which main parameter it is measured on.
  var CHARACTERISTICS = {
    straightness: 'flatness', flatness: 'flatness',
    roundness: 'roundness', cylindricity: 'roundness',
    parallelism: 'parallelism', perpendicularity: 'parallelism', inclination: 'parallelism',
    coaxiality: 'coaxiality', symmetry: 'coaxiality', circularRunout: 'coaxiality', totalRunout: 'coaxiality'
  };

  /* ---------------- ISO 8062-3 : castings, DCTG 1..16, total tolerance (mm) ---------------- */
  var DCTG = {
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    lower: 0,
    bounds: [10, 16, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000],
    values: rows(
      '.09 .13 .18 .26 .36 .52 .74 1 1.5 2 2.8 4.2 - - - - | .1 .14 .2 .28 .38 .54 .78 1.1 1.6 2.2 3 4.4 - - - - |' +
      '.11 .15 .22 .3 .42 .58 .82 1.2 1.7 2.4 3.2 4.6 6 8 10 12 | .12 .17 .24 .32 .46 .64 .9 1.3 1.8 2.6 3.6 5 7 9 11 14 |' +
      '.13 .18 .26 .36 .5 .7 1 1.4 2 2.8 4 5.6 8 10 12 16 | .14 .2 .28 .4 .56 .78 1.1 1.6 2.2 3.2 4.4 6 9 11 14 18 |' +
      '.15 .22 .3 .44 .62 .88 1.2 1.8 2.5 3.6 5 7 10 12 16 20 | - .24 .34 .5 .7 1 1.4 2 2.8 4 5.6 8 11 14 18 22 |' +
      '- - .4 .56 .78 1.1 1.6 2.2 3.2 4.4 6.2 9 12 16 20 25 | - - - .64 .9 1.2 1.8 2.6 3.6 5 7 10 14 18 22 28 |' +
      '- - - - 1 1.4 2 2.8 4 6 8 11 16 20 25 32 | - - - - - 1.6 2.2 3.2 4.6 7 9 13 18 23 29 37 |' +
      '- - - - - - 2.6 3.8 5.4 8 10 15 21 26 33 42 | - - - - - - - 4.4 6.2 9 12 17 24 30 38 49 |' +
      '- - - - - - - - 7 10 14 20 28 35 44 56 | - - - - - - - - - 11 16 23 32 40 50 64')
  };

  /* ---------------- ISO 13920 : welded structures ---------------- */
  var ISO13920 = {
    linear: { // ±mm; first range is 2 to 30, last is "over 20 000"
      lower: 2,
      bounds: [30, 120, 400, 1000, 2000, 4000, 8000, 12000, 16000, 20000, Infinity],
      classes: {
        A: [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        B: [1, 2, 2, 3, 4, 6, 8, 10, 12, 14, 16],
        C: [1, 3, 4, 6, 8, 11, 14, 18, 21, 24, 27],
        D: [1, 4, 7, 9, 12, 16, 21, 27, 32, 36, 40]
      }
    },
    angular: { // by length of the shorter side; ±arc-minutes and ±mm/m
      lower: 0, bounds: [400, 1000, Infinity],
      minutes: { A: [20, 15, 10], B: [45, 30, 20], C: [60, 45, 30], D: [90, 75, 60] },
      mmPerM: { A: [6, 4.5, 3], B: [13, 9, 6], C: [18, 13, 9], D: [26, 22, 18] }
    },
    form: { // straightness, flatness and parallelism (mm); first range "over 30 to 120"
      lower: 30,
      bounds: [120, 400, 1000, 2000, 4000, 8000, 12000, 16000, 20000, Infinity],
      classes: {
        E: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8],
        F: [1, 1.5, 3, 4.5, 6, 8, 10, 12, 14, 16],
        G: [1.5, 3, 5.5, 9, 11, 16, 20, 22, 25, 25],
        H: [2.5, 5, 9, 14, 18, 26, 32, 36, 40, 40]
      }
    }
  };

  /* ---------------- lookups ---------------- */
  // Result: { ok, i (range index), value } or { ok:false, reason:'range'|'na' }
  function classLookup(tbl, cls, x) {
    var i = idx(tbl.bounds, x, tbl.lower);
    if (i < 0) return { ok: false, reason: 'range', i: -1 };
    var v = tbl.classes[cls][i];
    if (v == null) return { ok: false, reason: 'na', i: i };
    return { ok: true, i: i, value: v };
  }

  // Strict-lower variants: tables whose first range is "over a" (lower bound excluded).
  function overLookup(tbl, cls, x) {
    if (!(x > tbl.lower)) return { ok: false, reason: 'range', i: -1 };
    return classLookup(tbl, cls, x);
  }

  var api = {
    ISO2768_1: ISO2768_1, ISO2768_2: ISO2768_2, GEO: GEO, CHARACTERISTICS: CHARACTERISTICS,
    DCTG: DCTG, ISO13920: ISO13920,

    linear: function (cls, size) { return classLookup(ISO2768_1.linear, cls, size); },
    edge: function (cls, size) { return classLookup(ISO2768_1.edges, cls, size); },
    angular: function (cls, shorter) {
      var r = idx(ISO2768_1.angular.bounds, shorter, 0);
      if (r < 0 || !(shorter > 0)) return { ok: false, reason: 'range', i: -1 };
      var m = ISO2768_1.angular.classes[cls][r];
      return { ok: true, i: r, value: m, minutes: m };
    },
    straightnessFlatness: function (cls, len) {
      if (!(len > 0)) return { ok: false, reason: 'range', i: -1 };
      return classLookup(ISO2768_2.flatness, cls, len);
    },
    perpendicularity: function (cls, shorter) {
      if (!(shorter > 0)) return { ok: false, reason: 'range', i: -1 };
      return classLookup(ISO2768_2.perpendicularity, cls, shorter);
    },
    symmetry: function (cls, len) {
      if (!(len > 0)) return { ok: false, reason: 'range', i: -1 };
      return classLookup(ISO2768_2.symmetry, cls, len);
    },
    runout: function (cls) { return { ok: true, i: 0, value: ISO2768_2.runout[cls] }; },

    // Geometric tolerance grade value in µm.
    geometric: function (characteristic, dim, grade) {
      var key = CHARACTERISTICS[characteristic];
      if (!key) return { ok: false, reason: 'char' };
      var t = GEO[key];
      var gi = t.grades.indexOf(Number(grade));
      if (gi < 0) return { ok: false, reason: 'grade', table: key };
      if (!(dim > 0)) return { ok: false, reason: 'range', table: key, i: -1 };
      var i = idx(t.bounds, dim, 0);
      if (i < 0) return { ok: false, reason: 'range', table: key, i: -1 };
      return { ok: true, table: key, i: i, gi: gi, um: t.values[i][gi], mm: t.values[i][gi] / 1000 };
    },

    // Casting total tolerance (mm) for a raw-casting nominal size and DCTG.
    casting: function (size, grade) {
      var gi = DCTG.grades.indexOf(Number(grade));
      if (gi < 0) return { ok: false, reason: 'grade' };
      if (!(size > 0)) return { ok: false, reason: 'range', i: -1 };
      var i = idx(DCTG.bounds, size, 0);
      if (i < 0) return { ok: false, reason: 'range', i: -1 };
      var v = DCTG.values[i][gi];
      if (v == null) return { ok: false, reason: 'na', i: i, gi: gi };
      return { ok: true, i: i, gi: gi, total: v, half: v / 2 };
    },

    weldLinear: function (cls, size) { return classLookup(ISO13920.linear, cls, size); },
    weldAngular: function (cls, shorter) {
      if (!(shorter > 0)) return { ok: false, reason: 'range', i: -1 };
      var i = idx(ISO13920.angular.bounds, shorter, 0);
      return { ok: true, i: i, minutes: ISO13920.angular.minutes[cls][i], mmPerM: ISO13920.angular.mmPerM[cls][i] };
    },
    weldForm: function (cls, len) { return overLookup(ISO13920.form, cls, len); },

    // Arc-minutes -> "±1°30′" style text.
    angleText: function (min) {
      var d = Math.floor(min / 60), m = min % 60;
      if (d && m) return '±' + d + '°' + m + '′';
      if (d) return '±' + d + '°';
      return '±0°' + m + '′';
    }
  };

  TH.engine.general = api;
})(typeof window !== 'undefined' ? window.TH : globalThis.TH);
