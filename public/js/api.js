/* SIMDEKA — lapisan sinkronisasi ke server (Cloudflare Worker + D1)
 *
 * Aplikasi menyimpan semua data di localStorage. File ini:
 *  1) (halaman admin) mengambil data dari server SEBELUM aplikasi berjalan, lalu mengisinya ke localStorage;
 *  2) memantau perubahan localStorage dan mengirimnya ke server;
 *  3) menyediakan fungsi yang dipanggil aplikasi: simdekaFlush, simdekaPending, simdekaClearCache,
 *     simdekaFormSync, simdekaFormSyncNow, simdekaFormDelete, simdekaResponsePush/Delete/Clear.
 *
 * Halaman publik (/f, /u, /r) hanya memakai bagian pengiriman tanggapan (lihat forms-server.js).
 */
(function () {
  'use strict';
  var W = window;
  var PAGE = W.SIMDEKA_PAGE || 'admin';
  var LS = W.localStorage;
  var FM_KEY = 'simdeka_forms_v1', FM_RESP = 'simdeka_form_resp_v1';
  var SECRETS = ['simdeka_ai_key', 'simdeka_fonnte_v1'];   // kunci AI notulensi + token Fonnte (disinkronkan ke server)
  var SECRET_FLAG = 'sd_secrets_synced_v1';                // bukan awalan simdeka_, jadi tidak ikut terhapus saat keluar

  /* Hash lama di sisi klien (masih dipakai bagian lain aplikasi) */
  W.acHash = function (s) {
    s = String(s); var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };

  /* Kunci yang disinkronkan ke server (sama dengan data yang ikut file cadangan, minus rahasia) */
  var KV_OK = /^(simdeka_|sidesa_)[A-Za-z0-9_.\-]{1,120}$/;
  var KV_BLOCK = /^(simdeka_auth_v1|simdeka_lokal_(user|accounts|su)|simdeka_last_backup|simdeka_dummy_v1|simdeka_file_note|simdeka_form_draft_v1_.*|simdeka_forms_v1|simdeka_form_resp_v1)$/;
  function syncKey(k) { return typeof k === 'string' && KV_OK.test(k) && !KV_BLOCK.test(k); }

  /* ---------------------------------------------------------------- util */
  function jfetch(url, opt) {
    opt = opt || {};
    opt.credentials = 'same-origin';
    if (opt.body && typeof opt.body !== 'string') { opt.body = JSON.stringify(opt.body); }
    if (opt.body) { opt.headers = Object.assign({ 'content-type': 'application/json' }, opt.headers || {}); }
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && PAGE === 'admin') { W.__sdLoggedOut = true; location.replace('/login/'); }
        if (!r.ok) { var e = new Error(j.error || ('Gagal (' + r.status + ')')); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  W.sdFetch = jfetch;
  var rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem, rawClear = Storage.prototype.clear;
  function lsGet(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function lsSetRaw(k, v) { try { rawSet.call(LS, k, v); return true; } catch (e) { return false; } }

  /* ------------------------------------------------- 1) hidrasi (admin) */
  var hydrated = false, mySid = '', bootSrv = 0, pendingSecrets = [];
  var serverUsers = [];
  function hydrateSync() {
    var xhr = new XMLHttpRequest();
    try {
      xhr.open('GET', '/api/sync', false);       // sengaja sinkron: data harus siap sebelum aplikasi dimulai
      xhr.withCredentials = true;
      xhr.send(null);
    } catch (e) { return { ok: false, offline: true }; }
    if (xhr.status === 401) return { ok: false, auth: true };
    if (xhr.status !== 200) return { ok: false, status: xhr.status };
    var d; try { d = JSON.parse(xhr.responseText); } catch (e) { return { ok: false, status: 500 }; }
    return { ok: true, data: d };
  }
  function applyHydration(d) {
    mySid = d.sid || '';
    // 1. kunci data umum: server adalah sumber kebenaran
    var serverKeys = d.kv || {};
    // Kunci AI notulensi & token Fonnte: isi SEKALI di satu perangkat, tersimpan di server, otomatis terisi di semua perangkat.
    // Migrasi sekali: kunci yang dulu hanya ada di perangkat ini diunggah ke server. Setelah itu server jadi sumber
    // kebenaran (kunci yang sudah dihapus dari perangkat lain tidak dihidupkan lagi).
    var secretsMigrated = lsGet(SECRET_FLAG) === '1';
    try {
      for (var i = LS.length - 1; i >= 0; i--) {
        var k = LS.key(i);
        if (syncKey(k) && !(k in serverKeys) && !(SECRETS.indexOf(k) > -1 && !secretsMigrated)) rawRemove.call(LS, k);
      }
    } catch (e) { /* abaikan */ }
    Object.keys(serverKeys).forEach(function (k) { lsSetRaw(k, serverKeys[k]); });
    if (!secretsMigrated) {
      SECRETS.forEach(function (k) { if (!(k in serverKeys) && lsGet(k)) pendingSecrets.push(k); });
      lsSetRaw(SECRET_FLAG, '1');
    }
    // 2. form + tanggapan
    lsSetRaw(FM_KEY, JSON.stringify(d.forms || []));
    lsSetRaw(FM_RESP, JSON.stringify(d.responses || {}));
    snapForms(d.forms || []);
    snapResp(d.responses || {});
    serverUsers = d.users || [];
    W.__sdUsers = serverUsers;
    lastRespPull = d.now || Date.now();
    bootSrv = d.now || 0;
    hydrated = true;
  }

  if (PAGE === 'admin') {
    var h = hydrateSync();
    if (h.ok) applyHydration(h.data);
    else if (h.auth) { location.replace('/login/'); }
    else {
      W.__sdHydrateFail = h;
      // gagal memuat dari server: jangan menimpa server dengan data lokal yang mungkin usang
      W.__sdReadOnly = true;
    }
  }

  /* ----------------------------------------------- 2) kirim perubahan kv */
  var qSet = {}, qDel = {}, kvTimer = null, inflight = 0, applying = false;
  function schedule() { clearTimeout(kvTimer); kvTimer = setTimeout(flushKv, 1200); }
  function flushKv() {
    clearTimeout(kvTimer); kvTimer = null;
    if (W.__sdReadOnly || PAGE !== 'admin') return Promise.resolve();
    var items = [], del = [];
    Object.keys(qSet).forEach(function (k) { var v = lsGet(k); if (v == null) del.push(k); else items.push({ k: k, v: v }); });
    Object.keys(qDel).forEach(function (k) { del.push(k); });
    qSet = {}; qDel = {};
    if (!items.length && !del.length) return Promise.resolve();
    // kirim bertahap agar badan permintaan tidak terlalu besar
    var batches = [], cur = { items: [], del: [] }, size = 0;
    items.forEach(function (it) {
      if (size + it.v.length > 3000000 && cur.items.length) { batches.push(cur); cur = { items: [], del: [] }; size = 0; }
      cur.items.push(it); size += it.v.length;
    });
    cur.del = del; batches.push(cur);
    inflight++;
    var chain = Promise.resolve();
    batches.forEach(function (b) { chain = chain.then(function () { return jfetch('/api/kv', { method: 'PUT', body: b }); }); });
    return chain.then(function () { inflight--; setState('ok'); }, function (e) {
      inflight--;
      items.forEach(function (it) { qSet[it.k] = 1; }); del.forEach(function (k) { qDel[k] = 1; });
      setState('err', e.message); schedule();
    });
  }
  function noteSet(k) {
    if (applying) return;
    if (k === FM_KEY) { W.simdekaFormSync && W.simdekaFormSync(); return; }
    if (k === FM_RESP) { respDiffSoon(); return; }
    if (!syncKey(k)) return;
    delete qDel[k]; qSet[k] = 1; setState('pending'); schedule();
  }
  function noteDel(k) {
    if (applying) return;
    if (k === FM_KEY || k === FM_RESP) { if (k === FM_KEY) W.simdekaFormSync && W.simdekaFormSync(); else respDiffSoon(); return; }
    if (!syncKey(k)) return;
    delete qSet[k]; qDel[k] = 1; setState('pending'); schedule();
  }
  if (PAGE === 'admin') {
    pendingSecrets.forEach(function (k) { qSet[k] = 1; });
    if (pendingSecrets.length) setTimeout(schedule, 800);
    Storage.prototype.setItem = function (k, v) {
      rawSet.call(this, k, v);
      if (this === LS) noteSet(String(k));
    };
    Storage.prototype.removeItem = function (k) {
      rawRemove.call(this, k);
      if (this === LS) noteDel(String(k));
    };
    Storage.prototype.clear = function () {
      var keys = [];
      if (this === LS) { try { for (var i = 0; i < LS.length; i++) keys.push(LS.key(i)); } catch (e) { /* abaikan */ } }
      rawClear.call(this);
      keys.forEach(noteDel);
    };
  }

  /* -------------------------------------------------- indikator status */
  var stateEl = null;
  function setState(s, msg) {
    W.__sdState = s;
    if (PAGE !== 'admin') return;
    if (!stateEl && document.body) {
      stateEl = document.createElement('div');
      stateEl.id = 'sdSyncState';
      stateEl.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:79;font:600 11px/1 system-ui,sans-serif;padding:6px 10px;border-radius:999px;background:#0f172a;color:#fff;opacity:0;transition:opacity .25s;pointer-events:none;max-width:70vw';
      document.body.appendChild(stateEl);
    }
    if (!stateEl) return;
    if (s === 'pending') { stateEl.textContent = 'Menyimpan ke server…'; stateEl.style.background = '#0f172a'; stateEl.style.opacity = '.85'; }
    else if (s === 'ok') { stateEl.textContent = 'Tersimpan di server'; stateEl.style.background = '#047857'; stateEl.style.opacity = '.9'; setTimeout(function () { if (W.__sdState === 'ok' && stateEl) stateEl.style.opacity = '0'; }, 1600); }
    else if (s === 'err') { stateEl.textContent = 'Gagal menyimpan: ' + (msg || 'periksa koneksi') + ' — mencoba lagi'; stateEl.style.background = '#b91c1c'; stateEl.style.opacity = '.95'; }
  }

  /* ---------------------------------------------------------- 3) form */
  var formSnap = {}, formTimer = null, formBusy = null;
  function fmHash(f) { try { return JSON.stringify(f); } catch (e) { return ''; } }
  function snapForms(list) { formSnap = {}; (list || []).forEach(function (f) { if (f && f.id) formSnap[f.id] = fmHash(f); }); }
  function readForms() { try { var a = JSON.parse(lsGet(FM_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (f) { return f && f.id; }) : []; } catch (e) { return []; } }
  function payloadOf(f) {
    try { if (typeof W.fmPayload === 'function') return W.fmPayload(f); } catch (e) { /* abaikan */ }
    return {};
  }
  function formSyncNow() {
    clearTimeout(formTimer); formTimer = null;
    if (W.__sdReadOnly || PAGE !== 'admin') return Promise.resolve();
    var list = readForms(), changed = [], present = {};
    list.forEach(function (f) {
      present[f.id] = 1;
      var hs = fmHash(f);
      if (formSnap[f.id] !== hs) changed.push({ f: f, h: hs });
    });
    var gone = Object.keys(formSnap).filter(function (id) { return !present[id]; });
    if (!changed.length && !gone.length) return formBusy || Promise.resolve();
    setState('pending');
    var run = function () {
      var p = Promise.resolve();
      if (changed.length) {
        var body = { forms: changed.map(function (c) { return { id: c.f.id, type: c.f.type, title: c.f.title || '', shared: !!c.f.shared, data: c.f, payload: payloadOf(c.f) }; }) };
        p = p.then(function () { return jfetch('/api/forms/sync', { method: 'POST', body: body }); }).then(function () { changed.forEach(function (c) { formSnap[c.f.id] = c.h; }); });
      }
      gone.forEach(function (id) {
        p = p.then(function () { return jfetch('/api/forms/' + encodeURIComponent(id), { method: 'DELETE' }); }).then(function () { delete formSnap[id]; });
      });
      return p.then(function () { setState('ok'); }, function (e) { setState('err', e.message); throw e; });
    };
    formBusy = (formBusy || Promise.resolve()).catch(function () {}).then(run);
    return formBusy;
  }
  W.simdekaFormSync = function () { if (PAGE !== 'admin') return; clearTimeout(formTimer); setState('pending'); formTimer = setTimeout(function () { formSyncNow().catch(function () { formTimer = setTimeout(W.simdekaFormSync, 4000); }); }, 700); };
  W.simdekaFormSyncNow = formSyncNow;
  W.simdekaFormDelete = function (id) {
    if (PAGE !== 'admin') return Promise.resolve();
    return formSyncNow().catch(function () {});   // form sudah dihapus dari localStorage → ikut terhapus di server
  };

  /* -------------------------------------------------------- tanggapan */
  var respSnap = {}, respTimer = null, lastRespPull = 0;
  function readResp() { try { var o = JSON.parse(lsGet(FM_RESP) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function snapResp(all) { respSnap = {}; Object.keys(all || {}).forEach(function (fid) { (all[fid] || []).forEach(function (r) { if (r && r.id) respSnap[fid + '|' + r.id] = String(r.ts || 0) + ':' + (r.rep || ''); }); }); }
  function postResp(fid, list) {
    return jfetch('/api/forms/' + encodeURIComponent(fid) + '/responses', { method: 'POST', body: list.length === 1 ? { resp: list[0] } : { list: list } })
      .then(function () { list.forEach(function (r) { respSnap[fid + '|' + r.id] = String(r.ts || 0) + ':' + (r.rep || ''); }); });
  }
  /* Kotak keluar untuk pengisi publik: tanggapan yang gagal terkirim (sinyal buruk) dicoba lagi otomatis */
  var OUTBOX = 'sd_outbox_v1', outBusy = false;
  function outGet() { try { return JSON.parse(lsGet(OUTBOX) || '[]'); } catch (e) { return []; } }
  function outPut(a) { try { rawSet.call(LS, OUTBOX, JSON.stringify(a)); } catch (e) { /* abaikan */ } }
  function outAdd(fid, r) { var a = outGet().filter(function (x) { return !(x.fid === fid && x.r && x.r.id === r.id); }); a.push({ fid: fid, r: r }); outPut(a); }
  function outFlush() {
    if (PAGE === 'admin' || outBusy) return;
    var a = outGet(); if (!a.length) return;
    outBusy = true; var rest = [], p = Promise.resolve();
    a.forEach(function (it) {
      p = p.then(function () { return jfetch('/api/forms/' + encodeURIComponent(it.fid) + '/responses', { method: 'POST', body: { resp: it.r } }); })
        .catch(function (e) { if (!(e && e.status >= 400 && e.status < 500)) rest.push(it); });
    });
    p.then(function () { outPut(rest); outBusy = false; });
  }
  setInterval(outFlush, 15000); addEventListener('online', outFlush); setTimeout(outFlush, 1500);

  W.simdekaResponsePush = function (fid, r) {
    if (!fid || !r) return Promise.resolve();
    var pre = PAGE === 'admin' ? formSyncNow().catch(function () {}) : Promise.resolve();   // form harus sudah ada di server
    return pre.then(function () { return postResp(fid, [r]); }).catch(function (e) {
      if (PAGE === 'admin') setState('err', e.message); else if (!(e && e.status >= 400 && e.status < 500)) outAdd(fid, r);
    });
  };
  W.simdekaResponseDelete = function (fid, rid) {
    delete respSnap[fid + '|' + rid];
    return jfetch('/api/forms/' + encodeURIComponent(fid) + '/responses/' + encodeURIComponent(rid), { method: 'DELETE' }).catch(function () {});
  };
  W.simdekaResponseClear = function (fid) {
    Object.keys(respSnap).forEach(function (k) { if (k.indexOf(fid + '|') === 0) delete respSnap[k]; });
    return jfetch('/api/forms/' + encodeURIComponent(fid) + '/responses', { method: 'DELETE' }).catch(function () {});
  };
  function respDiffSoon() { if (PAGE !== 'admin' || applying) return; clearTimeout(respTimer); respTimer = setTimeout(respDiff, 900); }
  function respDiff() {
    if (W.__sdReadOnly) return;
    var all = readResp(), jobs = [], seen = {};
    Object.keys(all).forEach(function (fid) {
      var add = [];
      (all[fid] || []).forEach(function (r) {
        if (!r || !r.id) return; var key = fid + '|' + r.id; seen[key] = 1;
        if (respSnap[key] !== String(r.ts || 0) + ':' + (r.rep || '')) add.push(r);
      });
      for (var i = 0; i < add.length; i += 100) jobs.push(postResp(fid, add.slice(i, i + 100)));
    });
    Object.keys(respSnap).forEach(function (key) {
      if (seen[key]) return; var p = key.split('|');
      delete respSnap[key];
      jobs.push(jfetch('/api/forms/' + encodeURIComponent(p[0]) + '/responses/' + encodeURIComponent(p[1]), { method: 'DELETE' }).catch(function () {}));
    });
    if (jobs.length) { setState('pending'); Promise.all(jobs).then(function () { setState('ok'); }, function (e) { setState('err', e.message); }); }
  }

  /* Tarik tanggapan baru dari pengisi publik (admin) */
  function pullResponses() {
    if (PAGE !== 'admin' || document.hidden || W.__sdReadOnly) return;
    jfetch('/api/responses/since?ts=' + encodeURIComponent(lastRespPull - 2000)).then(function (j) {
      lastRespPull = j.now || Date.now();
      if (!j.items || !j.items.length) return;
      var all = readResp(), added = 0;
      j.items.forEach(function (it) {
        var l = all[it.form_id] || (all[it.form_id] = []), r = it.resp;
        var ix = -1; for (var i = 0; i < l.length; i++) { if (l[i].id === r.id) { ix = i; break; } }
        if (ix < 0) { l.push(r); added++; } else if (String(l[ix].ts) !== String(r.ts)) { l[ix] = r; added++; }
        respSnap[it.form_id + '|' + r.id] = String(r.ts || 0) + ':' + (r.rep || '');
      });
      if (!added) return;
      applying = true; lsSetRaw(FM_RESP, JSON.stringify(all)); applying = false;
      try {
        var c = typeof W.fmCur === 'function' ? W.fmCur() : null;
        if (c && W.fmEl && W.fmEl('fmBody') && typeof W.fmRenderEditor === 'function') W.fmRenderEditor();
        if (typeof W.showToast === 'function') W.showToast(added + ' tanggapan baru masuk');
      } catch (e) { /* abaikan */ }
    }).catch(function () {});
  }
  if (PAGE === 'admin') setInterval(pullResponses, 20000);

  /* Beri tahu jika ada perubahan dari perangkat/akun lain */
  var metaT = 0;
  function checkOthers() {
    if (PAGE !== 'admin' || document.hidden || W.__sdReadOnly || Date.now() - metaT < 45000) return;
    metaT = Date.now();
    jfetch('/api/kv/meta').then(function (j) {
      var changed = Object.keys(j.keys || {}).filter(function (k) { var m = j.keys[k]; return m.by && m.by !== mySid && m.t > bootSrv && !qSet[k]; });
      if (changed.length && !W.__sdWarned) {
        W.__sdWarned = true;
        if (typeof W.showToast === 'function') W.showToast('Ada data baru dari perangkat/akun lain. Muat ulang halaman untuk melihatnya.');
      }
    }).catch(function () {});
  }
  if (PAGE === 'admin' && W.__sdReadOnly) {
    addEventListener('DOMContentLoaded', function () {
      var b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:200;background:#b91c1c;color:#fff;font:600 13px/1.4 system-ui,sans-serif;padding:10px 14px;text-align:center';
      b.textContent = 'Gagal memuat data dari server. Perubahan TIDAK akan disimpan. Muat ulang halaman setelah koneksi pulih.';
      document.body.appendChild(b);
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { pullResponses(); checkOthers(); } });
  if (PAGE === 'admin') setInterval(checkOthers, 60000);

  /* ------------------------------------------------- fungsi untuk aplikasi */
  W.simdekaPending = function () {
    return !!(kvTimer || Object.keys(qSet).length || Object.keys(qDel).length || inflight || formTimer || respTimer);
  };
  W.simdekaFlush = function () {
    if (PAGE !== 'admin') return Promise.resolve();
    clearTimeout(respTimer); if (respTimer) { respTimer = null; respDiff(); }
    return Promise.all([flushKv(), formSyncNow().catch(function () {})]).then(function () {});
  };
  W.simdekaClearCache = function () {
    // dipanggil saat keluar: hapus salinan data di perangkat ini
    applying = true;
    try {
      for (var i = LS.length - 1; i >= 0; i--) { var k = LS.key(i); if (k && /^(simdeka_|sidesa_)/.test(k)) rawRemove.call(LS, k); }
    } catch (e) { /* abaikan */ }
    applying = false;
  };
  W.simdekaLogoutRedirect = function () { location.replace('/login/'); };
  addEventListener('beforeunload', function (e) { if (PAGE === 'admin' && W.simdekaPending() && !W.__sdLoggedOut) { e.preventDefault(); e.returnValue = ''; } });
  addEventListener('pagehide', function () { if (PAGE === 'admin') { try { flushKv(); } catch (x) { /* abaikan */ } } });
})();
