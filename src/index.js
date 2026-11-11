/**
 * SIMDEKA — Cloudflare Worker (API + routing halaman) dengan database D1.
 *
 * Halaman statis ada di folder /public:
 *   /login/   → halaman masuk
 *   /admin/   → aplikasi pengelola (hanya bisa dibuka setelah login)
 *   /f/…      → form & absensi publik (tautan yang dibagikan)
 *   /u/…      → tautan update data (generus / KMM / muballigh)
 *   /r/…      → laporan kehadiran publik
 */

const enc = new TextEncoder();
const SESSION_COOKIE = 'sd_session';
const PBKDF2_ITER = 25000;            // cukup aman dan tetap ringan untuk paket gratis Workers
const KV_CHUNK = 400000;              // karakter per baris D1 (batas D1 ±2 MB per baris, aman untuk UTF-8)
const MAX_BODY = 8 * 1024 * 1024;     // 8 MB
const ROLES = ['super_admin', 'admin_desa'];

/* ------------------------------------------------------------------ util */
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
const err = (msg, status = 400, extra = {}) => json({ error: msg, ...extra }, status);
const now = () => Date.now();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const randHex = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function readJson(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw new HttpError('Data terlalu besar.', 413);
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError('Data terlalu besar.', 413);
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError('Format data tidak valid.', 400); }
}
class HttpError extends Error { constructor(m, s = 400) { super(m); this.status = s; } }

/* ---------------------------------------------------------------- sandi */
async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: `pbkdf2$${PBKDF2_ITER}$${b64(bits)}`, salt: b64(salt) };
}
async function verifyPassword(password, user) {
  const parts = String(user.pass_hash).split('$');
  const iter = Number(parts[1]) || PBKDF2_ITER;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(user.pass_salt), iterations: iter }, key, 256);
  const a = b64(bits), b = parts[2] || '';
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* -------------------------------------------------------------- sesi/user */
function parseCookies(request) {
  const out = {};
  (request.headers.get('cookie') || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cookieHeader(token, maxAge) {
  let c = `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (maxAge != null) c += `; Max-Age=${maxAge}`;
  return c;
}
function publicUser(u, sid) {
  let akses = {};
  try { akses = JSON.parse(u.akses || '{}'); } catch { /* abaikan */ }
  const isSuper = u.role === 'super_admin';
  return {
    id: u.id, nama: u.nama, username: u.username, role: u.role, peran: u.peran || '',
    akses: isSuper ? null : akses,
    menus: isSuper ? null : Object.keys(akses).filter((k) => akses[k] && akses[k] !== 'tidak'),
    must_change: !!u.must_change,
    sid: sid || '',
  };
}
async function getSession(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || token.length < 32) return null;
  const th = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.*, s.expires_at AS s_exp FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.aktif = 1`
  ).bind(th, now()).first();
  if (!row) return null;
  return { user: row, sid: th.slice(0, 12), tokenHash: th };
}
async function createSession(env, userId, remember) {
  const token = randHex(32);
  const ttl = remember ? 30 * 86400 : 24 * 3600;
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .bind(await sha256(token), userId, now(), now() + ttl * 1000).run();
  // bersihkan sesi kedaluwarsa sesekali
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now()).run();
  return { token, maxAge: remember ? ttl : null };
}
async function ensureSeed(env) {
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (c && c.n > 0) return;
  const pw = (env.ADMIN_PASSWORD && String(env.ADMIN_PASSWORD).length >= 4) ? String(env.ADMIN_PASSWORD) : 'admin';
  const { hash, salt } = await hashPassword(pw);
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, username, nama, role, peran, akses, pass_hash, pass_salt, aktif, must_change, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,1,1,?,?)`
    ).bind('u_' + randHex(6), 'admin', 'Administrator', 'super_admin', '', '{}', hash, salt, now(), now()).run();
  } catch { /* sudah dibuat oleh permintaan lain */ }
}
const requireAuth = async (request, env) => {
  const s = await getSession(request, env);
  if (!s) throw new HttpError('Belum login', 401);
  return s;
};
const requireSuper = async (request, env) => {
  const s = await requireAuth(request, env);
  if (s.user.role !== 'super_admin') throw new HttpError('Hanya Super Admin yang boleh melakukan ini.', 403);
  return s;
};

/* ------------------------------------------------------------------ auth */
async function handleLogin(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const since = now() - 15 * 60 * 1000;
  const att = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ts > ?').bind(ip, since).first();
  if (att && att.n >= 10) return err('Terlalu banyak percobaan. Coba lagi 15 menit lagi.', 429);

  const b = await readJson(request);
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!username || !password) return err('Username dan kata sandi wajib diisi.', 400);
  await ensureSeed(env);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  let ok = false;
  if (user) {
    // kata sandi yang dibuat lewat menu "Kelola Akun" diverifikasi dengan sandi asli
    ok = await verifyPassword(password, user);
  } else {
    // samakan waktu respons agar nama pengguna tidak mudah ditebak
    await hashPassword(password);
  }
  if (!ok) {
    await env.DB.prepare('INSERT INTO login_attempts (ip, ts) VALUES (?,?)').bind(ip, now()).run();
    if (Math.random() < 0.1) await env.DB.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(since).run();
    return err('Username atau kata sandi salah.', 401);
  }
  if (!user.aktif) return err('Akun dinonaktifkan.', 403);
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
  const { token, maxAge } = await createSession(env, user.id, !!b.remember);
  return json({ ok: true, must_change: !!user.must_change }, 200, { 'set-cookie': cookieHeader(token, maxAge) });
}

async function handleLogout(request, env) {
  const s = await getSession(request, env);
  if (s) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run();
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}

async function handleMe(request, env) {
  const s = await requireAuth(request, env);
  if (request.method === 'GET') return json({ user: publicUser(s.user, s.sid) });
  // PUT: ubah nama / username / kata sandi sendiri
  const b = await readJson(request);
  const nama = String(b.nama ?? s.user.nama).trim().slice(0, 100);
  const username = String(b.username ?? s.user.username).trim().toLowerCase();
  if (!nama) return err('Nama akun wajib diisi.');
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return err('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
  const dup = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(username, s.user.id).first();
  if (dup) return err('Username sudah dipakai akun lain.', 409);
  let hash = s.user.pass_hash, salt = s.user.pass_salt, must = s.user.must_change;
  if (b.baru) {
    if (String(b.baru).length < 8) return err('Kata sandi baru minimal 8 karakter.');
    const h = await hashPassword(String(b.baru));
    hash = h.hash; salt = h.salt; must = 0;
  }
  await env.DB.prepare('UPDATE users SET nama=?, username=?, pass_hash=?, pass_salt=?, must_change=?, updated_at=? WHERE id=?')
    .bind(nama, username, hash, salt, must, now(), s.user.id).run();
  // setelah ganti sandi, sesi lain milik akun ini dicabut
  if (b.baru) await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(s.user.id, s.tokenHash).run();
  const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(s.user.id).first();
  return json({ ok: true, user: publicUser(u, s.sid) });
}

/* ----------------------------------------------------------------- users */
const userRow = (u) => {
  let akses = {};
  try { akses = JSON.parse(u.akses || '{}'); } catch { /* abaikan */ }
  return { id: u.id, nama: u.nama, username: u.username, peran: u.peran || '', akses, aktif: !!u.aktif, role: u.role };
};
async function listUsers(env) {
  const r = await env.DB.prepare("SELECT * FROM users WHERE role != 'super_admin' ORDER BY created_at").all();
  return (r.results || []).map(userRow);
}
async function handleUsers(request, env, path) {
  await requireSuper(request, env);
  const m = /^\/api\/users(?:\/([A-Za-z0-9_-]+))?$/.exec(path);
  const id = m && m[1];
  if (request.method === 'GET' && !id) return json({ users: await listUsers(env) });
  if (request.method === 'DELETE' && id) {
    const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    if (!u) return err('Akun tidak ditemukan.', 404);
    if (u.role === 'super_admin') return err('Super Admin tidak bisa dihapus.', 403);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  }
  if (request.method === 'POST' || request.method === 'PUT') {
    const b = await readJson(request);
    const uid = b.id || id || '';
    const username = String(b.username || '').trim().toLowerCase();
    const nama = String(b.nama || '').trim().slice(0, 100);
    const peran = String(b.peran || '').trim().slice(0, 40);
    if (!nama) return err('Nama wajib diisi.');
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) return err('Username 3-32 karakter: huruf kecil, angka, titik, strip, garis bawah.');
    const akses = {};
    Object.keys(b.akses || {}).slice(0, 80).forEach((k) => {
      const v = b.akses[k];
      if (/^[A-Za-z0-9_-]{1,40}$/.test(k) && ['tidak', 'lihat', 'edit'].includes(v)) akses[k] = v;
    });
    const old = uid ? await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first() : null;
    if (old && old.role === 'super_admin') return err('Akun Super Admin diubah lewat menu Akun Saya.', 403);
    const dup = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(username, uid || '').first();
    if (dup) return err('Username sudah dipakai akun lain.', 409);
    const pw = String(b.password || '');
    if ((!old || pw) && pw.length < 8) return err('Kata sandi minimal 8 karakter.');
    const aktif = b.aktif === false ? 0 : 1;
    if (old) {
      let hash = old.pass_hash, salt = old.pass_salt;
      if (pw) { const h = await hashPassword(pw); hash = h.hash; salt = h.salt; }
      await env.DB.prepare('UPDATE users SET username=?, nama=?, peran=?, akses=?, pass_hash=?, pass_salt=?, aktif=?, updated_at=? WHERE id=?')
        .bind(username, nama, peran, JSON.stringify(akses), hash, salt, aktif, now(), old.id).run();
      if (!aktif || pw) await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(old.id).run();
    } else {
      const h = await hashPassword(pw);
      const nid = 'a' + randHex(5);
      await env.DB.prepare(
        `INSERT INTO users (id, username, nama, role, peran, akses, pass_hash, pass_salt, aktif, must_change, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`
      ).bind(nid, username, nama, 'admin_desa', peran, JSON.stringify(akses), h.hash, h.salt, aktif, now(), now()).run();
    }
    return json({ ok: true, users: await listUsers(env) });
  }
  return err('Metode tidak didukung.', 405);
}

/* -------------------------------------------------------------------- kv */
/** Kunci yang boleh disimpan di server. Termasuk simdeka_ai_key (kunci AI notulensi) dan simdeka_fonnte_v1
 *  (token Fonnte): disimpan sekali, otomatis terisi di semua perangkat. Hanya data login/lokal yang diblokir. */
const KV_OK = /^(simdeka_|sidesa_)[A-Za-z0-9_.\-]{1,120}$/;
const KV_BLOCK = /^(simdeka_auth_v1|simdeka_lokal_(user|accounts|su)|simdeka_last_backup|simdeka_dummy_v1|simdeka_file_note|simdeka_form_draft_v1_.*|simdeka_forms_v1|simdeka_form_resp_v1)$/;
const kvAllowed = (k) => KV_OK.test(k) && !KV_BLOCK.test(k);

async function kvReadAll(env) {
  const r = await env.DB.prepare('SELECT k, part, parts, v FROM kv ORDER BY k, part').all();
  const out = {};
  const buf = {};
  for (const row of r.results || []) {
    (buf[row.k] = buf[row.k] || { parts: row.parts, v: [] }).v[row.part] = row.v;
  }
  for (const k of Object.keys(buf)) {
    const o = buf[k];
    if (o.v.length === o.parts && o.v.every((x) => typeof x === 'string')) out[k] = o.v.join('');
  }
  return out;
}
async function handleKvPut(request, env, s) {
  const b = await readJson(request);
  const stmts = [];
  const t = now();
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 200) : []) {
    const k = String(it.k || '');
    if (!kvAllowed(k)) continue;
    const v = String(it.v ?? '');
    const n = Math.max(1, Math.ceil(v.length / KV_CHUNK));
    stmts.push(env.DB.prepare('DELETE FROM kv WHERE k = ?').bind(k));
    for (let i = 0; i < n; i++) {
      stmts.push(env.DB.prepare('INSERT INTO kv (k, part, parts, v, updated_at, updated_by) VALUES (?,?,?,?,?,?)')
        .bind(k, i, n, v.slice(i * KV_CHUNK, (i + 1) * KV_CHUNK), t, s.sid));
    }
  }
  for (const k of Array.isArray(b.del) ? b.del.slice(0, 200) : []) {
    if (kvAllowed(String(k))) stmts.push(env.DB.prepare('DELETE FROM kv WHERE k = ?').bind(String(k)));
  }
  if (!stmts.length) return json({ ok: true, n: 0 });
  // D1 membatasi jumlah perintah per batch; kirim bertahap
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return json({ ok: true, n: stmts.length, t });
}
async function handleKvMeta(env) {
  const r = await env.DB.prepare('SELECT k, MAX(updated_at) AS t, MAX(updated_by) AS by FROM kv GROUP BY k').all();
  const keys = {};
  (r.results || []).forEach((x) => { keys[x.k] = { t: x.t, by: x.by }; });
  const f = await env.DB.prepare('SELECT MAX(updated_at) AS t FROM forms').first();
  const rs = await env.DB.prepare('SELECT COUNT(*) AS n FROM responses').first();
  return json({ keys, forms_t: (f && f.t) || 0, responses_n: (rs && rs.n) || 0, now: now() });
}

/* ----------------------------------------------------------------- forms */
const FM_ID = /^[A-Za-z0-9_-]{1,40}$/;
const FM_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FM_STATUS = { H: 1, I: 1, A: 1 };

function cleanResponse(r) {
  if (!r || typeof r !== 'object') return null;
  const id = String(r.id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  if (!id) return null;
  const str = JSON.stringify(r);
  if (str.length > 120000) return null;
  const o = Object.assign({}, r, { id, ts: Number(r.ts) || now() });
  if (o.m && typeof o.m === 'object') {
    const m = {};
    Object.keys(o.m).slice(0, 5000).forEach((k) => { if (FM_STATUS[o.m[k]]) m[String(k).slice(0, 220)] = o.m[k]; });
    o.m = m;
  }
  o.tg = FM_DATE.test(o.tg || '') ? o.tg : '';
  o.rep = String(o.rep || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  return o;
}
const respToRow = (formId, o) => [formId, o.id, o.tg || '', o.rep || '', o.ts, now(), JSON.stringify(o)];

async function upsertResponses(env, formId, list) {
  const stmts = list.map((o) => env.DB.prepare(
    'INSERT INTO responses (form_id, id, tg, rep, ts, st, data) VALUES (?,?,?,?,?,?,?) ON CONFLICT(form_id, id) DO UPDATE SET tg=excluded.tg, rep=excluded.rep, ts=excluded.ts, st=excluded.st, data=excluded.data'
  ).bind(...respToRow(formId, o)));
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
}

async function formsList(env) {
  const r = await env.DB.prepare('SELECT id, type, title, shared, data, updated_at FROM forms ORDER BY updated_at DESC').all();
  return (r.results || []).map((x) => {
    let data = {};
    try { data = JSON.parse(x.data); } catch { /* abaikan */ }
    return { id: x.id, type: x.type, title: x.title, shared: !!x.shared, updated_at: x.updated_at, data };
  });
}
async function responsesByForm(env) {
  const r = await env.DB.prepare('SELECT form_id, data FROM responses ORDER BY ts').all();
  const out = {};
  (r.results || []).forEach((x) => {
    try { (out[x.form_id] = out[x.form_id] || []).push(JSON.parse(x.data)); } catch { /* abaikan */ }
  });
  return out;
}

async function handleFormsSync(request, env) {
  const b = await readJson(request);
  const list = Array.isArray(b.forms) ? b.forms.slice(0, 300) : [];
  const stmts = [];
  const t = now();
  for (const f of list) {
    if (!f || !FM_ID.test(String(f.id || ''))) continue;
    const data = JSON.stringify(f.data || {});
    const payload = JSON.stringify(f.payload || {});
    if (data.length > 1500000 || payload.length > 1500000) continue;
    stmts.push(env.DB.prepare(
      `INSERT INTO forms (id, type, title, shared, data, payload, updated_at) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET type=excluded.type, title=excluded.title, shared=excluded.shared, data=excluded.data, payload=excluded.payload, updated_at=excluded.updated_at`
    ).bind(String(f.id), f.type === 'absensi' ? 'absensi' : 'custom', String(f.title || '').slice(0, 200), f.shared ? 1 : 0, data, payload, t));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return json({ ok: true, n: stmts.length, t });
}

async function handleFormDelete(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM responses WHERE form_id = ?').bind(id),
    env.DB.prepare('DELETE FROM forms WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function handleResponsePost(request, env, formId) {
  const form = await env.DB.prepare('SELECT id, shared, payload FROM forms WHERE id = ?').bind(formId).first();
  if (!form) return err('Form tidak ditemukan.', 404);
  const session = await getSession(request, env);
  const b = await readJson(request);
  const raw = Array.isArray(b.list) ? b.list : [b.resp];
  const list = raw.slice(0, 200).map(cleanResponse).filter(Boolean);
  if (!list.length) return err('Tanggapan tidak valid.');
  if (!session) {
    if (!form.shared) return err('Form belum dibuka untuk umum.', 403);
    let p = {};
    try { p = JSON.parse(form.payload); } catch { /* abaikan */ }
    if (typeof p.dl === 'string' && p.dl.startsWith('2000-')) return err('Form sudah ditutup.', 403);
    if (list.length > 1) return err('Pengiriman massal hanya untuk pengelola.', 403);
  }
  await upsertResponses(env, formId, list);
  return json({ ok: true, n: list.length });
}

async function handleResponseDelete(env, formId, rid) {
  if (rid) await env.DB.prepare('DELETE FROM responses WHERE form_id = ? AND id = ?').bind(formId, rid).run();
  else await env.DB.prepare('DELETE FROM responses WHERE form_id = ?').bind(formId).run();
  return json({ ok: true });
}

/* ---------------------------------------------------- halaman/laporan publik */
async function getSharedForm(env, id) {
  if (!FM_ID.test(id)) return null;
  const row = await env.DB.prepare('SELECT id, type, title, shared, data, payload FROM forms WHERE id = ?').bind(id).first();
  return row && row.shared ? row : null;
}
async function handlePublicForm(env, id) {
  const f = await getSharedForm(env, id);
  if (!f) return err('Form tidak ditemukan atau belum dibagikan.', 404);
  let payload = {};
  try { payload = JSON.parse(f.payload); } catch { /* abaikan */ }
  return json({ payload });
}
async function handlePublicStatus(env, id, url) {
  const f = await getSharedForm(env, id);
  if (!f) return err('Form tidak ditemukan.', 404);
  const tg = url.searchParams.get('tg') || '';
  const q = FM_DATE.test(tg)
    ? await env.DB.prepare("SELECT data FROM responses WHERE form_id = ? AND (tg = ? OR tg = '') ORDER BY ts").bind(id, tg).all()
    : await env.DB.prepare('SELECT data FROM responses WHERE form_id = ? ORDER BY ts').bind(id).all();
  const responses = [];
  (q.results || []).forEach((x) => {
    try {
      const o = JSON.parse(x.data);
      if (o && o.m) responses.push({ id: o.id, rep: o.rep || '', ts: o.ts, tg: o.tg || '', kel: o.kel || '', pj: o.pj || '', m: o.m });
    } catch { /* abaikan */ }
  });
  return json({ responses });
}

const normNama = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const fmKey = (n, k) => normNama(n).toLowerCase() + '|' + String(k || '').trim().toLowerCase();

async function buildReport(env, row, tgWanted) {
  let data = {};
  try { data = JSON.parse(row.data); } catch { /* abaikan */ }
  if (row.type !== 'absensi' || !data.absen) throw new HttpError('Laporan hanya tersedia untuk form absensi.', 400);
  const a = data.absen;
  const tg = FM_DATE.test(tgWanted || '') ? tgWanted : a.tanggal;
  const q = await env.DB.prepare('SELECT data FROM responses WHERE form_id = ? ORDER BY ts').bind(row.id).all();
  const rs = [];
  (q.results || []).forEach((x) => { try { rs.push(JSON.parse(x.data)); } catch { /* abaikan */ } });
  const sup = new Set(rs.filter((r) => r.rep).map((r) => r.rep));
  const st = {};
  rs.filter((r) => r && r.m && !sup.has(r.id) && (FM_DATE.test(r.tg || '') ? r.tg : a.tanggal) === tg)
    .sort((x, y) => (x.ts || 0) - (y.ts || 0))
    .forEach((r) => Object.keys(r.m).forEach((k) => { st[k] = r.m[k]; }));
  const ov = (data.ovr || {})[tg] || {};
  Object.keys(ov).forEach((k) => { if (FM_STATUS[ov[k]]) st[k] = ov[k]; });

  const peserta = Array.isArray(a.peserta) ? a.peserta : [];
  const kelMap = {};
  const sum = { total: peserta.length, hadir: 0, izin: 0, alpa: 0, belum: 0 };
  peserta.forEach((p) => {
    const k = p.k || '-';
    const o = kelMap[k] || (kelMap[k] = { nama: k, total: 0, hadir: 0, izin: 0, alpa: 0, belum: 0 });
    o.total++;
    const s = st[fmKey(p.n, p.k)];
    const f = s === 'H' ? 'hadir' : s === 'I' ? 'izin' : s === 'A' ? 'alpa' : 'belum';
    o[f]++; sum[f]++;
  });
  sum.percentage = sum.total ? Math.round((sum.hadir / sum.total) * 1000) / 10 : null;
  return {
    id: row.id, title: row.title || data.title || 'Absensi', jenis: a.jenis || '', tanggal: tg,
    summary: sum, kelompok: Object.values(kelMap), ai: data.aiConclusion || '',
  };
}
async function handlePublicReport(env, id, url) {
  const f = await getSharedForm(env, id);
  if (!f) return err('Laporan publik belum aktif.', 404);
  return json(await buildReport(env, f, url.searchParams.get('tg') || ''));
}

/* --------------------------------------------------------- update-links */
const SLUG = /^[a-z0-9][a-z0-9-]{0,78}$/;
async function handleUpdateLinks(request, env, path) {
  if (path === '/api/update-links/disable' && request.method === 'POST') {
    await requireAuth(request, env);
    const b = await readJson(request);
    const r = await env.DB.prepare('DELETE FROM update_links WHERE p = ?').bind(String(b.p || '')).run();
    return json({ ok: true, disabled: (r.meta && r.meta.changes) || 0 });
  }
  if (path === '/api/update-links' && request.method === 'POST') {
    await requireAuth(request, env);
    const b = await readJson(request);
    const p = String(b.p || '').slice(0, 60);
    if (!p || !b.payload) return err('Data tautan tidak lengkap.');
    let token = String(b.slug || '').toLowerCase();
    if (!SLUG.test(token)) token = 't' + randHex(5);
    const payload = JSON.stringify(b.payload);
    if (payload.length > 1800000) return err('Data terlalu besar untuk satu tautan.', 413);
    await env.DB.prepare(
      'INSERT INTO update_links (token, p, slug, payload, created_at) VALUES (?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET p=excluded.p, slug=excluded.slug, payload=excluded.payload, created_at=excluded.created_at'
    ).bind(token, p, token, payload, now()).run();
    return json({ ok: true, token });
  }
  const m = /^\/api\/public\/update-links\/([^/]+)$/.exec(path);
  if (m && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT payload FROM update_links WHERE token = ?').bind(decodeURIComponent(m[1])).first();
    if (!row) return err('Link tidak aktif', 404);
    return json({ payload: JSON.parse(row.payload) });
  }
  return err('Tidak ditemukan.', 404);
}

/* ------------------------------------------------------- link presentasi */
/** Link tetap: /presentasi/<alias> selalu menampilkan presentasi yang terakhir dibuat untuk alias itu. */
const PRES_ALIASES = ['laporankelompok'];
const aliasKey = (a) => 'pres_alias_' + a;
async function handlePresentations(request, env, path) {
  const m = /^\/api\/presentations(?:\/([a-z0-9]{6,20}))?$/.exec(path);
  if (!m) return err('Tidak ditemukan.', 404);
  const s = await requireAuth(request, env);
  if (request.method === 'GET' && !m[1]) {
    const r = await env.DB.prepare('SELECT token, title, created_at FROM presentations ORDER BY created_at DESC LIMIT 50').all();
    const aliases = {};
    for (const a of PRES_ALIASES) { const t = await getSetting(env, aliasKey(a)); if (t) aliases[a] = t; }
    return json({ items: r.results || [], aliases });
  }
  if (request.method === 'POST' && !m[1]) {
    const b = await readJson(request);
    const payload = JSON.stringify(b.payload || {});
    if (payload.length > 1800000) return err('Data presentasi terlalu besar.', 413);
    const title = String(b.title || 'Presentasi').slice(0, 160);
    const token = 'p' + randHex(6);
    await env.DB.prepare('INSERT INTO presentations (token, title, payload, created_by, created_at) VALUES (?,?,?,?,?)')
      .bind(token, title, payload, s.user.id, now()).run();
    const alias = String(b.alias || '');
    if (alias) {
      if (!PRES_ALIASES.includes(alias)) return err('Alias presentasi tidak dikenal.');
      await setSetting(env, aliasKey(alias), token);
    }
    return json({ ok: true, token, alias: alias || undefined });
  }
  if (request.method === 'DELETE' && m[1]) {
    await env.DB.prepare('DELETE FROM presentations WHERE token = ?').bind(m[1]).run();
    for (const a of PRES_ALIASES) if ((await getSetting(env, aliasKey(a))) === m[1]) await setSetting(env, aliasKey(a), '');
    return json({ ok: true });
  }
  return err('Metode tidak didukung.', 405);
}

/* -------------------------------------------------------------- pengaturan/AI */
const getSetting = async (env, k) => { const r = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind(k).first(); return r ? r.v : ''; };
const setSetting = async (env, k, v) => {
  if (!v) return env.DB.prepare('DELETE FROM settings WHERE k = ?').bind(k).run();
  return env.DB.prepare('INSERT INTO settings (k, v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v).run();
};
async function handleSettings(request, env) {
  if (request.method === 'GET') {
    await requireAuth(request, env);
    const key = await getSetting(env, 'gemini_api_key');
    return json({ gemini: { configured: !!key, model: (await getSetting(env, 'gemini_model')) || 'gemini-2.5-flash' } });
  }
  await requireSuper(request, env);
  const b = await readJson(request);
  if ('gemini_api_key' in b) await setSetting(env, 'gemini_api_key', String(b.gemini_api_key || '').trim());
  if (b.gemini_model) {
    const m = String(b.gemini_model).trim();
    if (!/^[a-zA-Z0-9._-]{3,60}$/.test(m)) return err('Nama model tidak valid.');
    await setSetting(env, 'gemini_model', m);
  }
  return json({ ok: true });
}
async function callGemini(env, prompt) {
  const key = await getSetting(env, 'gemini_api_key');
  if (!key) throw new HttpError('API Key Gemini belum disimpan di Pengaturan.', 400);
  const model = (await getSetting(env, 'gemini_model')) || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError((j.error && j.error.message) || 'Gemini menolak permintaan.', 502);
  const text = (((j.candidates || [])[0] || {}).content || {}).parts;
  const out = Array.isArray(text) ? text.map((p) => p.text || '').join('').trim() : '';
  if (!out) throw new HttpError('Gemini tidak mengembalikan teks.', 502);
  return out;
}
async function handleAi(request, env, path) {
  if (path === '/api/ai/test') {
    await requireSuper(request, env);
    await callGemini(env, 'Balas hanya dengan kata: OK');
    return json({ ok: true });
  }
  if (path === '/api/ai/attendance-conclusion') {
    await requireAuth(request, env);
    const b = await readJson(request);
    const row = await env.DB.prepare('SELECT id, type, title, data FROM forms WHERE id = ?').bind(String(b.form_id || '')).first();
    if (!row) return err('Form tidak ditemukan.', 404);
    const rep = await buildReport(env, row, '');
    const lines = rep.kelompok.map((k) => `- ${k.nama}: ${k.total} peserta, hadir ${k.hadir}, izin ${k.izin}, alpa ${k.alpa}, belum mengisi ${k.belum}`).join('\n');
    const text = await callGemini(env,
      `Buatkan kesimpulan singkat (maksimal 4 kalimat, bahasa Indonesia yang sopan dan profesional) untuk laporan kehadiran berikut.\n` +
      `Kegiatan: ${rep.title}\nTanggal: ${rep.tanggal}\nTotal peserta: ${rep.summary.total}, hadir ${rep.summary.hadir}, izin ${rep.summary.izin}, alpa ${rep.summary.alpa}, belum mengisi ${rep.summary.belum}.\nPer kelompok:\n${lines}`);
    const data = JSON.parse(row.data);
    data.aiConclusion = text;
    await env.DB.prepare('UPDATE forms SET data = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(data), now(), row.id).run();
    return json({ ok: true, conclusion: text });
  }
  return err('Tidak ditemukan.', 404);
}

/* ------------------------------------------------------------------ router */
async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  // perlindungan CSRF sederhana: permintaan yang mengubah data harus berasal dari situs ini
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return err('Permintaan ditolak.', 403);
  }

  if (path === '/api/login-hint' && method === 'GET') {
    let def = false;
    try {
      if (!env.ADMIN_PASSWORD) {
        await ensureSeed(env);
        const u = await env.DB.prepare("SELECT must_change FROM users WHERE username = 'admin'").first();
        def = !!(u && u.must_change);
      }
    } catch { /* database belum siap */ }
    return json({ default: def });
  }
  if (path === '/api/login' && method === 'POST') return handleLogin(request, env);
  if (path === '/api/logout' && method === 'POST') return handleLogout(request, env);
  if (path === '/api/me' && (method === 'GET' || method === 'PUT')) return handleMe(request, env);

  /* ----- publik (tanpa login) ----- */
  let m;
  if ((m = /^\/api\/public\/forms\/([^/]+)(?:\/(status|report))?$/.exec(path)) && method === 'GET') {
    const id = decodeURIComponent(m[1]);
    if (m[2] === 'status') return handlePublicStatus(env, id, url);
    if (m[2] === 'report') return handlePublicReport(env, id, url);
    return handlePublicForm(env, id);
  }
  if (path.startsWith('/api/public/update-links/')) return handleUpdateLinks(request, env, path);
  if ((m = /^\/api\/public\/presentations\/([a-z0-9]{6,20})$/.exec(path)) && method === 'GET') {
    const row = await env.DB.prepare('SELECT title, payload FROM presentations WHERE token = ?').bind(m[1]).first();
    if (!row) return err('Presentasi tidak ditemukan atau sudah dimatikan.', 404);
    return json({ title: row.title, payload: JSON.parse(row.payload) });
  }
  if ((m = /^\/api\/public\/presentations\/alias\/([a-z]{3,30})$/.exec(path)) && method === 'GET') {
    if (!PRES_ALIASES.includes(m[1])) return err('Presentasi tidak ditemukan.', 404);
    const t = await getSetting(env, aliasKey(m[1]));
    const row = t ? await env.DB.prepare('SELECT title, payload FROM presentations WHERE token = ?').bind(t).first() : null;
    if (!row) return err('Presentasi belum dibuat. Buat dulu lewat menu Laporan → Buat link presentasi.', 404);
    return json({ title: row.title, payload: JSON.parse(row.payload) });
  }
  if ((m = /^\/api\/forms\/([^/]+)\/responses$/.exec(path)) && method === 'POST') {
    return handleResponsePost(request, env, decodeURIComponent(m[1]));
  }

  /* ----- wajib login ----- */
  if (path === '/api/sync' && method === 'GET') {
    const s = await requireAuth(request, env);
    const [kv, forms, responses] = await Promise.all([kvReadAll(env), formsList(env), responsesByForm(env)]);
    const out = { kv, forms: forms.map((f) => f.data), responses, now: now(), sid: s.sid };
    if (s.user.role === 'super_admin') out.users = await listUsers(env);
    return json(out);
  }
  if (path === '/api/kv' && method === 'PUT') return handleKvPut(request, env, await requireAuth(request, env));
  if (path === '/api/kv/meta' && method === 'GET') { await requireAuth(request, env); return handleKvMeta(env); }
  if (path === '/api/forms' && method === 'GET') {
    await requireAuth(request, env);
    return json({ forms: await formsList(env) });
  }
  if (path === '/api/forms/sync' && method === 'POST') { await requireAuth(request, env); return handleFormsSync(request, env); }
  if (path === '/api/responses/since' && method === 'GET') {
    await requireAuth(request, env);
    const since = Number(url.searchParams.get('ts')) || 0;
    const r = await env.DB.prepare('SELECT form_id, data FROM responses WHERE st > ? ORDER BY st LIMIT 2000').bind(since).all();
    const items = [];
    (r.results || []).forEach((x) => { try { items.push({ form_id: x.form_id, resp: JSON.parse(x.data) }); } catch { /* abaikan */ } });
    return json({ items, now: now() });
  }
  if ((m = /^\/api\/forms\/([^/]+)$/.exec(path)) && method === 'DELETE') {
    await requireAuth(request, env);
    return handleFormDelete(env, decodeURIComponent(m[1]));
  }
  if ((m = /^\/api\/forms\/([^/]+)\/responses(?:\/([^/]+))?$/.exec(path)) && method === 'DELETE') {
    await requireAuth(request, env);
    return handleResponseDelete(env, decodeURIComponent(m[1]), m[2] ? decodeURIComponent(m[2]) : '');
  }
  if (path.startsWith('/api/update-links')) return handleUpdateLinks(request, env, path);
  if (path.startsWith('/api/presentations')) return handlePresentations(request, env, path);
  if (path === '/api/settings' && (method === 'GET' || method === 'PUT')) return handleSettings(request, env);
  if (path.startsWith('/api/ai/') && method === 'POST') return handleAi(request, env, path);
  if (path.startsWith('/api/users')) return handleUsers(request, env, path);
  return err('Endpoint tidak ditemukan.', 404);
}

/** Halaman yang dilayani dari berkas statis berbeda dari path-nya. */
function pageFor(pathname) {
  if (/^\/f(\/|$)/.test(pathname)) return '/f/';
  if (/^\/u(\/|$)/.test(pathname)) return '/u/';
  if (/^\/r(\/|$)/.test(pathname)) return '/r/';
  if (/^\/p(\/|$)/.test(pathname)) return '/p/';
  if (/^\/presentasi(\/|$)/.test(pathname)) return '/p/';
  if (/^\/(generus|kmm-desa|kmm-kelompok|muballigh)\/update\/?$/.test(pathname)) return '/u/';
  if (/^\/(kelompok|desa|daerah)\/[a-z]+\d{4}\/?$/.test(pathname)) return '/f/';
  if (/^\/desa\/jurnal\/[a-z]+\d{4}\/?$/.test(pathname)) return '/f/';
  if (/^\/musdes\/\d{8}\/?$/.test(pathname)) return '/f/';
  return null;
}
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
};
function withHeaders(res, extra = {}) {
  const r = new Response(res.body, res);
  Object.entries({ ...SECURITY_HEADERS, ...extra }).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (p.startsWith('/api/')) {
        if (!env.DB) return err('Database D1 belum terpasang (binding DB). Periksa wrangler.toml.', 500);
        return withHeaders(await handleApi(request, env, url));
      }

      // /admin hanya untuk yang sudah login
      if (p === '/admin' || p.startsWith('/admin/')) {
        const s = env.DB ? await getSession(request, env) : null;
        if (!s) return Response.redirect(url.origin + '/login/', 302);
        if (p === '/admin') return Response.redirect(url.origin + '/admin/', 301);
        return withHeaders(await env.ASSETS.fetch(request), { 'cache-control': 'private, no-cache' });
      }

      if (p === '/') {
        const s = env.DB ? await getSession(request, env).catch(() => null) : null;
        return Response.redirect(url.origin + (s ? '/admin/' : '/login/'), 302);
      }

      const page = pageFor(p);
      if (page) {
        const res = await env.ASSETS.fetch(new Request(url.origin + page, request));
        return withHeaders(res, { 'cache-control': 'no-cache' });
      }
      return withHeaders(await env.ASSETS.fetch(request));
    } catch (e) {
      if (e instanceof HttpError) return withHeaders(err(e.message, e.status));
      console.error(e);
      return withHeaders(err('Terjadi kesalahan pada server.', 500));
    }
  },
};
