// Bundles src/ + vendor/ into one self-contained page.
//   index.html    standalone (works offline, from file://)
//   artifact.html fragment for the Artifact publisher (it adds the document skeleton itself)
import { readFileSync, writeFileSync } from 'node:fs';
const strip = (code) => code
  .replace(/^import .*$/gm, '')
  .replace(/^export (const|function|class) /gm, '$1 ');
const js = ['vendor/chess.js', 'src/awareness.js', 'src/app.js'].map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
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
writeFileSync('artifact.html', fragment);
console.log(`index.html ${(page.length / 1024).toFixed(0)} KB, artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);
