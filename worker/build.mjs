import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { titles } from '../site/feedback.mjs';

const entries = [
  ['/', 'index.html', 'text/html'],
  ['/lehrer', 'lehrer.html', 'text/html'],
  ['/feedback.mjs', 'feedback.mjs', 'text/javascript'],
  ['/broschuere.json', 'broschuere.json', 'application/json'],
  ...titles.map((_, i) => ['/bilder/' + (i+1) + '.jpg', 'bilder/' + (i+1) + '.jpg', 'image/jpeg'])
];
const assets = Object.fromEntries(entries.map(([path, file, type]) => {
  const body = readFileSync(new URL('../site/' + file, import.meta.url));
  return [path, [type, type === 'image/jpeg' ? body.toString('base64') : body.toString('utf8')]];
}));
mkdirSync('dist/server', {recursive:true});
writeFileSync('dist/server/index.js', readFileSync('site/feedback.mjs','utf8') +
  '\nconst assets = ' + JSON.stringify(assets) + ';\n' + readFileSync('worker/index.mjs','utf8'));
