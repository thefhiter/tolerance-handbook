const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('./_load.cjs')('js/engine/appendix.js');
const A = TH.engine.appendix;

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('ISO 273 clearance holes — reference rows', () => {
  const row = s => A.CLEARANCE.find(r => r.size === s);
  assert.deepEqual([row('M1.6').fine, row('M1.6').medium, row('M1.6').coarse], [1.7, 1.8, 2.0]);
  assert.deepEqual([row('M8').fine, row('M8').medium, row('M8').coarse], [8.4, 9, 10]);
  assert.deepEqual([row('M12').fine, row('M12').medium, row('M12').coarse], [13, 13.5, 14.5]);
  assert.deepEqual([row('M30').fine, row('M30').medium, row('M30').coarse], [31, 33, 35]);
  assert.deepEqual([row('M64').fine, row('M64').medium, row('M64').coarse], [66, 70, 74]);
  assert.equal(A.CLEARANCE.length, 29);
});

test('clearance series are ordered and larger than the thread', () => {
  let prev = 0;
  for (const r of A.CLEARANCE) {
    assert.ok(r.d > prev, r.size); prev = r.d;
    assert.ok(r.d < r.fine && r.fine < r.medium && r.medium < r.coarse, r.size);
    assert.equal(r.size, 'M' + r.d);
  }
});

test('counterbores and countersinks fit around the head', () => {
  for (const [s, c] of Object.entries(A.CBORE)) {
    assert.ok(c.d1 > c.dk, s + ' counterbore > head');
    if (c.t != null) assert.ok(c.t > c.k, s + ' depth > head height');
    assert.equal(c.k, Number(s.slice(1)), s + ' ISO 4762 k = d');
  }
  for (const [s, c] of Object.entries(A.CSINK)) {
    assert.ok(c.d2 > c.dkTh && c.dkTh > c.dkMin, s);
  }
  const h = A.holesFor('M8');
  assert.equal(h.clearance.medium, 9);
  assert.equal(h.cbore.d1, 15);
  assert.equal(h.cbore.t, 8.6);
  assert.equal(h.csink.d2, 18.3);
  assert.equal(A.holesFor('M64').cbore, null);
  assert.equal(A.holesFor('M7'), null);
});

test('taper calculator', () => {
  // 1:20 metric taper, D=20, L=100 -> d=15
  const t = A.taper(20, 15, 100);
  near(t.C, 0.05); near(t.ratio, 20);
  near(t.halfAngle, Math.atan(0.025) * 180 / Math.PI);
  near(t.angle, 2.8641924, 1e-6);           // 2°51′51.1″
  assert.equal(t.setOver, undefined);
  near(A.taper(20, 15, 100, 300).setOver, 7.5);
  assert.equal(A.taper(10, 12, 50), null);  // D must exceed d
  assert.equal(A.taper(10, 5, 0), null);
  near(A.smallDia(31.267, 19.254, 100), 31.267 - 100 / 19.254);
});

test('ISO 1119 series angles', () => {
  const by = l => A.ISO1119.find(t => t.label === l);
  const d = A.dms(by('1:10').angle);       // 5°43′29.3″
  assert.deepEqual([d.d, d.m, d.s], [5, 43, 29.3]);
  const s = A.dms(by('7:24').angle);       // 16°35′39.4″
  assert.deepEqual([s.d, s.m, s.s], [16, 35, 39.4]);
  const f = A.dms(by('1:50').angle);       // 1°8′45.2″
  assert.deepEqual([f.d, f.m, f.s], [1, 8, 45.2]);
  near(by('60°').x, 0.8660254, 1e-6);
  near(by('90°').x, 0.5, 1e-12);
});

test('Morse taper ISO 296 gauge diameters and angles', () => {
  assert.deepEqual(Array.from(A.MORSE, m => m.D), [9.045, 12.065, 17.78, 23.825, 31.267, 44.399, 63.348]);
  const mt2 = A.MORSE.find(m => m.id === 'MT2');
  const half = A.dms(A.angleFromRatio(mt2.x) / 2); // 1°25′50″
  assert.deepEqual([half.d, half.m, Math.round(half.s)], [1, 25, 50]);
  const steepHalf = A.dms(A.angleFromRatio(A.STEEP_RATIO) / 2); // 8°17′50″
  assert.deepEqual([steepHalf.d, steepHalf.m, Math.round(steepHalf.s)], [8, 17, 50]);
  assert.equal(A.STEEP.find(s => s.id === '40').D, 44.45);
});

test('dms rounding carries', () => {
  const r = A.dms(1.99999999);
  assert.deepEqual([r.d, r.m, r.s], [2, 0, 0]);
});

test('DIN 580 eye bolts — axial WLL', () => {
  const w = s => A.EYEBOLT.find(e => e.size === s).wll;
  assert.equal(w('M8'), 140); assert.equal(w('M12'), 340); assert.equal(w('M20'), 1200);
  assert.equal(w('M30'), 3200); assert.equal(w('M48'), 8600);
  for (let i = 1; i < A.EYEBOLT.length; i++) assert.ok(A.EYEBOLT[i].wll > A.EYEBOLT[i - 1].wll);
});

test('blank weight', () => {
  // Ø50 x 1000 steel: π/4·2500·1000 mm³ · 7.85 → 15.413 kg, 15.413 kg/m
  const r = A.blank('round', { d: 50, L: 1000 }, 7.85);
  near(r.mass, Math.PI * 625 * 1000 * 7.85e-6, 1e-9);
  near(r.mass, 15.4134, 1e-4);
  near(r.kgPerM, r.mass, 1e-9);
  // flat 100x10x500 aluminium 2.70 -> 1.35 kg
  near(A.blank('flat', { a: 100, b: 10, L: 500 }, 2.7).mass, 1.35, 1e-12);
  // hex s=20, L=100 steel: A = 346.41 mm²
  near(A.blank('hex', { s: 20, L: 100 }, 7.85).area, 346.4102, 1e-4);
  // tube 60/50 L1000: A = π/4(3600-2500)
  near(A.blank('tube', { D: 60, d: 50, L: 1000 }, 7.85).area, Math.PI * 275, 1e-9);
  assert.equal(A.blank('tube', { D: 50, d: 60, L: 10 }, 7.85).error, 'inner');
  assert.equal(A.blank('round', { d: -1, L: 10 }, 7.85).error, 'dim');
  assert.equal(A.blank('round', { d: 10, L: 10 }, 0).error, 'rho');
  const disc = A.blank('ring', { D: 100, d: 0, h: 10 }, 7.85);
  near(disc.mass, Math.PI * 2500 * 10 * 7.85e-6, 1e-12);
  assert.equal(disc.kgPerM, null);
});

test('materials table is sane', () => {
  const ids = new Set();
  for (const m of A.MATERIALS) {
    assert.ok(!ids.has(m.id)); ids.add(m.id);
    assert.ok(m.rho > 0.8 && m.rho < 12, m.id);
    assert.ok(m.en && m.fr);
    assert.ok(A.MATERIAL_GROUPS.some(g => g.id === m.g), m.id);
  }
  assert.equal(A.MATERIALS.find(m => m.id === 'steel').rho, 7.85);
});

test('unit conversions', () => {
  const get = (rows, u) => rows.find(r => r.unit === u).value;
  near(get(A.convert('length', 1, 'in'), 'mm'), 25.4);
  near(get(A.convert('length', 1, 'mm'), 'thou'), 39.37007874, 1e-8);
  near(get(A.convert('force', 1, 'kgf'), 'N'), 9.80665);
  near(get(A.convert('force', 1, 'lbf'), 'N'), 4.4482216152605);
  near(get(A.convert('torque', 1, 'lbf·ft'), 'N·m'), 1.3558179483314, 1e-12);
  near(get(A.convert('torque', 10, 'N·m'), 'lbf·in'), 88.50745791, 1e-7);
  near(get(A.convert('pressure', 1, 'MPa'), 'psi'), 145.0377377, 1e-6);
  near(get(A.convert('pressure', 1, 'bar'), 'MPa'), 0.1);
  near(get(A.convert('mass', 1, 'lb'), 'kg'), 0.45359237);
  near(get(A.convert('speed', 100, 'm/min'), 'ft/min'), 328.0839895, 1e-6);
  near(get(A.convert('angle', 1, 'rad'), '°'), 57.29577951, 1e-8);
  near(get(A.convert('temperature', 100, '°C'), '°F'), 212);
  near(get(A.convert('temperature', 32, '°F'), 'K'), 273.15);
  assert.equal(A.convert('length', NaN, 'mm'), null);
  assert.equal(A.convert('length', 1, 'parsec'), null);
});

test('fractional inches', () => {
  const f = A.fractions();
  assert.equal(f.length, 64);
  assert.equal(f[0].label, '1/64"'); near(f[0].mm, 0.396875);
  assert.equal(f[31].label, '1/2"'); near(f[31].mm, 12.7);
  assert.equal(f[63].label, '1"'); near(f[63].mm, 25.4);
  assert.equal(f[11].label, '3/16"');
});

test('roughness grades', () => {
  assert.equal(A.NGRADES.length, 12);
  assert.equal(A.NGRADES[0].n, 'N1'); assert.equal(A.NGRADES[0].ra, 0.025);
  assert.equal(A.NGRADES[11].ra, 50);
  assert.equal(A.nGrade(0.8).n, 'N6');
  assert.equal(A.nGrade(1.7).n, 'N7');
  assert.equal(A.nGrade(3).n, 'N8');
  assert.equal(A.nGrade(-1), null);
  near(A.NGRADES[5].uin, 31.496063, 1e-6);
  const p = A.processesFor(0.2).map(x => x.en);
  assert.ok(p.includes('Grinding') && p.includes('Lapping') && !p.includes('Milling'));
  for (const x of A.PROCESSES) assert.ok(x.lo < x.hi && x.fr);
});
