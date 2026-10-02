// Loads the browser scripts into a Node vm context (no DOM) so engines can be unit-tested.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

module.exports = function load(...files) {
  const ctx = { console, Math, Number, String, Array, Object, JSON, isFinite, isNaN, parseFloat, parseInt };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['js/core.js', ...files]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.TH;
};
