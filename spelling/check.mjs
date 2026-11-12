import nspell from 'nspell';

export function correctText(text, dictionary) {
  const replacements = new Map();
  return text.replace(/\p{L}[\p{L}\p{M}]*/gu, word => {
    if (replacements.has(word)) return replacements.get(word);
    const normalized = word.normalize('NFC');
    const swiss = normalized.replaceAll('ß', 'ss').replaceAll('ẞ', 'SS');
    const suggestion = dictionary.correct(swiss) ? swiss : dictionary.suggest(swiss)[0];
    const result = (suggestion || (swiss === normalized ? word : swiss)).replaceAll('ß','ss').replaceAll('ẞ','SS');
    replacements.set(word, result);
    return result;
  });
}

let dictionary;
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', async ({data}) => {
    try {
      if (!dictionary) {
        const [aff, dic] = await Promise.all(['index.aff','index.dic'].map(async file => {
          const response = await fetch(new URL(file, import.meta.url));
          if (!response.ok) throw new Error('Wörterbuch nicht verfügbar');
          return response.text();
        }));
        dictionary = nspell(aff, dic);
      }
      self.postMessage({text:correctText(data,dictionary)});
    } catch {
      self.postMessage({error:true});
    }
  });
}
