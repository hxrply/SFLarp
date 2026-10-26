// Bundles src/ + vendor/chess.js into one index.html. The engine files in vendor/stockfish/ stay separate
// (a Web Worker has to load them by URL), so serve the folder over http(s), e.g. GitHub Pages.
import { readFileSync, writeFileSync } from 'node:fs';
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
const [headPart, ...rest] = fragment.split('</style>\n');
const page = `<!doctype html>
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
writeFileSync('index.html', page);
// `node build.mjs --fragment out.html` also writes the page without its document wrapper (for hosts that add their own)
const at = process.argv.indexOf('--fragment');
if (at > 0) writeFileSync(process.argv[at + 1], fragment);
console.log(`index.html ${(page.length / 1024).toFixed(0)} KB`);
