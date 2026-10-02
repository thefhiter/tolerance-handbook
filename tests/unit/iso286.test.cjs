const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('./_load.cjs')('js/engine/iso286.js');
const iso = TH.engine.iso286;

// [size, class, upper µm, lower µm] — values from the ISO 286-2 tables.
const REF = [
  [50, 'H7', 25, 0], [50, 'g6', -9, -25], [50, 'k6', 18, 2], [50, 'p6', 42, 26], [50, 's6', 59, 43], [50, 'u6', 86, 70],
  [50, 'h6', 0, -16], [50, 'f7', -25, -50], [50, 'e8', -50, -89], [50, 'd9', -80, -142], [50, 'c11', -130, -290],
  [25, 'f7', -20, -41], [25, 'H8', 33, 0], [25, 'e8', -40, -73], [25, 'm6', 21, 8], [25, 'n6', 28, 15], [25, 'r6', 41, 28],
  [30, 'K7', 6, -15], [30, 'N7', -7, -28], [30, 'P7', -14, -35], [30, 'S7', -27, -48], [30, 'M7', 0, -21],
  [30, 'J7', 12, -9], [30, 'JS7', 10, -10], [20, 'U7', -33, -54], [30, 'U7', -40, -61], [30, 'K6', 2, -11],
  [30, 'G7', 28, 7], [30, 'F8', 53, 20], [30, 'D9', 117, 65], [30, 'C11', 240, 110],
  [10, 'js6', 4.5, -4.5], [6, 'H7', 12, 0], [6, 'h6', 0, -8], [8, 'H11', 90, 0], [8, 'c11', -80, -170],
  [16, 'D10', 120, 50], [100, 'H7', 35, 0], [100, 'g6', -12, -34], [100, 'F7', 71, 36],
  [200, 'H7', 46, 0], [200, 's6', 151, 122], [280, 'M6', -9, -41], [40, 'N9', 0, -62], [2, 'N9', -4, -29],
  [600, 'H7', 70, 0], [600, 'g6', -22, -66], [40, 'j6', 11, -5], [40, 'J6', 10, -6], [2, 'K7', 0, -10],
  [12, 'P9', -18, -61], [12, 'JS9', 21, -21], [12, 'N9', 0, -43], [12, 'h9', 0, -43], [12, 'D10', 120, 50],
  [80, 'H8', 46, 0], [80, 'f7', -30, -60], [120, 'k6', 25, 3], [140, 'H7', 40, 0], [150, 'h7', 0, -40],
  [40, 'r6', 50, 34], [60, 'r6', 60, 41], [70, 'r6', 62, 43], [3, 'H7', 10, 0], [3, 'g6', -2, -8]
];

test('reference deviations match ISO 286-2', () => {
  for (const [size, cls, up, lo] of REF) {
    const c = iso.parseClass(cls);
    const d = iso.deviation(size, c.letter, c.grade);
    assert.ok(!d.error, `${size} ${cls}: ${d.error}`);
    assert.equal(d.upper, up, `${size} ${cls} upper`);
    assert.equal(d.lower, lo, `${size} ${cls} lower`);
  }
});

test('IT grades and range boundaries (over a up to and including b)', () => {
  assert.equal(iso.it(3, 7), 10);   // 3 belongs to "up to 3"
  assert.equal(iso.it(3.001, 7), 12);
  assert.equal(iso.it(50, 7), 25);
  assert.equal(iso.it(50.01, 7), 30);
  assert.equal(iso.it(500, 6), 40);
  assert.equal(iso.it(3150, 18), 33000);
  assert.equal(iso.it(30, '01'), 0.6);
  assert.equal(iso.it(800, '0'), null);   // IT0/IT01 not defined above 500
  assert.equal(iso.it(0.5, 14), null);    // IT14+ not for ≤ 1 mm
  assert.equal(iso.it(3200, 7), null);
});

test('IT series obeys the ~1.6 step rule from IT6 to IT18', () => {
  for (let r = 0; r < iso.MAIN.length; r++) {
    const s = iso.MAIN[r];
    for (let g = 7; g <= 18; g++) {
      const ratio = iso.it(s, g) / iso.it(s, g - 1);
      assert.ok(ratio >= 1.35 && ratio <= 1.8, `range ${s} IT${g}/IT${g - 1} = ${ratio}`);
    }
  }
});

test('Δ equals ITn − IT(n−1)', () => {
  assert.equal(iso.delta(25, 7), 8);
  assert.equal(iso.delta(25, 8), 12);
  assert.equal(iso.delta(2, 7), 0);
});

test('fits classify clearance / transition / interference', () => {
  const f = (s, txt) => { const p = iso.parseFit(txt); return iso.fit(s, p.hole, p.shaft); };
  let r = f(50, 'H7/g6');
  assert.equal(r.type, 'clearance'); assert.equal(r.maxClearance, 50); assert.equal(r.minClearance, 9);
  r = f(50, 'H7/k6');
  assert.equal(r.type, 'transition'); assert.equal(r.maxClearance, 23); assert.equal(r.maxInterference, 18);
  r = f(50, 'H7/s6');
  assert.equal(r.type, 'interference'); assert.equal(r.maxInterference, 59); assert.equal(r.minInterference, 18);
  r = f(25, 'H7/h6');
  assert.equal(r.type, 'clearance'); assert.equal(r.minClearance, 0); assert.equal(r.fitTolerance, 34);
});

test('preferred fits have the documented fit type at common sizes', () => {
  for (const pf of iso.PREFERRED) {
    for (const size of [10, 25, 50, 100]) {
      const p = iso.parseFit(pf.h + '/' + pf.s);
      assert.equal(iso.fit(size, p.hole, p.shaft).type, pf.type, `${pf.h}/${pf.s} at ${size}`);
    }
  }
});

test('parsing', () => {
  assert.deepEqual({ ...iso.parseClass('js6') }, { letter: 'js', grade: '6', hole: false });
  assert.deepEqual({ ...iso.parseClass('JS7') }, { letter: 'JS', grade: '7', hole: true });
  assert.deepEqual({ ...iso.parseClass('h10') }, { letter: 'h', grade: '10', hole: false });
  assert.equal(iso.parseClass('H19'), null);
  const p = iso.parseFit('Ø50 H7/g6');
  assert.equal(p.size, 50); assert.equal(p.hole.letter, 'H'); assert.equal(p.shaft.letter, 'g');
  assert.equal(iso.parseFit('g6/H7'), null);
  assert.equal(iso.parseFit('25,5 H8/f7').size, 25.5);
});

test('undefined combinations return errors, not numbers', () => {
  assert.ok(iso.deviation(20, 'cd', 7).error);   // cd only ≤ 10 mm
  assert.ok(iso.deviation(10, 't', 6).error);    // t starts above 24 mm
  assert.ok(iso.deviation(600, 'a', 11).error);  // a only ≤ 500 mm
  assert.ok(iso.deviation(20, 'j', 9).error);    // j only 5–8
  assert.ok(iso.deviation(0.5, 'a', 11).error);  // a, b not ≤ 1 mm
  assert.ok(iso.deviation(-1, 'H', 7).error);
  assert.ok(iso.deviation(4000, 'H', 7).error);
});
