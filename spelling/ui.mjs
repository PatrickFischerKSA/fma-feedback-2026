let worker;
let activeCheck;

function check(text) {
  const request = activeCheck || Promise.resolve();
  const result = request.catch(() => {}).then(() => new Promise((resolve,reject) => {
    if (!worker) {
      worker = new Worker(new URL('./check.mjs', import.meta.url), {type:'module'});
    }
    const complete = (error, value) => {
      clearTimeout(timeout);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      if (error) {
        worker.terminate();
        worker = undefined;
        reject(error);
      } else {
        resolve(value);
      }
    };
    const onMessage = ({data}) => {
      if (data.error) complete(new Error());
      else complete(null, data.text);
    };
    const onError = () => complete(new Error());
    const timeout = setTimeout(onError, 20000);
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(text);
  }));
  activeCheck = result;
  return result;
}

export function addSpellingControl(field, after = field, prefix = () => '') {
  const panel = document.createElement('div');
  const checkButton = document.createElement('button');
  checkButton.type = 'button';
  checkButton.textContent = 'Rechtschreibung korrigieren';
  const status = document.createElement('p');
  status.setAttribute('role','status');
  const preview = document.createElement('blockquote');
  preview.hidden = true;
  preview.style.whiteSpace = 'pre-wrap';
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.hidden = true;
  accept.textContent = 'Korrigierte Fassung übernehmen';
  panel.append(checkButton,status,preview,accept);
  after.after(panel);

  function clear() {
    preview.hidden = accept.hidden = true;
    status.textContent = '';
    accept.onclick = null;
  }
  field.addEventListener('input',clear);
  checkButton.addEventListener('click', async () => {
    clear();
    const original = field.value;
    const sentence = prefix();
    if (!original.trim()) {
      status.textContent = sentence ? 'Der vorformulierte Satz ist bereits geprüft.' : 'Schreibe zuerst einen Kommentar.';
      return;
    }
    checkButton.disabled = true;
    status.textContent = 'Rechtschreibung wird geprüft …';
    try {
      const corrected = await check(original);
      if (field.value !== original) {
        status.textContent = 'Der Text wurde geändert. Starte die Prüfung erneut.';
        return;
      }
      if (corrected === original) {
        status.textContent = 'Keine Korrekturvorschläge gefunden.';
        return;
      }
      preview.textContent = [sentence, corrected].filter(Boolean).join(' ');
      preview.hidden = false;
      if (field.maxLength >= 0 && corrected.length > field.maxLength) {
        status.textContent = 'Der Vorschlag überschreitet die Zeichenlimite. Du kannst einzelne Korrekturen von Hand übernehmen.';
        return;
      }
      status.textContent = 'Korrekturvorschlag';
      accept.hidden = false;
      accept.onclick = () => {
        if (field.value !== original) return clear();
        field.value = corrected;
        field.dispatchEvent(new Event('input',{bubbles:true}));
        status.textContent = 'Korrektur übernommen.';
        field.focus();
      };
    } catch {
      status.textContent = 'Rechtschreibprüfung gerade nicht verfügbar. Bitte versuche es erneut.';
    } finally {
      checkButton.disabled = false;
    }
  });
}
