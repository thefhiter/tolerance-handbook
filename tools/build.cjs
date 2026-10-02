// Builds the portable package: dist/ToleranceHandbook/ (open "Tolerance Handbook.html") and a zip of it.
// Usage: node tools/build.cjs [outputZipPath]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP = path.join(DIST, 'ToleranceHandbook');
const version = require(path.join(ROOT, 'package.json')).version;
const zip = path.resolve(process.argv[2] || path.join(DIST, `ToleranceHandbook-${version}.zip`));

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
for (const dir of ['css', 'js']) fs.cpSync(path.join(ROOT, dir), path.join(APP, dir), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(APP, 'Tolerance Handbook.html'));
fs.writeFileSync(path.join(APP, 'READ ME - LISEZ-MOI.txt'), [
  `Tolerance Handbook ${version} / Manuel des tolérances ${version}`,
  '',
  'EN  Double-click "Tolerance Handbook.html". It opens in your web browser and works',
  '    completely offline - nothing to install. Switch EN / FR at the top right.',
  '    Keep the css and js folders next to the .html file.',
  '',
  'FR  Double-cliquer sur « Tolerance Handbook.html ». Le fichier s’ouvre dans le navigateur',
  '    et fonctionne entièrement hors ligne, sans installation. Choisir EN / FR en haut à droite.',
  '    Laisser les dossiers css et js à côté du fichier .html.',
  ''
].join('\r\n'));

fs.mkdirSync(path.dirname(zip), { recursive: true });
fs.rmSync(zip, { force: true });
// Windows 10+ ships bsdtar, which writes zip archives with -a.
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(TAR, ['-a', '-c', '-f', zip, '-C', DIST, 'ToleranceHandbook'], { stdio: 'inherit' });
console.log('Built', APP);
console.log('Zip  ', zip, (fs.statSync(zip).size / 1024).toFixed(0) + ' KB');
