const test = require('node:test');
const assert = require('node:assert');
const TH = require('./_load.cjs')('js/engine/general.js');
const G = TH.engine.general;

test('table shapes are consistent', () => {
  for (const k of Object.keys(G.GEO)) {
    const t = G.GEO[k];
    assert.strictEqual(t.values.length, t.bounds.length, k + ' rows');
    t.values.forEach((r, i) => assert.strictEqual(r.length, t.grades.length, k + ' row ' + i));
    // values grow with grade and with size
    t.values.forEach((r) => r.forEach((v, j) => j && assert.ok(v >= r[j - 1], k + ' monotonic grade')));
    for (let j = 0; j < t.grades.length; j++)
      for (let i = 1; i < t.values.length; i++) assert.ok(t.values[i][j] >= t.values[i - 1][j], k + ' monotonic size');
  }
  assert.strictEqual(G.DCTG.values.length, 16);
  G.DCTG.values.forEach((r) => assert.strictEqual(r.length, 16));
  for (const c of 'ABCD') assert.strictEqual(G.ISO13920.linear.classes[c].length, G.ISO13920.linear.bounds.length);
  for (const c of 'EFGH') assert.strictEqual(G.ISO13920.form.classes[c].length, G.ISO13920.form.bounds.length);
});

test('ISO 2768-1 linear', () => {
  assert.deepStrictEqual([G.linear('m', 50).value, G.linear('f', 50).value, G.linear('c', 50).value, G.linear('v', 50).value], [0.3, 0.15, 0.8, 1.5]);
  assert.strictEqual(G.linear('m', 0.5).value, 0.1);       // 0.5 is included in the first range
  assert.strictEqual(G.linear('m', 0.4).ok, false);         // below 0.5: indicate deviation explicitly
  assert.strictEqual(G.linear('m', 30).value, 0.2);         // boundary belongs to the lower range
  assert.strictEqual(G.linear('m', 30.001).value, 0.3);
  assert.strictEqual(G.linear('m', 4000).value, 2);
  assert.strictEqual(G.linear('m', 4000.1).reason, 'range');
  assert.strictEqual(G.linear('v', 2).reason, 'na');        // class v not defined 0.5–3
  assert.strictEqual(G.linear('f', 3000).reason, 'na');
});

test('ISO 2768-1 broken edges and angles', () => {
  assert.strictEqual(G.edge('m', 3).value, 0.2);
  assert.strictEqual(G.edge('m', 4).value, 0.5);
  assert.strictEqual(G.edge('c', 10).value, 2);
  assert.strictEqual(G.angular('m', 10).minutes, 60);
  assert.strictEqual(G.angular('m', 11).minutes, 30);
  assert.strictEqual(G.angular('c', 100).minutes, 30);
  assert.strictEqual(G.angular('v', 500).minutes, 20);
  assert.strictEqual(G.angleText(90), '±1°30′');
  assert.strictEqual(G.angleText(60), '±1°');
  assert.strictEqual(G.angleText(5), '±0°5′');
});

test('ISO 2768-2', () => {
  assert.strictEqual(G.straightnessFlatness('H', 10).value, 0.02);
  assert.strictEqual(G.straightnessFlatness('K', 250).value, 0.4);
  assert.strictEqual(G.straightnessFlatness('L', 3000).value, 1.6);
  assert.strictEqual(G.straightnessFlatness('L', 3001).ok, false);
  assert.strictEqual(G.perpendicularity('K', 100).value, 0.4);
  assert.strictEqual(G.perpendicularity('K', 101).value, 0.6);
  assert.strictEqual(G.symmetry('H', 2000).value, 0.5);
  assert.strictEqual(G.symmetry('L', 500).value, 1.5);
  assert.strictEqual(G.runout('K').value, 0.2);
});

test('geometric grades (GB/T 1184 Annex B)', () => {
  assert.strictEqual(G.geometric('flatness', 100, 7).um, 15);
  assert.strictEqual(G.geometric('flatness', 100.5, 7).um, 20);
  assert.strictEqual(G.geometric('straightness', 10, 1).um, 0.2);
  assert.strictEqual(G.geometric('cylindricity', 50, 6).um, 4);   // 30–50, grade 6
  assert.strictEqual(G.geometric('roundness', 25, 0).um, 0.2);
  assert.strictEqual(G.geometric('roundness', 500, 12).um, 155);
  assert.strictEqual(G.geometric('roundness', 501, 7).ok, false);
  assert.strictEqual(G.geometric('perpendicularity', 63, 5).um, 12);
  assert.strictEqual(G.geometric('parallelism', 1000, 12).um, 1200);
  assert.strictEqual(G.geometric('circularRunout', 40, 7).um, 20); // 30–50 grade 7
  assert.strictEqual(G.geometric('coaxiality', 1, 9).um, 15);      // ≤1 row
  assert.strictEqual(G.geometric('symmetry', 2, 9).um, 20);        // 1–3 row
  assert.strictEqual(G.geometric('totalRunout', 100, 8).mm, 0.04);
  assert.strictEqual(G.geometric('roundness', 50, 13).reason, 'grade');
  assert.strictEqual(G.geometric('flatness', 50, 0).reason, 'grade'); // grade 0 only exists for form of revolution
});

test('ISO 8062-3 castings', () => {
  const r = G.casting(100, 9);
  assert.strictEqual(r.total, 2.2);
  assert.strictEqual(r.half, 1.1);
  assert.strictEqual(G.casting(250, 8).total, 2);
  assert.strictEqual(G.casting(251, 8).total, 2.2);
  assert.strictEqual(G.casting(10, 1).total, 0.09);
  assert.strictEqual(G.casting(8, 13).reason, 'na');
  assert.strictEqual(G.casting(500, 1).reason, 'na');
  assert.strictEqual(G.casting(10000, 16).total, 64);
  assert.strictEqual(G.casting(10001, 16).reason, 'range');
});

test('ISO 13920 welded structures', () => {
  assert.strictEqual(G.weldLinear('B', 500).value, 3);
  assert.strictEqual(G.weldLinear('C', 120).value, 3);
  assert.strictEqual(G.weldLinear('C', 121).value, 4);
  assert.strictEqual(G.weldLinear('D', 25000).value, 40);
  assert.strictEqual(G.weldLinear('A', 1.5).ok, false);
  const a = G.weldAngular('B', 1000);
  assert.strictEqual(a.minutes, 30); assert.strictEqual(a.mmPerM, 9);
  assert.strictEqual(G.weldAngular('D', 5000).minutes, 60);
  assert.strictEqual(G.weldForm('F', 30).ok, false);   // range starts "over 30"
  assert.strictEqual(G.weldForm('F', 31).value, 1);
  assert.strictEqual(G.weldForm('G', 1000).value, 5.5);
  assert.strictEqual(G.weldForm('H', 30000).value, 40);
});
