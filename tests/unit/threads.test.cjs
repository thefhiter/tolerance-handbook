const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('./_load.cjs')('js/engine/threads.js');
const T = TH.engine.threads;

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.0005, `${msg}: got ${a}, expected ${b}`);

test('ISO 261: coarse and fine pitches', () => {
  assert.equal(T.metricSize(10).coarse, 1.5);
  assert.deepEqual([...T.pitchesFor(10)], [1.5, 1.25, 1, 0.75]);
  assert.deepEqual([...T.pitchesFor(12)], [1.75, 1.5, 1.25, 1]);
  assert.equal(T.metricSize(64).coarse, 6);
  assert.equal(T.metricSize(5.5).coarse, null);
  assert.equal(T.metricSize(68).series, 2);
  assert.ok(T.METRIC_SIZES.length >= 50);
});

test('ISO 724 basic dimensions', () => {
  const b = T.metricBasic(10, 1.5);
  near(b.d2, 9.026, 'M10 d2');
  near(b.d1, 8.376, 'M10 D1');
  near(b.d3, 8.160, 'M10 d3');
});

// ISO 965-2 limits of size (6H / 6g; 6h for M1–M1.4).
const EXT = [
  // [d, P, class, dmax, dmin, d2max, d2min]
  [10, 1.5, '6g', 9.968, 9.732, 8.994, 8.862],
  [6, 1, '6g', 5.974, 5.794, 5.324, 5.212],
  [16, 2, '6g', 15.962, 15.682, 14.663, 14.503],
  [4, 0.7, '6g', 3.978, 3.838, 3.523, 3.433],
  [3, 0.5, '6g', 2.980, 2.874, 2.655, 2.580],
  [1.6, 0.35, '6g', 1.581, 1.496, 1.354, 1.291],
  [1, 0.25, '6h', 1.000, 0.933, 0.838, 0.785],
  [1.4, 0.3, '6h', 1.400, 1.325, 1.205, 1.149],
  [12, 1.5, '6g', 11.968, 11.732, 10.994, 10.854],
  [10, 1.25, '6g', 9.972, 9.760, 9.160, 9.042],
  [20, 2.5, '6g', 19.958, 19.623, 18.334, 18.164]
];
for (const [d, P, cls, dmax, dmin, d2max, d2min] of EXT) {
  test(`ISO 965-2 external M${d}x${P}-${cls}`, () => {
    const L = T.metricLimits(d, P, cls);
    assert.ok(L.ok, JSON.stringify(L));
    near(L.dmax, dmax, 'dmax'); near(L.dmin, dmin, 'dmin');
    near(L.d2max, d2max, 'd2max'); near(L.d2min, d2min, 'd2min');
  });
}

const INT = [
  // [d, P, class, D2min, D2max, D1min, D1max]
  [10, 1.5, '6H', 9.026, 9.206, 8.376, 8.676],
  [6, 1, '6H', 5.350, 5.500, 4.917, 5.153],
  [12, 1.75, '6H', 10.863, 11.063, 10.106, 10.441],
  [20, 2.5, '6H', 18.376, 18.600, 17.294, 17.744],
  [8, 1.25, '6H', 7.188, 7.348, 6.647, 6.912]
];
for (const [d, P, cls, D2min, D2max, D1min, D1max] of INT) {
  test(`ISO 965-2 internal M${d}x${P}-${cls}`, () => {
    const L = T.metricLimits(d, P, cls);
    assert.ok(L.ok, JSON.stringify(L));
    near(L.D2min, D2min, 'D2min'); near(L.D2max, D2max, 'D2max');
    near(L.D1min, D1min, 'D1min'); near(L.D1max, D1max, 'D1max');
  });
}

test('tolerance class parsing and availability', () => {
  assert.deepEqual(
    { p: T.parseClass('5g6g').pitchGrade, c: T.parseClass('5g6g').crestGrade, i: T.parseClass('5g6g').internal },
    { p: 5, c: 6, i: false });
  assert.equal(T.parseClass('6H').internal, true);
  assert.equal(T.parseClass('5g6h'), null);  // mixed positions are not a class
  assert.equal(T.parseClass('6x'), null);
  // e position is not defined below P = 0.5
  assert.equal(T.metricLimits(3, 0.35, '6e').ok, false);
  // G position: EI = +g
  const G = T.metricLimits(10, 1.5, '6G');
  near(G.D2min, 9.058, 'M10 6G D2min');
  // grade 5 major diameter (Td) does not exist -> crest must be 4/6/8
  assert.equal(T.metricLimits(10, 1.5, '5g').ok, false);
  near(T.metricLimits(10, 1.5, '5g6g').d2min, 8.994 - 0.106, 'M10 5g6g d2min');
});

test('designation parser', () => {
  let r = T.parseDesignation('M12x1.25-6H');
  assert.ok(r.ok); assert.equal(r.d, 12); assert.equal(r.P, 1.25); assert.equal(r.internal, '6H'); assert.equal(r.coarse, false);
  r = T.parseDesignation('M8-6g');
  assert.ok(r.ok); assert.equal(r.P, 1.25); assert.equal(r.external, '6g'); assert.equal(r.coarse, true);
  r = T.parseDesignation('m10 × 1,5 - 6H/6g');
  assert.ok(r.ok); assert.equal(r.internal, '6H'); assert.equal(r.external, '6g');
  r = T.parseDesignation('M20x2-5g6g-LH');
  assert.ok(r.ok); assert.equal(r.external, '5g6g'); assert.equal(r.lh, true);
  assert.equal(T.parseDesignation('M13').ok, false);
  assert.equal(T.parseDesignation('M10x2').reason, 'pitch');
  assert.equal(T.parseDesignation('hello').ok, false);
});

test('tap drill', () => {
  near(T.tapDrill(10, 1.5).cutting, 8.5, 'M10');
  near(T.tapDrill(12, 1.75).cutting, 10.25, 'M12');
  near(T.tapDrill(8, 1.25).cutting, 6.75, 'M8');
  // Cutting drill lies inside the 6H minor-diameter zone for coarse threads
  for (const s of T.METRIC_SIZES) {
    if (!s.coarse || s.d < 1.6) continue;
    const L = T.metricLimits(s.d, s.coarse, '6H');
    const dr = T.tapDrill(s.d, s.coarse).cutting;
    assert.ok(dr >= L.D1min - 1e-9 && dr <= L.D1max + 1e-9, `M${s.d} drill ${dr} in ${L.D1min}..${L.D1max}`);
  }
});

test('every ISO 261 size/pitch has external 6g (6h below 1.6) and an internal H class', () => {
  for (const s of T.METRIC_SIZES) {
    for (const P of T.pitchesFor(s.d)) {
      const ext = s.d < 1.6 ? '6h' : '6g';
      assert.ok(T.metricLimits(s.d, P, ext).ok, `M${s.d}x${P}-${ext}`);
      // ISO 965-1 tabulates only the finer grades for the smallest pitches.
      assert.ok(['6H', '5H', '4H'].some(c => T.metricLimits(s.d, P, c).ok), `M${s.d}x${P} internal`);
      if (P >= 0.35) assert.ok(T.metricLimits(s.d, P, '6H').ok, `M${s.d}x${P}-6H`);
    }
  }
});

test('trapezoidal: basic profile agrees with tabulated ISO 2903 limits', () => {
  assert.equal(T.trClearance(1.5), 0.15);
  assert.equal(T.trClearance(4), 0.25);
  assert.equal(T.trClearance(10), 0.5);
  for (const r of T.TR_LIMITS) {
    const [d, P] = r;
    const b = T.trBasic(d, P);
    const L = T.trLimits(d, P);
    near(L.int.D2min, b.D2, `Tr${d}x${P} D2min`);
    near(L.int.D1min, b.D1, `Tr${d}x${P} D1min`);
    near(L.int.D4min, b.D4, `Tr${d}x${P} D4min`);
    near(L.ext.d3max, b.d3, `Tr${d}x${P} d3max`);
    near(L.ext.dmax, d, `Tr${d}x${P} dmax`);
    // ISO 2903: Td3 = 1.25·Td2 + |es|
    const es = b.d2 - L.ext.d2max, Td2 = L.ext.d2max - L.ext.d2min;
    assert.ok(Math.abs(L.ext.d3max - L.ext.d3min - (1.25 * Td2 + es)) < 0.0011, `Tr${d}x${P} Td3`);
    assert.ok(L.ext.d2max < b.d2, 'e position below basic');
    assert.ok(T.trSize(d).pitches.includes(P), `Tr${d}x${P} listed`);
  }
  const L = T.trLimits(20, 4);
  near(L.ext.d2max, 17.905, 'Tr20x4 7e d2max'); near(L.ext.d2min, 17.640, 'Tr20x4 7e d2min');
  assert.equal(T.trLimits(60, 9), null);
  assert.ok(T.trBasic(100, 20));
});

test('unified: basic dimensions', () => {
  const s = T.UN_SIZES.find(x => x.size === '1/4');
  const b = T.unBasic(s.D, s.unc);
  near(b.E, 0.2175, '1/4-20 E');
  near(b.K, 0.1959, '1/4-20 K');
  near(T.unBasic(0.5, 13).E, 0.4500, '1/2-13 E');
  near(T.drillInch('#7'), 0.201, '#7');
  near(T.drillInch('27/64'), 0.421875, '27/64');
  near(T.drillInch('1-7/64'), 1.109375, '1-7/64');
  for (const u of T.UN_SIZES) {
    for (const [tpi, dr] of [[u.unc, u.uncDrill], [u.unf, u.unfDrill]]) {
      if (!tpi) continue;
      const b2 = T.unBasic(u.D, tpi), dd = T.drillInch(dr);
      assert.ok(dd != null, `${u.size} drill ${dr}`);
      assert.ok(dd > b2.K - 0.002 && dd < b2.E, `${u.size}-${tpi} drill ${dr} between minor and pitch dia`);
    }
  }
});

test('pipe threads ISO 228-1 / ISO 7-1', () => {
  const g12 = T.pipeLimits228('1/2');
  near(g12.internal.D2max, 19.935, 'G1/2 D2max');
  near(g12.internal.D1max, 19.172, 'G1/2 D1max');
  near(g12.externalA.d2min, 19.651, 'G1/2 A d2min');
  near(g12.externalB.d2min, 19.509, 'G1/2 B d2min');
  near(g12.externalA.dmin, 20.671, 'G1/2 dmin');
  const g116 = T.pipeLimits228('1/16');
  near(g116.internal.D2max, 7.249, 'G1/16 D2max'); near(g116.externalB.d2min, 6.928, 'G1/16 B');
  near(g116.externalA.dmin, 7.509, 'G1/16 dmin'); near(g116.internal.D1max, 6.843, 'G1/16 D1max');
  const g1 = T.pipeLimits228('1');
  near(g1.externalA.d2min, 31.590, 'G1 A'); near(g1.internal.D2max, 31.950, 'G1 D2max');
  // h = 0.640327 P, consistent with tabulated diameters
  for (const p of T.PIPE_SIZES) {
    near(p.major - p.pitchDia, 0.640327 * p.P, `${p.size} major-pitch`);
    near(p.pitchDia - p.minor, 0.640327 * p.P, `${p.size} pitch-minor`);
  }
  assert.equal(T.pipeIso7('1/2').gauge, 8.2);
  assert.equal(T.pipeIso7('5/8'), null); // not an ISO 7 size
});
