import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { titles, prompts, feedbackError } from './site/feedback.mjs';

const password = process.env.TEACHER_PASSWORD;
const host = process.env.FMA_HOST || '127.0.0.1';
const local = ['127.0.0.1', '::1'].includes(host);
if (!password || (!local && password.length < 16)) {
  throw new Error('Setze TEACHER_PASSWORD. Für Netzwerkbetrieb sind mindestens 16 Zeichen erforderlich.');
}
const digest = value => createHash('sha256').update(value).digest();
const expected = digest('lehrer:' + password);
process.umask(0o077);
const db = new DatabaseSync(process.env.FMA_DB || 'feedback.sqlite');
db.exec(`CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY, initials TEXT NOT NULL, talk INTEGER NOT NULL,
  prompt INTEGER NOT NULL, detail TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending'
)`);
const insert = db.prepare('INSERT INTO feedback(initials,talk,prompt,detail) VALUES (?,?,?,?)');
const list = db.prepare('SELECT id,initials,talk,prompt,detail FROM feedback WHERE state=? ORDER BY id');
const decide = db.prepare("UPDATE feedback SET state=? WHERE id=? AND state='pending'");
const remove = db.prepare("DELETE FROM feedback WHERE id=? AND state='pending'");
const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/lehrer', ['lehrer.html', 'text/html']],
  ['/feedback.mjs', ['feedback.mjs', 'text/javascript']],
  ['/broschuere.json', ['broschuere.json', 'application/json']],
  ...titles.map((_, index) => {
    const image = '/bilder/' + (index + 1) + '.jpg';
    return [image, [image.slice(1), 'image/jpeg']];
  })
].map(([url,[file,type]]) => [url,[readFileSync(new URL('./site/' + file, import.meta.url)),type]]));

let failures = 0;
let failureWindow = 0;
function authorized(req, res) {
  const now = Date.now();
  if (now >= failureWindow) {
    failures = 0;
    failureWindow = now + 60_000;
  }
  if (failures >= 8) {
    res.writeHead(429, {'Retry-After':'60'}).end('Bitte warte eine Minute.');
    return false;
  }
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Basic ') && timingSafeEqual(digest(Buffer.from(auth.slice(6),'base64')), expected)) return true;
  if (auth) failures++;
  res.writeHead(401, {'WWW-Authenticate':'Basic realm="FMA Lehrperson", charset="UTF-8"'}).end('Lehrerbereich');
  return false;
}
function json(res, status, value) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(value));
}
async function readJson(req) {
  if (req.headers['content-type'] !== 'application/json') return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) return null;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}
const inRange = (number, length) => Number.isInteger(number) && number >= 0 && number < length;

createServer(async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const path = req.url.split('?')[0];
  if ((path === '/lehrer' || path === '/api/lehrer') && !authorized(req,res)) return;
  try {
    if (req.method === 'GET' && assets.has(path)) {
      const [body,type] = assets.get(path);
      return res.writeHead(200,{'Content-Type':type.startsWith('image/') ? type : type+'; charset=utf-8'}).end(body);
    }
    if (path === '/api/feedback' && req.method === 'GET') return json(res,200,list.all('approved'));
    if (path === '/api/lehrer' && req.method === 'GET') return json(res,200,list.all('pending'));
    if (req.method === 'POST' && ['/api/feedback','/api/lehrer'].includes(path)) {
      const data = await readJson(req);
      if (!data) return json(res,400,{error:'Ungültige Anfrage.'});
      if (path === '/api/lehrer') {
        if (!Number.isSafeInteger(data.id) || !['approved','deleted'].includes(data.state)) return json(res,400,{error:'Ungültige Entscheidung.'});
        const result = data.state === 'deleted' ? remove.run(data.id) : decide.run('approved',data.id);
        return result.changes ? json(res,200,{ok:true}) : json(res,409,{error:'Dieser Kommentar wurde bereits bearbeitet.'});
      }
      const initials = typeof data.initials === 'string' ? data.initials.trim().normalize('NFC').toUpperCase() : '';
      if (!/^\p{L}{2,4}$/u.test(initials) || !inRange(data.talk - 1,titles.length) || !Number.isInteger(data.talk) || !inRange(data.prompt,prompts.length) || typeof data.detail !== 'string' || data.detail.length > 140) {
        return json(res,400,{error:'Gib zwei bis vier Buchstaben als Initialen ein und wähle eine Präsentation und einen Kommentar.'});
      }
      const detail = data.detail.trim();
      const error = feedbackError(detail);
      if (error) return json(res,422,{error});
      insert.run(initials,data.talk,data.prompt,detail);
      return json(res,201,{ok:true});
    }
    return json(res,404,{error:'Seite nicht gefunden.'});
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) json(res,500,{error:'Die Anfrage konnte nicht verarbeitet werden.'});
  }
}).listen(Number(process.env.PORT || 8080),host,() => console.log('FMA-Feedback gestartet.'));
