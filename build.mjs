// Bundles src/ + vendor/chess.js into one index.html. The engine files in vendor/stockfish/ stay separate
// (a Web Worker has to load them by URL), so serve the folder over http(s), e.g. GitHub Pages.
// Also builds the browser extension in extension/ and packs it as sflarp-extension.zip.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const strip = (code) => code
  .replace(/^import .*$/gm, '')
  .replace(/^export (const|let|function|async function|class) /gm, '$1 ');
const files = ['vendor/chess.js', 'src/awareness.js', 'src/engine.js', 'src/editor.js', 'src/openings.js', 'src/app.js'];
// every module imported by a bundled file must itself be bundled (in order) or the page breaks at runtime
for (const f of files) {
  for (const [, rel] of readFileSync(f, 'utf8').matchAll(/^import .* from '(.+)';$/gm)) {
    const target = new URL(rel, `file:///${f}`).pathname.slice(1);
    if (files.indexOf(target) < 0 || files.indexOf(target) > files.indexOf(f)) throw new Error(`build: ${f} imports ${target}, which is not bundled before it`);
  }
}
const js = files.map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
const leftover = js.match(/^(import|export)\b.*$/m);
if (leftover) throw new Error(`build: module syntax left in the bundle: ${leftover[0]}`);
new Function(js); // fail the build on a syntax error instead of shipping a blank page
const fragment = readFileSync('src/template.html', 'utf8')
  .replace('/*SCRIPT*/', () => `(() => {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();`);
const wrap = (frag) => {
  const [headPart, ...rest] = frag.split('</style>\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headPart}</style>
</head>
<body>
${rest.join('</style>\n')}</body>
</html>
`;
};
const page = wrap(fragment);
writeFileSync('index.html', page);

// Extension page: extensions forbid inline scripts, so the bundle goes in its own file.
// The web-app manifest and home-screen tags are dropped (they mean nothing inside an extension).
const extPage = wrap(readFileSync('src/template.html', 'utf8')
  .replace('<script>/*SCRIPT*/</script>', '<script src="app.js"></script>')
  .replace(/^<meta name="(claude:viewport-fit-sides|mobile-web-app-capable|apple-[^"]+)".*\n/gm, '')
  .replace(/^<link rel="(manifest|apple-touch-icon)".*\n/gm, '')
  .replace('href="icons/icon-192.png"', 'href="icons/icon-32.png"'));
if (/<script>(?!<\/script>)/.test(extPage)) throw new Error('build: inline script left in the extension page');
writeFileSync('extension/sidepanel.html', extPage);
writeFileSync('extension/app.js', `(() => {\n${js}\n})();\n`);
mkdirSync('extension/vendor/stockfish', { recursive: true });
for (const f of readdirSync('vendor/stockfish')) copyFileSync(`vendor/stockfish/${f}`, `extension/vendor/stockfish/${f}`);
// fixed timestamps and sorted entries keep the zip identical between builds of the same code
execFileSync('python3', ['-I', '-c', `
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
names = sorted(os.path.relpath(os.path.join(d, f), src) for d, _, fs in os.walk(src) for f in fs)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in names:
        info = zipfile.ZipInfo(n.replace(os.sep, '/'), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with open(os.path.join(src, n), 'rb') as fh: z.writestr(info, fh.read())
`, 'extension', 'sflarp-extension.zip']);
// `node build.mjs --fragment out.html` also writes the page without its document wrapper (for hosts that add their own)
const at = process.argv.indexOf('--fragment');
if (at > 0) writeFileSync(process.argv[at + 1], fragment);
console.log(`index.html ${(page.length / 1024).toFixed(0)} KB, extension/ + sflarp-extension.zip ${(readFileSync('sflarp-extension.zip').length / 1024).toFixed(0)} KB`);
