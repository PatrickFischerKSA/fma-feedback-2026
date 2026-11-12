import nspell from 'nspell';

const clauseVerbs = '(?:denke|glaube|hoffe|finde|meine|weiss|dachte|glaubte|hoffte|fand|meinte|wusste)';
const clauseSubject = '(?:ich|du|wir|ihr|er|sie|es|man|das|der|die|ein|eine)';
const mistakenConjunction = new RegExp(
  '((?:^|[^\\p{L}])(?:ich|wir|sie|er)\\s+' + clauseVerbs +
  ')(?:\\s*,\\s*|\\s+)das(?=\\s+' + clauseSubject + '\\b)', 'giu'
);
const missingClauseComma = /([\p{L}\p{N}»”)\]])[ \t]+(dass|weil|obwohl|sodass)(?=[ \t]+\p{L})/gu;
const commonAgreement = /\b((?:die|diese|deine|eure)\s+(?:Beispiele|Folien|Bilder|Erklärungen|Antworten))\s+(war|ist|hat|wird)\b/giu;
const commonSwissWords = new Set(['gut', 'gross', 'Strasse']);
const pluralVerbs = {war:'waren', ist:'sind', hat:'haben', wird:'werden'};

function correctGrammarAndPunctuation(text) {
  return text
    .replace(mistakenConjunction, '$1, dass')
    .replace(missingClauseComma, '$1, $2')
    .replace(commonAgreement, (_, subject, verb) => subject + ' ' + pluralVerbs[verb.toLowerCase()])
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=\p{L})/gu, '$1 ')
    .replace(/^([ \t]*)(\p{Ll})/u, (_, space, letter) => space + letter.toLocaleUpperCase('de-CH'))
    .replace(/(\p{L}+(?:[ \t]+\p{L}+)+)([ \t]*)$/u, '$1.$2');
}

export function correctText(text, dictionary) {
  const replacements = new Map();
  const corrected = text.replace(/\p{L}[\p{L}\p{M}]*/gu, word => {
    if (replacements.has(word)) return replacements.get(word);
    const normalized = word.normalize('NFC');
    const swiss = normalized.replaceAll('ß', 'ss').replaceAll('ẞ', 'SS');
    const suggestion = commonSwissWords.has(swiss) || dictionary.correct(swiss) ? swiss : dictionary.suggest(swiss)[0];
    const result = (suggestion || (swiss === normalized ? word : swiss)).replaceAll('ß','ss').replaceAll('ẞ','SS');
    replacements.set(word, result);
    return result;
  });
  return correctGrammarAndPunctuation(corrected);
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
