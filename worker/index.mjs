const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
const json = (body, status = 200) => Response.json(body, {status, headers});
const invalid = error => json({error}, 400);
const inRange = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

async function isTeacher(request, password) {
  if (!password) return false;
  const supplied = request.headers.get('Authorization') || '';
  const expected = 'Basic ' + btoa('lehrer:' + password);
  const encoder = new TextEncoder();
  const [left,right] = await Promise.all([supplied, expected].map(value =>
    crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

async function readBody(request) {
  if (request.headers.get('Content-Type') !== 'application/json' || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value,{stream:true});
  }
  try { return JSON.parse(body + decoder.decode()); } catch { return null; }
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const teacher = ['/lehrer','/api/lehrer','/api/lehrer/kommentare'].includes(path);
  if (teacher && !await isTeacher(request, env.TEACHER_PASSWORD)) {
    return new Response('Lehrerbereich', {status:401, headers:{
      ...headers, 'WWW-Authenticate':'Basic realm="FMA Lehrperson", charset="UTF-8"'
    }});
  }
  if (request.method === 'GET' && Object.hasOwn(assets,path)) {
    const [type, data] = assets[path];
    const image = type === 'image/jpeg';
    return new Response(image ? Uint8Array.from(atob(data), char => char.charCodeAt(0)) : data, {
      headers:{...headers, 'Content-Type':image ? type : type+'; charset=utf-8'}
    });
  }
  if (!['/api/feedback','/api/lehrer','/api/kommentare','/api/lehrer/kommentare','/api/likes'].includes(path)) return json({error:'Seite nicht gefunden.'},404);
  const db = env.DB;
  const settings = path === '/api/kommentare' || path === '/api/lehrer/kommentare';
  if (request.method === 'GET' && settings) {
    const row = await db.prepare('SELECT is_open FROM comment_settings WHERE id=1').first();
    return json({open:row?.is_open === 1});
  }
  if (request.method === 'GET' && path === '/api/likes') {
    return json({error:'Methode nicht verfügbar.'},405);
  }
  if (request.method === 'GET' && path === '/api/feedback') {
    const {results} = await db.prepare(`SELECT id, initials, talk, prompt, detail,
      (SELECT count(*) FROM comment_likes WHERE feedback_id=feedback.id) AS likes
      FROM feedback WHERE state='approved' ORDER BY id`).all();
    return json(results);
  }
  if (request.method === 'GET') {
    const {results} = await db.prepare('SELECT id, initials, talk, prompt, detail FROM feedback WHERE state=? ORDER BY id')
      .bind(teacher ? 'pending' : 'approved').all();
    return json(results);
  }
  if (request.method !== 'POST') return json({error:'Methode nicht verfügbar.'},405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({error:'Ungültiger Ursprung.'},403);
  const data = await readBody(request);
  if (!data) return invalid('Ungültige Anfrage.');
  if (settings) {
    if (!teacher) return json({error:'Methode nicht verfügbar.'},405);
    if (typeof data.open !== 'boolean') return invalid('Ungültiger Status.');
    const row = await db.prepare('UPDATE comment_settings SET is_open=? WHERE id=1 RETURNING is_open')
      .bind(Number(data.open)).first();
    if (!row) return json({error:'Der Status konnte nicht gespeichert werden.'},503);
    return json({open:row.is_open === 1});
  }
  if (path === '/api/likes') {
    if (!Number.isSafeInteger(data.id) || data.id < 1 || typeof data.voter !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(data.voter)) return invalid('Ungültiges Like.');
    const result = await db.prepare(`INSERT OR IGNORE INTO comment_likes(feedback_id,voter)
      SELECT id,? FROM feedback WHERE id=? AND state='approved'`).bind(data.voter,data.id).run();
    const row = await db.prepare(`SELECT count(comment_likes.voter) AS likes
      FROM feedback LEFT JOIN comment_likes ON feedback_id=feedback.id
      WHERE feedback.id=? AND state='approved' GROUP BY feedback.id`).bind(data.id).first();
    return row ? json({likes:row.likes}) : json({error:'Kommentar nicht gefunden.'},404);
  }
  if (teacher) {
    if (!Number.isSafeInteger(data.id) || !['approved','deleted'].includes(data.state)) return invalid('Ungültige Entscheidung.');
    const result = data.state === 'deleted'
      ? await db.prepare("DELETE FROM feedback WHERE id=? AND state='pending'").bind(data.id).run()
      : await db.prepare("UPDATE feedback SET state='approved' WHERE id=? AND state='pending'").bind(data.id).run();
    return result.meta.changes ? json({ok:true}) : json({error:'Dieser Kommentar wurde bereits bearbeitet.'},409);
  }
  const initials = typeof data.initials === 'string' ? data.initials.trim().normalize('NFC').toUpperCase() : '';
  if (!/^\p{L}{2,4}$/u.test(initials) || !Number.isInteger(data.talk) || !inRange(data.talk-1,titles.length) ||
      !inRange(data.prompt,prompts.length) || typeof data.detail !== 'string' || data.detail.length > 140) {
    return invalid('Gib zwei bis vier Buchstaben als Initialen ein und wähle eine Präsentation und einen Kommentar.');
  }
  const detail = data.detail.trim();
  const error = feedbackError(detail);
  if (error) return json({error},422);
  const result = await db.prepare(`INSERT INTO feedback(initials,talk,prompt,detail)
    SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM comment_settings WHERE id=1 AND is_open=1)`)
    .bind(initials,data.talk,data.prompt,detail).run();
  return result.meta.changes ? json({ok:true},201) : json({error:'Die Kommentarfunktion ist geschlossen.',closed:true},409);
}

export default {
  async fetch(request, env) {
    try { return await route(request, env); }
    catch { return json({error:'Die Anfrage konnte nicht verarbeitet werden.'},500); }
  }
};
