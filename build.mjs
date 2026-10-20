// Bundles src/ + vendor/chess.js into one index.html. The engine files in vendor/stockfish/ stay separate
// (a Web Worker has to load them by URL), so serve the folder over http(s), e.g. GitHub Pages.
import { readFileSync, writeFileSync } from 'node:fs';
const strip = (code) => code
  .replace(/^import .*$/gm, '')
  .replace(/^export (const|function|class) /gm, '$1 ');
const files = ['vendor/chess.js', 'src/awareness.js', 'src/engine.js', 'src/editor.js', 'src/app.js'];
const js = files.map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
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
console.log(`index.html ${(page.length / 1024).toFixed(0)} KB`);
