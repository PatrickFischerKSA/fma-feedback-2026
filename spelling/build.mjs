import { copyFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';

const directory = 'dist/assets/spelling';
mkdirSync(directory, {recursive:true});
await build({
  entryPoints:['spelling/check.mjs'],
  outfile:directory + '/check.mjs',
  bundle:true,
  format:'esm',
  minify:true,
  legalComments:'eof'
});
for (const [source,name] of [
  ['spelling/ui.mjs','ui.mjs'],
  ['node_modules/dictionary-de-ch/index.aff','index.aff'],
  ['node_modules/dictionary-de-ch/index.dic','index.dic'],
  ['node_modules/dictionary-de-ch/license','dictionary-license.txt'],
  ['spelling/GPL-2.0.txt','GPL-2.0.txt'],
  ['node_modules/nspell/license','nspell-license.txt'],
  ['node_modules/is-buffer/LICENSE','is-buffer-license.txt']
]) copyFileSync(source,directory + '/' + name);
