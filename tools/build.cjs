// Builds the release: dist/ToleranceHandbook.exe (single-file Windows app, needs the .NET SDK to build)
// and dist/ToleranceHandbook/ (exe + portable web version) zipped.
// Usage: node tools/build.cjs [outputZipPath] [--no-exe]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const APP = path.join(DIST, 'ToleranceHandbook');
const version = require(path.join(ROOT, 'package.json')).version;
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const zip = path.resolve(args[0] || path.join(DIST, `ToleranceHandbook-${version}.zip`));
const withExe = !process.argv.includes('--no-exe');

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
for (const dir of ['css', 'js']) fs.cpSync(path.join(ROOT, dir), path.join(APP, dir), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(APP, 'Tolerance Handbook.html'));
if (withExe) {
  // The exe embeds index.html, css/ and js/, so it is rebuilt on every release.
  execFileSync('dotnet', ['build', path.join(ROOT, 'desktop', 'ToleranceHandbook.csproj'), '-c', 'Release', '-nologo', '-v', 'q',
    `-p:Version=${version}`], { stdio: 'inherit' });
  const exe = path.join(ROOT, 'desktop', 'bin', 'Release', 'net48', 'ToleranceHandbook.exe');
  fs.copyFileSync(exe, path.join(DIST, 'ToleranceHandbook.exe'));
  fs.copyFileSync(exe, path.join(APP, 'ToleranceHandbook.exe'));
}
fs.writeFileSync(path.join(APP, 'READ ME - LISEZ-MOI.txt'), [
  `Tolerance Handbook ${version} / Manuel des tolérances ${version}`,
  '',
  'EN  Windows: double-click ToleranceHandbook.exe - it opens in its own window, works offline,',
  '    nothing to install (it can also be copied anywhere on its own).',
  '    Other systems (Mac, Linux, tablet): open "Tolerance Handbook.html" in a web browser,',
  '    keeping the css and js folders next to it. Switch EN / FR at the top right.',
  '',
  'FR  Windows : double-cliquer sur ToleranceHandbook.exe - il s’ouvre dans sa propre fenêtre,',
  '    fonctionne hors ligne, sans installation (il peut aussi être copié seul n’importe où).',
  '    Autres systèmes (Mac, Linux, tablette) : ouvrir « Tolerance Handbook.html » dans un navigateur,',
  '    en laissant les dossiers css et js à côté. Choisir EN / FR en haut à droite.',
  ''
].join('\r\n'));

fs.mkdirSync(path.dirname(zip), { recursive: true });
fs.rmSync(zip, { force: true });
// Windows 10+ ships bsdtar, which writes zip archives with -a.
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(TAR, ['-a', '-c', '-f', zip, '-C', DIST, 'ToleranceHandbook'], { stdio: 'inherit' });
console.log('Built', APP);
if (withExe) console.log('Exe  ', path.join(DIST, 'ToleranceHandbook.exe'));
console.log('Zip  ', zip, (fs.statSync(zip).size / 1024).toFixed(0) + ' KB');
