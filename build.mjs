// Bundles src/ + vendor/ into one self-contained index.html (works offline, from file://).
import { readFileSync, writeFileSync } from 'node:fs';
const strip = (code) => code
  .replace(/^import .*$/gm, '')
  .replace(/^export (const|function|class) /gm, '$1 ');
const js = ['vendor/chess.js', 'src/awareness.js', 'src/app.js'].map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
const html = readFileSync('src/template.html', 'utf8').replace('/*SCRIPT*/', () => `(() => {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();`);
writeFileSync('index.html', html);
console.log(`index.html written (${(html.length / 1024).toFixed(0)} KB)`);
