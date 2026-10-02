const test = require('node:test');
const assert = require('node:assert');
const TH = require('./_load.cjs')('js/engine/elements.js');
const E = TH.engine.elements;
const plain = (v) => JSON.parse(JSON.stringify(v));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);

test('parallel keys: shaft diameter → DIN 6885-1 section', () => {
  const k = (d) => E.keys[E.keyForShaft(d)];
  assert.deepStrictEqual([k(25).b, k(25).h, k(25).t1, k(25).t2], [8, 7, 4.0, 3.3]);
  assert.deepStrictEqual([k(30).b, k(30).h], [8, 7], '30 is the upper bound of 22–30');
  assert.deepStrictEqual([k(30.01).b, k(30.01).h, k(30.01).t1], [10, 8, 5.0]);
  assert.deepStrictEqual([k(50).b, k(50).h, k(50).t1, k(50).t2], [14, 9, 5.5, 3.8]);
  assert.deepStrictEqual([k(100).b, k(100).h, k(100).t1, k(100).t2], [28, 16, 10.0, 6.4]);
  assert.deepStrictEqual([k(500).b, k(500).h, k(500).t1, k(500).t2], [100, 50, 31, 19.5]);
  assert.strictEqual(E.keyForShaft(6), -1);
  assert.strictEqual(E.keyForShaft(501), -1);
  assert.strictEqual(E.keyForShaft(NaN), -1);
});

test('parallel keys: ranges are contiguous', () => {
  for (let i = 1; i < E.keys.length; i++) assert.strictEqual(E.keys[i].dOver, E.keys[i - 1].dTo);
});

test('keyway depth tolerance and radius', () => {
  assert.strictEqual(E.keyDepthTol(6), 0.1);
  assert.strictEqual(E.keyDepthTol(8), 0.2);
  assert.strictEqual(E.keyDepthTol(50), 0.2);
  assert.strictEqual(E.keyDepthTol(56), 0.3);
  assert.deepStrictEqual(plain(E.keyRadius(8)), [0.16, 0.25]);
  assert.deepStrictEqual(plain(E.keyRadius(14)), [0.25, 0.40]);
  assert.deepStrictEqual(plain(E.keyFits.map((f) => f.shaft + '/' + f.hub)), ['H9/D10', 'N9/JS9', 'P9/P9']);
});

test('ISO 492 normal class bore and OD deviations', () => {
  assert.deepStrictEqual(plain(E.bearingInner(25)), { index: 3, upper: 0, lower: -10 });
  assert.strictEqual(E.bearingInner(30).lower, -10, '30 belongs to 18–30');
  assert.strictEqual(E.bearingInner(50).lower, -12);
  assert.strictEqual(E.bearingInner(150).lower, -25);
  assert.strictEqual(E.bearingOuter(52).lower, -13);
  assert.strictEqual(E.bearingOuter(150).lower, -18);
  assert.strictEqual(E.bearingOuter(160).lower, -25);
  assert.strictEqual(E.bearingInner(0.5), null);
  assert.strictEqual(E.bearingOuter(3000), null);
});

test('deep-groove ball bearing designations', () => {
  assert.deepStrictEqual(plain(E.bearing('6205')), { series: '62', code: '05', d: 25, D: 52, B: 15 });
  assert.deepStrictEqual(plain(E.bearing('6003-2RS')), { series: '60', code: '03', d: 17, D: 35, B: 10 });
  assert.deepStrictEqual(plain(E.bearing('6310')), { series: '63', code: '10', d: 50, D: 110, B: 27 });
  assert.strictEqual(E.bearing('7205'), null);
  assert.strictEqual(E.boreFromCode('00'), 10);
  assert.strictEqual(E.boreFromCode('03'), 17);
  assert.strictEqual(E.boreFromCode('24'), 120);
  // every tabulated bore follows the bore-code rule
  for (const s of Object.keys(E.dgbb)) for (const c of Object.keys(E.dgbb[s])) assert.strictEqual(E.dgbb[s][c][0], E.boreFromCode(c), s + c);
});

test('roller chains ISO 606', () => {
  const c = (id) => E.chains.find((x) => x.iso === id);
  assert.deepStrictEqual([c('08B').p, c('08B').d1, c('08B').b1, c('08B').fu], [12.7, 8.51, 7.75, 17.8]);
  assert.deepStrictEqual([c('16A').p, c('16A').d1, c('16A').ansi], [25.4, 15.88, '80']);
});

test('sprocket geometry', () => {
  // 08B, z = 17: d = 12.7 / sin(180/17) = 69.12
  const s = E.sprocket(12.7, 17, 8.51);
  near(s.d, 69.116, 0.002, 'pitch diameter');
  near(s.df, 69.116 - 8.51, 0.002, 'root diameter');
  near(s.daMax, 69.116 + 1.25 * 12.7 - 8.51, 0.002);
  near(s.caliper, 69.116 * Math.cos(Math.PI / 34) - 8.51, 0.002, 'odd z measuring dim');
  assert.strictEqual(E.sprocket(12.7, 20, 8.51).caliper, E.sprocket(12.7, 20, 8.51).df, 'even z measures over root');
  assert.strictEqual(E.sprocket(12.7, 4, 8.51), null);
  assert.strictEqual(E.sprocket(12.7, 17.5, 8.51), null);
});

test('V-belt sections', () => {
  const v = (s) => E.vbelts.find((x) => x.section === s);
  assert.deepStrictEqual([v('SPA').top, v('SPA').h, v('SPA').wd, v('SPA').groove34], [12.7, 10, 11, 118]);
  assert.ok(v('SPZ').narrow && !v('A').narrow);
});

test('involute functions', () => {
  near(E.inv(20 * Math.PI / 180), 0.014904, 1e-6, 'inv 20°');
  near(E.invInv(0.014904) * 180 / Math.PI, 20, 1e-3, 'inverse involute');
});

test('spur gear m=2, z=30', () => {
  const g = E.gear({ mn: 2, z: 30, alphaN: 20, beta: 0, x: 0 });
  near(g.d, 60, 1e-9); near(g.da, 64, 1e-9); near(g.df, 55, 1e-9);
  near(g.db, 60 * Math.cos(20 * Math.PI / 180), 1e-9);
  assert.strictEqual(g.k, 4);
  near(g.Wk, 21.505, 0.001, 'W4 (table: m=1 → 10.7526)');
  near(g.zMinUndercut, 17.1, 0.05, 'theoretical z min');
});

test('spur gear span tables (m = 1, x = 0)', () => {
  // Classic base-tangent table values for m = 1, α = 20°
  const cases = [[12, 2, 4.5963], [20, 3, 7.6604], [40, 5, 13.8448]];
  for (const [z, k, W] of cases) {
    const s = E.spanMeasurement({ mn: 1, z, alphaN: 20, beta: 0, x: 0 });
    assert.strictEqual(s.k, k, 'k for z=' + z);
    near(s.Wk, W, 0.0005, 'Wk z=' + z);
  }
});

test('helical gear geometry', () => {
  const g = E.gear({ mn: 3, z: 25, alphaN: 20, beta: 15, x: 0 });
  near(g.mt, 3 / Math.cos(15 * Math.PI / 180), 1e-9);
  near(g.d, 77.645, 0.001);
  near(g.alphaT, 20.6469, 0.0005);
  near(g.da, 77.645 + 6, 0.001);
});

test('gear pair centre distance with profile shift', () => {
  const p0 = E.gearPair({ mn: 2, z: 20, alphaN: 20, beta: 0, x: 0 }, { mn: 2, z: 40, alphaN: 20, beta: 0, x: 0 });
  near(p0.a, 60, 1e-9); near(p0.aw, 60, 1e-9); near(p0.ratio, 2, 1e-12);
  near(p0.epsAlpha, 1.635, 0.005, 'contact ratio');
  const p1 = E.gearPair({ mn: 2, z: 20, alphaN: 20, beta: 0, x: 0.5 }, { mn: 2, z: 40, alphaN: 20, beta: 0, x: 0 });
  assert.ok(p1.aw > 60 && p1.aw < 61, 'positive shift spreads the centres: ' + p1.aw);
  near(p1.alphaWt, 22.31, 0.05, 'working pressure angle');
});

test('worm & wheel', () => {
  const w = E.worm({ mx: 4, z1: 2, q: 10, z2: 40, x2: 0 });
  near(w.d1, 40, 1e-9); near(w.d2, 160, 1e-9); near(w.a, 100, 1e-9);
  near(w.gamma, Math.atan(0.2) * 180 / Math.PI, 1e-9);
  near(w.da1, 48, 1e-9); near(w.df1, 30.4, 1e-9);
  assert.strictEqual(w.ratio, 20);
  assert.strictEqual(E.worm({ mx: 0, z1: 1, q: 10, z2: 30 }), null);
});

test('module series', () => {
  assert.ok(E.modulesI.includes(2.5) && E.modulesII.includes(1.75));
  assert.ok(!E.modulesI.some((m) => E.modulesII.includes(m)));
});
