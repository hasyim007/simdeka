-- SIMDEKA — skema database Cloudflare D1
-- Jalankan sekali di Dashboard: Storage & Databases → D1 → (database Anda) → Console → tempel → Execute

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'admin_desa',   -- super_admin | admin_desa
  peran       TEXT NOT NULL DEFAULT '',
  akses       TEXT NOT NULL DEFAULT '{}',           -- JSON: {menu: 'tidak'|'lihat'|'edit'}
  pass_hash   TEXT NOT NULL,
  pass_salt   TEXT NOT NULL,
  aktif       INTEGER NOT NULL DEFAULT 1,
  must_change INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Data aplikasi (pengganti localStorage). Nilai besar dipecah per bagian.
CREATE TABLE IF NOT EXISTS kv (
  k          TEXT NOT NULL,
  part       INTEGER NOT NULL DEFAULT 0,
  parts      INTEGER NOT NULL DEFAULT 1,
  v          TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (k, part)
);

CREATE TABLE IF NOT EXISTS forms (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL DEFAULT 'custom',
  title      TEXT NOT NULL DEFAULT '',
  shared     INTEGER NOT NULL DEFAULT 0,
  data       TEXT NOT NULL,       -- objek form lengkap (JSON)
  payload    TEXT NOT NULL,       -- versi ringkas untuk halaman publik (JSON)
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
  form_id TEXT NOT NULL,
  id      TEXT NOT NULL,
  tg      TEXT NOT NULL DEFAULT '',
  rep     TEXT NOT NULL DEFAULT '',
  ts      INTEGER NOT NULL DEFAULT 0,   -- waktu dari perangkat pengisi
  st      INTEGER NOT NULL DEFAULT 0,   -- waktu diterima server
  data    TEXT NOT NULL,
  PRIMARY KEY (form_id, id)
);
CREATE INDEX IF NOT EXISTS idx_responses_form_ts ON responses(form_id, ts);
CREATE INDEX IF NOT EXISTS idx_responses_st ON responses(st);

CREATE TABLE IF NOT EXISTS update_links (
  token      TEXT PRIMARY KEY,
  p          TEXT NOT NULL,
  slug       TEXT NOT NULL DEFAULT '',
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_update_links_p ON update_links(p);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(ip, ts);

-- Link presentasi laporan (salinan data saat link dibuat)
CREATE TABLE IF NOT EXISTS presentations (
  token      TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  payload    TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
